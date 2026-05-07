import {
  ATTRS,
  ATTR_LABELS,
  createInitialState,
  startWeek,
  executePlan,
  dateLabel,
  nextContest,
  teamStats,
  activeStudents,
  grade,
  attrLabel,
  serializeForAi,
  addLog,
  applyAiEvent,
  addAiEventPlan,
} from "./gameEngine.js";

const ATTR_HELP = {
  theory: "理论：笔试、推导和天体物理基础，主要影响理论类赛事表现。",
  observe: "观测：星图识别、望远镜操作和夜空定位，受天气影响较大。",
  practice: "实测：数据处理、误差分析和工具使用，设备越好越稳定。",
  culture: "常识：天文背景知识和现场判断，能补足综合题与临场发挥。",
};

const STAT_HELP = {
  dateLabel: "当前游戏日期。每执行一次本周安排，时间推进一周。",
  money: "社团资金。训练、设备和活动会消耗资金，赞助和经费会补充资金。",
  weather: "本周天气。观测类活动最受天气影响。",
  nextContest: "距离下一场关键赛事的时间。",
  equipment: "设备状态。影响观测、实测稳定性，也会降低部分事故概率。",
  morale: "队伍士气。士气高时训练更顺，士气低时收益会下降。",
  activeCount: "仍在社团里的学生人数。",
  avgStress: "在社学生平均压力。压力过高可能导致退社。",
};

let state = createInitialState(6);
startWeek(state);

const els = {};

function $(selector) {
  return document.querySelector(selector);
}

function init() {
  for (const id of [
    "dateLabel",
    "money",
    "weather",
    "nextContest",
    "equipment",
    "morale",
    "activeCount",
    "avgStress",
    "studentGrid",
    "planList",
    "logList",
    "contestPanel",
    "aiToggle",
    "aiStatus",
    "newGame",
    "advance",
    "studentCount",
    "toast",
    "teamBars",
    "ending",
    "settingsButton",
    "settingsDialog",
    "apiToken",
    "apiBaseUrl",
    "apiModel",
    "refreshModels",
    "modelStatus",
    "wireApi",
    "aiMode",
    "saveSettings",
  ]) {
    els[id] = $(`#${id}`);
  }

  loadSettings();

  els.aiToggle.addEventListener("change", async () => {
    state.aiEnabled = els.aiToggle.checked;
    if (state.aiEnabled) {
      await requestAiReaction("玩家开启了实时 AI 反应。");
    } else {
      state.aiLines = [];
      state.availablePlans = state.availablePlans.filter((plan) => !plan.aiEvent);
    }
    render();
  });

  els.newGame.addEventListener("click", () => {
    const count = Number(els.studentCount.value) || 6;
    const settings = state.aiSettings;
    const aiEnabled = state.aiEnabled;
    state = createInitialState(count);
    state.aiSettings = settings;
    state.aiEnabled = aiEnabled;
    startWeek(state);
    render();
  });

  els.settingsButton.addEventListener("click", async () => {
    syncSettingsInputs();
    els.settingsDialog.showModal();
    if (els.apiToken.value.trim()) {
      await refreshModels({ silent: true });
    }
  });

  els.refreshModels.addEventListener("click", async () => {
    await refreshModels();
  });

  els.saveSettings.addEventListener("click", () => {
    state.aiSettings = {
      token: els.apiToken.value.trim(),
      baseUrl: els.apiBaseUrl.value.trim(),
      model: els.apiModel.value || "gpt-5.4",
      wireApi: els.wireApi.value,
      mode: els.aiMode.value,
    };
    saveSettings();
    showToast("API 设置已保存。");
    render();
  });

  els.advance.addEventListener("click", async () => {
    if (state.gameOver || state.aiBusy) return;
    const selected = state.selectedPlanId || state.availablePlans[0]?.id;
    const selectedPlan = state.availablePlans.find((plan) => plan.id === selected);
    const result = executePlan(state, selected);
    if (!result.ok) showToast(result.reason);
    render();
    if (result.ok && state.aiEnabled && !state.gameOver) {
      const planName = selectedPlan?.name || selected || "本周安排";
      await requestAiReaction(`玩家刚执行了“${planName}”，游戏已经进入新一周。只吐槽刚才的局势；如果生成 optional 事件，它会作为新一周的可选行动。`);
    }
  });

  render();
}

function render() {
  const stats = teamStats(state);
  const contest = nextContest(state);
  renderDashboardLabels();
  els.dateLabel.textContent = dateLabel(state);
  els.money.textContent = `💰 ${state.money} 元`;
  els.weather.textContent = `${state.weather.emoji || ""} ${state.weather.name}`.trim();
  els.nextContest.textContent = contest ? `🏆 ${contest.name} / ${contest.weeks === 0 ? "本周" : `${contest.weeks} 周`}` : "🏁 无";
  els.equipment.textContent = `🔭 ${Math.round(state.equipment)}/100`;
  els.morale.textContent = `${moraleEmoji(state.morale)} ${Math.round(state.morale)}/100`;
  els.activeCount.textContent = `👥 ${stats.activeCount}/${state.students.length}`;
  els.avgStress.textContent = `${stressEmoji(stats.avgStress)} ${Math.round(stats.avgStress)}/100`;
  els.aiToggle.checked = state.aiEnabled;
  els.aiStatus.textContent = state.aiEnabled ? (state.aiBusy ? "等待中" : "已开启") : "关闭";

  renderTeamBars(stats);
  renderStudents();
  renderPlans();
  renderLogs();
  renderContest();
  renderEnding();
}

function renderTeamBars(stats) {
  els.teamBars.innerHTML = ATTRS.map((attr) => {
    const value = Math.round(stats.attrs[attr] || 0);
    return `
      <div class="team-bar">
        <span>${ATTR_LABELS[attr]}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${value}%"></div></div>
        <strong>${value}</strong>
      </div>
    `;
  }).join("");
}

function renderStudents() {
  const sorted = [...state.students].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return avgAttrs(b) - avgAttrs(a);
  });

  els.studentGrid.innerHTML = sorted
    .map((student) => {
      const active = student.status === "active";
      const traits = student.traits.map((trait) => `
        <span class="trait-chip">
          ${escapeHtml(trait.name)}
          <button class="trait-help" type="button" title="${escapeHtml(trait.desc)}" aria-label="${escapeHtml(trait.name)}：${escapeHtml(trait.desc)}">
            ?
            <em>${escapeHtml(trait.desc)}</em>
          </button>
        </span>
      `).join("");
      const honors = student.honors.map((honor) => `<b>${honor}</b>`).join("");
      const attrRows = ATTRS.map((attr) => {
        const value = Math.round(student.attrs[attr]);
        return `
          <div class="attr-row">
            <span>
              ${attrLabel(attr)}
              ${helpButton(attrLabel(attr), ATTR_HELP[attr])}
            </span>
            <meter min="0" max="100" value="${value}"></meter>
            <em>${grade(value)}</em>
          </div>
        `;
      }).join("");
      return `
        <article class="student ${active ? "" : "is-quit"}">
          <header>
            <div>
              <h3>${student.name}</h3>
              <p>${active ? "在社" : "退社"} ${honors}</p>
            </div>
            <strong class="${stressClass(student.stress)}" title="压力值">
              <span>${stressEmoji(student.stress)} 压力</span>
              ${Math.round(student.stress)}
            </strong>
          </header>
          <div class="attrs">${attrRows}</div>
          <footer>${traits || "<span class=\"trait-chip\">无特殊特性</span>"}</footer>
        </article>
      `;
    })
    .join("");
}

function renderPlans() {
  const blocked = Boolean(state.aiBusy);
  els.planList.innerHTML = state.availablePlans
    .map((plan) => {
      const selected = state.selectedPlanId === plan.id;
      const gainText = Object.entries(plan.gains || {})
        .map(([attr, value]) => `${attrLabel(attr)} ${value > 0 ? "+" : ""}${value}`)
        .join(" / ") || "无属性收益";
      const effectText = formatPlanEffects(plan);
      return `
        <button class="plan ${selected ? "is-selected" : ""}" data-plan="${plan.id}" type="button" ${blocked ? "disabled" : ""}>
          <span class="plan-type">${plan.type}</span>
          <strong>${plan.name}</strong>
          <small>${plan.desc}</small>
          <span class="plan-meta">
            <b>${plan.cost ? `${plan.cost} 元` : "免费"}</b>
            <b class="${plan.stress > 7 ? "warn" : plan.stress < 0 ? "good" : ""}">压力 ${plan.stress > 0 ? "+" : ""}${plan.stress}</b>
          </span>
          <span class="plan-gain">${effectText || gainText}</span>
        </button>
      `;
    })
    .join("");

  els.planList.querySelectorAll("[data-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.aiBusy) return;
      state.selectedPlanId = button.dataset.plan;
      renderPlans();
    });
  });
}

function renderLogs() {
  const aiPendingItems = [];
  if (state.aiBusy) {
    aiPendingItems.push(`
      <li class="neutral ai-log">
        <span>AI</span>
        <p>正在等 AI 锐评，本回合暂时不能继续推进。</p>
      </li>
    `);
  }
  els.logList.innerHTML = [
    ...aiPendingItems,
    ...state.logs
    .map((log) => `
      <li class="${log.tone}">
        <span>${log.type}</span>
        <p>${log.text}</p>
      </li>
    `),
  ].join("");
}

function renderContest() {
  if (!state.contestResults) {
    els.contestPanel.innerHTML = `<p class="empty">本周暂无比赛结果。</p>`;
    return;
  }
  const { contest, scored } = state.contestResults;
  els.contestPanel.innerHTML = `
    <h3>${contest.name}</h3>
    <div class="score-list">
      ${scored.map((item) => `
        <div class="score-row ${item.passed ? "passed" : ""}">
          <span>${item.name}</span>
          <meter min="0" max="100" value="${item.score.toFixed(1)}"></meter>
          <strong>${item.score.toFixed(1)}</strong>
          <em>${item.passed ? "晋级" : "淘汰"}</em>
        </div>
      `).join("")}
    </div>
  `;
}

function renderEnding() {
  if (!state.gameOver) {
    els.ending.hidden = true;
    els.advance.disabled = Boolean(state.aiBusy);
    els.advance.textContent = state.aiBusy ? "等待 AI 反应..." : "执行并推进一周";
    return;
  }

  els.ending.hidden = false;
  els.advance.disabled = true;
  els.advance.textContent = "游戏已结束";
  els.ending.className = state.victory ? "ending victory" : "ending defeat";
  els.ending.innerHTML = `
    <strong>${state.victory ? "胜利" : "结束"}</strong>
    <p>${state.victory ? "你培养出了 IOAA 选手。" : "这条时间线没能抵达 IOAA 奖牌。"}</p>
  `;
}

async function requestAiReaction(trigger) {
  state.aiBusy = true;
  render();
  try {
    const response = await fetch("/api/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger, state: serializeForAi(state), config: state.aiSettings }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "AI 服务不可用。" }));
      throw new Error(error.error || "AI 服务不可用。");
    }
    const payload = await response.json();
    state.aiLines = Array.isArray(payload.lines) ? payload.lines.filter(Boolean) : [];
    if (!state.aiLines.length) {
      throw new Error(payload.error || "AI 没有返回有效内容。");
    }
    for (const line of state.aiLines) {
      addLog(state, "AI锐评", line, "neutral");
    }
    const event = normalizeClientAiEvent(payload.event);
    if (event) {
      if (event.kind === "passive") {
        const result = applyAiEvent(state, event);
        if (!result.ok) showToast(result.reason);
      } else {
        addAiEventPlan(state, event);
      }
    }
  } catch (error) {
    state.aiEnabled = false;
    els.aiToggle.checked = false;
    state.aiLines = [];
    showToast(error.message);
    addLog(state, "AI", `AI 反应关闭：${error.message}`, "warn");
  } finally {
    state.aiBusy = false;
    render();
  }
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("astroChaosApiSettings") || "{}");
    state.aiSettings = {
      token: saved.token || "",
      baseUrl: saved.baseUrl || "",
      model: saved.model || "gpt-5.4",
      wireApi: saved.wireApi || "responses",
      mode: saved.mode || "events",
    };
  } catch {
    state.aiSettings = { token: "", baseUrl: "", model: "gpt-5.4", wireApi: "responses", mode: "events" };
  }
}

function saveSettings() {
  localStorage.setItem("astroChaosApiSettings", JSON.stringify(state.aiSettings));
}

function syncSettingsInputs() {
  els.apiToken.value = state.aiSettings.token || "";
  els.apiBaseUrl.value = state.aiSettings.baseUrl || "";
  setModelOptions([{ id: state.aiSettings.model || "gpt-5.4", name: state.aiSettings.model || "gpt-5.4" }], state.aiSettings.model);
  els.wireApi.value = state.aiSettings.wireApi || "responses";
  els.aiMode.value = state.aiSettings.mode || "events";
  els.modelStatus.textContent = "填写 Token；Base URL 可为空，仅自定义网关时填写。";
}

async function refreshModels({ silent = false } = {}) {
  if (!silent) {
    els.refreshModels.disabled = true;
    els.modelStatus.textContent = "正在从服务器获取模型列表...";
  }
  try {
    const currentModel = els.apiModel.value || state.aiSettings.model || "gpt-5.4";
    const response = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          token: els.apiToken.value.trim(),
          baseUrl: els.apiBaseUrl.value.trim(),
          model: currentModel,
        },
      }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "模型列表获取失败。" }));
      throw new Error(error.error || "模型列表获取失败。");
    }
    const payload = await response.json();
    const models = Array.isArray(payload.models) ? payload.models : [];
    setModelOptions(models, payload.selected || currentModel);
    els.modelStatus.textContent = `已获取 ${models.length} 个模型。`;
  } catch (error) {
    if (!silent) showToast(error.message);
    els.modelStatus.textContent = error.message;
  } finally {
    els.refreshModels.disabled = false;
  }
}

function setModelOptions(models, selected) {
  const normalized = models
    .map((model) => {
      if (typeof model === "string") return { id: model, name: model };
      return { id: String(model.id || "").trim(), name: String(model.name || model.id || "").trim() };
    })
    .filter((model) => model.id);
  const current = selected || normalized[0]?.id || "gpt-5.4";
  if (!normalized.some((model) => model.id === current)) {
    normalized.unshift({ id: current, name: current });
  }
  els.apiModel.innerHTML = normalized
    .map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.name || model.id)}</option>`)
    .join("");
  els.apiModel.value = current;
}

function formatEffects(effects = {}) {
  const parts = [];
  const attrs = effects.attrs || {};
  for (const [attr, value] of Object.entries(attrs)) {
    if (Number(value)) parts.push(`${attrLabel(attr)} ${value > 0 ? "+" : ""}${value}`);
  }
  for (const key of ["stress", "money", "morale", "equipment"]) {
    const value = Number(effects[key] || 0);
    if (!value) continue;
    const label = { stress: "压力", money: "资金", morale: "士气", equipment: "设备" }[key];
    parts.push(`${label} ${value > 0 ? "+" : ""}${value}`);
  }
  return parts.length ? parts.join(" / ") : "无直接数值变化";
}

function formatPlanEffects(plan) {
  const parts = [];
  const gainText = Object.entries(plan.gains || {})
    .map(([attr, value]) => `${attrLabel(attr)} ${value > 0 ? "+" : ""}${value}`)
    .join(" / ");
  if (gainText) parts.push(gainText);
  if (Number(plan.money)) parts.push(`资金 ${plan.money > 0 ? "+" : ""}${plan.money}`);
  if (Number(plan.morale)) parts.push(`士气 ${plan.morale > 0 ? "+" : ""}${plan.morale}`);
  if (Number(plan.equipment)) parts.push(`设备 ${plan.equipment > 0 ? "+" : ""}${plan.equipment}`);
  return parts.join(" / ");
}

function normalizeClientAiEvent(event) {
  if (!event || typeof event !== "object") return null;
  const effects = repairClientEventEffects(event.kind === "passive" ? "passive" : "optional", event.effects || {});
  const title = String(event.title || "AI 事件").slice(0, 18);
  const text = String(event.text || "").slice(0, 90);
  const kind = event.kind === "passive" || looksLikeClientPassiveEvent(title, text) ? "passive" : "optional";
  repairClientEventEffects(kind, effects);
  return {
    kind,
    target: event.target || null,
    title,
    text,
    effects,
  };
}

function looksLikeClientPassiveEvent(title, text) {
  const combined = `${title}${text}`;
  const passiveWords = ["坏", "损坏", "故障", "断电", "丢失", "生病", "受伤", "争执", "事故", "翻出", "捡到"];
  return passiveWords.some((word) => combined.includes(word));
}

function repairClientEventEffects(kind, effects = {}) {
  const attrs = effects.attrs || {};
  effects.attrs = {
    theory: Number(attrs.theory || 0),
    observe: Number(attrs.observe || 0),
    practice: Number(attrs.practice || 0),
    culture: Number(attrs.culture || 0),
  };
  effects.stress = Number(effects.stress || 0);
  effects.money = Number(effects.money || 0);
  effects.morale = Number(effects.morale || 0);
  effects.equipment = Number(effects.equipment || 0);
  if (kind === "optional" && !hasClientEffectBenefit(effects)) {
    effects.attrs.culture = Math.max(effects.attrs.culture, 1);
    effects.stress = Math.max(effects.stress, 1);
  }
  if (kind === "passive") {
    if (!hasClientEffectBenefit(effects)) effects.attrs.culture = Math.max(effects.attrs.culture, 1);
    if (!hasClientEffectPenalty(effects)) effects.stress = Math.max(effects.stress, 1);
  }
  return effects;
}

function hasClientEffectBenefit(effects = {}) {
  const attrs = effects.attrs || {};
  const attrValues = Object.values(attrs);
  return (
    attrValues.some((value) => Number(value) > 0) ||
    Number(effects.money) > 0 ||
    Number(effects.morale) > 0 ||
    Number(effects.equipment) > 0 ||
    Number(effects.stress) < 0
  );
}

function hasClientEffectPenalty(effects = {}) {
  const attrs = effects.attrs || {};
  const attrValues = Object.values(attrs);
  return (
    attrValues.some((value) => Number(value) < 0) ||
    Number(effects.money) < 0 ||
    Number(effects.morale) < 0 ||
    Number(effects.equipment) < 0 ||
    Number(effects.stress) > 0
  );
}

function helpButton(label, text) {
  return `
    <button class="trait-help attr-help" type="button" title="${escapeHtml(text)}" aria-label="${escapeHtml(label)}：${escapeHtml(text)}">
      ?
      <em>${escapeHtml(text)}</em>
    </button>
  `;
}

function renderDashboardLabels() {
  for (const id of ["dateLabel", "money", "weather", "nextContest", "equipment", "morale", "activeCount", "avgStress"]) {
    const label = els[id]?.closest("article")?.querySelector("span");
    if (!label || label.dataset.ready) continue;
    label.innerHTML = `${label.textContent} ${helpButton(label.textContent, STAT_HELP[id])}`;
    label.dataset.ready = "true";
  }
}

function moraleEmoji(value) {
  if (value >= 72) return "🔥";
  if (value >= 45) return "🙂";
  return "🥶";
}

function stressEmoji(value) {
  if (value >= 82) return "💥";
  if (value >= 58) return "⚠️";
  return "🍃";
}

function avgAttrs(student) {
  return ATTRS.reduce((sum, attr) => sum + student.attrs[attr], 0) / ATTRS.length;
}

function stressClass(value) {
  if (value >= 82) return "stress high";
  if (value >= 58) return "stress mid";
  return "stress low";
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 2600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

window.addEventListener("DOMContentLoaded", init);
