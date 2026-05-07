# -*- coding: utf-8 -*-

import argparse
import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"
DEFAULT_BASE_URL = os.environ.get("ASTRO_CHAOS_OPENAI_BASE_URL", "")
DEFAULT_MODEL = os.environ.get("ASTRO_CHAOS_OPENAI_MODEL", "gpt-5.4")
DEFAULT_WIRE_API = os.environ.get("ASTRO_CHAOS_OPENAI_WIRE_API", "responses")
GUIDANCE_TOKENS = ("建议", "应该", "可以考虑", "下一步", "你可以", "你需要")
PASSIVE_EVENT_WORDS = ("坏", "损坏", "故障", "断电", "丢失", "生病", "受伤", "争执", "事故", "翻出", "捡到")
AI_TASK_PROMPT = (
    "你为网页游戏《天文闹赛》生成简短锐评和偶发事件。只返回一个 JSON 对象，"
    "第一字符必须是 {，最后字符必须是 }，不要 Markdown，不要代码块，不要解释。"
    "lines 是 1 到 2 条中文短句，每条不超过 34 个汉字；只写锐评吐槽，不写建议、攻略或行动指导。"
    "语气要俏皮、恶搞、轻微阴阳怪气，像天文社吐槽役，但不要低俗或攻击现实群体。"
    "不要使用“建议”“应该”“可以考虑”“下一步”这类指导性措辞，不要自称导演。"
    "event 可以为 null；只有当 mode 为 events 时，才可以随机生成 0 或 1 个贴合当前局势的天文社事件；其他 mode 必须为 null。"
    "事件 kind 为 passive 时代表已经发生，会立刻自动应用并进入消息；"
    "kind 为 optional 时代表它只是本周行动选项之一，会和训练、休整、普通事件同栏显示，玩家选择它才会生效。"
    "passive 倾向好坏参半，同时包含至少一个收益和一个代价，例如望远镜坏了但顺便学会维修、资料丢了但翻出旧题。"
    "optional 是玩家主动采取的应对、机会或交易，例如抢修设备、申请临时场地、参加额外观测、购买资料；名称和文本尽量像行动方案。"
    "optional 一定不能是纯负面，至少要有明确收益；可以带花钱、压力或设备损耗等代价。"
    "如果只是事情发生，而不是玩家主动方案，请写成 passive；如果不是好坏参半，就不要生成 event。"
    "如果 optional 事件需要花钱，把 effects.money 写成负数，网页会把它显示成行动成本。"
    "事件应围绕天文社、观测、设备、竞赛、资料、学校管理、天气和学生状态，不要变成体育模拟器。"
    "effects 只能使用 attrs(theory/observe/practice/culture)、stress、money、morale、equipment，数值要克制。"
    "target 可为某个在社学生姓名，表示主要影响该学生。"
)
AI_RESPONSE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "lines": {
            "type": "array",
            "minItems": 1,
            "maxItems": 2,
            "items": {"type": "string"},
        },
        "event": {
            "anyOf": [
                {"type": "null"},
                {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "kind": {"type": "string", "enum": ["passive", "optional"]},
                        "target": {"anyOf": [{"type": "string"}, {"type": "null"}]},
                        "title": {"type": "string"},
                        "text": {"type": "string"},
                        "effects": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "attrs": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "properties": {
                                        "theory": {"type": "number"},
                                        "observe": {"type": "number"},
                                        "practice": {"type": "number"},
                                        "culture": {"type": "number"},
                                    },
                                    "required": ["theory", "observe", "practice", "culture"],
                                },
                                "stress": {"type": "number"},
                                "money": {"type": "number"},
                                "morale": {"type": "number"},
                                "equipment": {"type": "number"},
                            },
                            "required": ["attrs", "stress", "money", "morale", "equipment"],
                        },
                    },
                    "required": ["kind", "target", "title", "text", "effects"],
                },
            ],
        },
    },
    "required": ["lines", "event"],
}


class AstroChaosHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def do_GET(self):
        if self.path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        handlers = {
            "/api/react": build_ai_reaction,
            "/api/models": fetch_models,
        }
        handler = handlers.get(self.path)
        if handler is None:
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
            return

        try:
            payload = self._read_json()
            result = handler(payload)
        except RuntimeError as exc:
            self._write_json({"error": str(exc)}, status=HTTPStatus.SERVICE_UNAVAILABLE)
            return
        except Exception as exc:
            self._write_json({"error": f"请求处理失败: {exc}"}, status=HTTPStatus.BAD_REQUEST)
            return

        self._write_json(result)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def _write_json(self, payload, status=HTTPStatus.OK):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        print(f"[server] {self.address_string()} - {format % args}")


def build_ai_reaction(payload):
    config = payload.get("config") or {}
    api_key = config.get("token") or os.environ.get("OPENAI_API_KEY")
    base_url = normalize_base_url(config.get("baseUrl") or os.environ.get("OPENAI_BASE_URL") or DEFAULT_BASE_URL)
    model = config.get("model") or DEFAULT_MODEL
    mode = config.get("mode") or "events"
    wire_api = config.get("wireApi") or DEFAULT_WIRE_API
    if not api_key:
        raise RuntimeError("请在网页设置里填写 API Token。")

    state = payload.get("state", {})
    trigger = payload.get("trigger", "玩家推进了一周。")
    prompt = {
        "trigger": trigger,
        "game_state": state,
        "mode": mode,
        "task": AI_TASK_PROMPT,
        "schema": {
            "lines": ["锐评", "吐槽"],
            "event": {
                "kind": "passive 或 optional",
                "target": "学生姓名或 null",
                "title": "不超过 10 个汉字",
                "text": "不超过 45 个汉字",
                "effects": {
                    "attrs": {"theory": 0, "observe": 0, "practice": 0, "culture": 0},
                    "stress": 0,
                    "money": 0,
                    "morale": 0,
                    "equipment": 0,
                },
            },
        },
    }

    if not base_url:
        base_url = "https://api.openai.com/v1"
    messages = [
        {
            "role": "system",
            "content": "你写简洁、有现场感、俏皮恶搞的中文游戏锐评；不写建议、攻略或行动指导。允许生成克制的天文社事件。必须只输出合法 JSON 对象，不能输出 Markdown 或自然语言前后缀。",
        },
        {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
    ]

    if wire_api == "responses":
        data = post_with_fallbacks(
            f"{base_url}/responses",
            api_key,
            [
                {
                    "model": model,
                    "input": messages,
                    "max_output_tokens": 520,
                    "text": {
                        "format": {
                            "type": "json_schema",
                            "name": "astro_chaos_reaction",
                            "schema": AI_RESPONSE_SCHEMA,
                            "strict": True,
                        },
                    },
                },
                {
                    "model": model,
                    "input": messages,
                    "max_output_tokens": 520,
                    "text": {"format": {"type": "json_object"}},
                },
                {"model": model, "input": messages, "max_output_tokens": 520},
            ],
        )
        text = extract_responses_text(data)
    else:
        data = post_with_fallbacks(
            f"{base_url}/chat/completions",
            api_key,
            [
                {
                    "model": model,
                    "messages": messages,
                    "max_tokens": 520,
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "astro_chaos_reaction",
                            "schema": AI_RESPONSE_SCHEMA,
                            "strict": True,
                        },
                    },
                },
                {
                    "model": model,
                    "messages": messages,
                    "max_tokens": 520,
                    "response_format": {"type": "json_object"},
                },
                {"model": model, "messages": messages, "max_tokens": 520},
            ],
        )
        text = extract_chat_text(data)
    return parse_ai_response(text)


def fetch_models(payload):
    config = payload.get("config") or {}
    api_key = config.get("token") or os.environ.get("OPENAI_API_KEY")
    base_url = normalize_base_url(config.get("baseUrl") or os.environ.get("OPENAI_BASE_URL") or DEFAULT_BASE_URL)
    current_model = config.get("model") or DEFAULT_MODEL
    if not api_key:
        raise RuntimeError("请先填写 API Token，再获取模型列表。")
    if not base_url:
        base_url = "https://api.openai.com/v1"

    data = get_openai_compatible(f"{base_url}/models", api_key)
    models = normalize_models_response(data)
    if not models:
        raise RuntimeError("模型列表为空，无法选择可用模型。")
    selected = choose_model(models, current_model)
    return {"models": models, "selected": selected}


def post_openai_compatible(url, api_key, payload):
    return request_openai_compatible_json(url, api_key, payload=payload, method="POST")


def post_with_fallbacks(url, api_key, payloads):
    last_error = None
    for index, payload in enumerate(payloads):
        try:
            return post_openai_compatible(url, api_key, payload)
        except RuntimeError as exc:
            last_error = exc
            if index == len(payloads) - 1 or not looks_like_schema_rejection(str(exc)):
                raise
    raise last_error


def looks_like_schema_rejection(message):
    lowered = message.lower()
    return any(
        token in lowered
        for token in [
            "json_schema",
            "response_format",
            "text.format",
            "unsupported",
            "unknown parameter",
            "invalid parameter",
        ]
    )


def get_openai_compatible(url, api_key):
    return request_openai_compatible_json(url, api_key, method="GET")


def request_openai_compatible_json(url, api_key, payload=None, method="POST"):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Astro-Chaos/1.0",
        },
        method=method,
    )
    try:
        with urlopen(request, timeout=45) as response:
            raw = response.read().decode("utf-8", "replace")
    except HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"API HTTP {exc.code}: {summarize_api_error(raw)}") from exc
    except URLError as exc:
        raise RuntimeError(f"API 网络错误: {exc.reason}") from exc

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"API 返回非 JSON：{raw[:120]}") from exc


def normalize_models_response(response):
    source = response.get("data") if isinstance(response, dict) else response
    if not isinstance(source, list):
        return []

    models = []
    seen = set()
    for item in source:
        if isinstance(item, str):
            model_id = item.strip()
            label = model_id
        elif isinstance(item, dict):
            model_id = str(item.get("id") or item.get("name") or "").strip()
            label = str(item.get("display_name") or item.get("name") or model_id).strip()
        else:
            continue
        if not model_id or model_id in seen:
            continue
        seen.add(model_id)
        models.append({"id": model_id, "name": label or model_id})
    return models


def choose_model(models, current_model):
    ids = [model["id"] for model in models]
    if current_model in ids:
        return current_model
    for candidate in (DEFAULT_MODEL, "gpt-5.4", "gpt-5.4-mini", "gpt-5.2"):
        if candidate in ids:
            return candidate
    text_like = [model_id for model_id in ids if "image" not in model_id.lower()]
    return text_like[0] if text_like else ids[0]


def summarize_api_error(raw):
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return raw[:180]
    error = data.get("error") if isinstance(data, dict) else None
    if isinstance(error, dict):
        message = error.get("message") or error.get("type") or error
        return str(message)
    return json.dumps(data, ensure_ascii=False)[:180]


def extract_responses_text(response):
    if isinstance(response, str):
        return response
    if not isinstance(response, dict):
        return str(response)
    output_text = response.get("output_text")
    if isinstance(output_text, str):
        return output_text
    parts = []
    for item in response.get("output", []) or []:
        for content in item.get("content", []) or []:
            if isinstance(content, dict):
                text = content.get("text")
                if isinstance(text, str):
                    parts.append(text)
    if parts:
        return "\n".join(parts)
    return json.dumps(response, ensure_ascii=False)


def extract_chat_text(response):
    if isinstance(response, str):
        return response
    if isinstance(response, dict):
        choices = response.get("choices") or []
        if choices:
            message = choices[0].get("message") or {}
            content = message.get("content")
            if isinstance(content, str):
                return content
        content = response.get("content")
        return content if isinstance(content, str) else json.dumps(response, ensure_ascii=False)

    choices = getattr(response, "choices", None)
    if choices:
        message = getattr(choices[0], "message", None)
        content = getattr(message, "content", None)
        if isinstance(content, str):
            return content
    content = getattr(response, "content", None)
    return content if isinstance(content, str) else str(response)


def normalize_base_url(base_url):
    value = (base_url or "").strip().rstrip("/")
    if not value:
        return ""
    if value.endswith("/v1"):
        return value
    return f"{value}/v1"


def parse_ai_response(text):
    raw = text.strip()
    if not raw:
        raise RuntimeError("AI 返回为空。")
    lowered = raw[:80].lower()
    if lowered.startswith("<!doctype") or lowered.startswith("<html"):
        raise RuntimeError("AI 接口返回了 HTML 页面，请检查 Base URL 是否指向 OpenAI-compatible API 地址。")
    data = decode_json_object(raw)
    if data is None:
        snippet = raw[:80].replace("\n", " ")
        raise RuntimeError(f"AI 返回格式无效，未得到 JSON：{snippet}")

    lines = data.get("lines") or []
    lines = [clean_ai_line(line) for line in lines]
    lines = [line for line in lines if line]
    if not lines:
        lines = ["AI 把吐槽写成教案了，已被当场塞回粉笔盒。"]
    event = normalize_ai_event(data.get("event"))
    return {"lines": lines[:2] or ["AI 没有给出有效反应。"], "event": event}


def clean_ai_line(line):
    text = str(line).strip()
    if not text:
        return ""
    if any(token in text for token in GUIDANCE_TOKENS):
        return ""
    return text[:60]


def decode_json_object(raw):
    candidates = [raw, strip_code_fence(raw)]
    decoder = json.JSONDecoder()
    for candidate in candidates:
        candidate = candidate.strip()
        if not candidate:
            continue
        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass

    start = raw.find("{")
    while start >= 0:
        try:
            data, _ = decoder.raw_decode(raw[start:])
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass
        start = raw.find("{", start + 1)
    return None


def strip_code_fence(raw):
    lines = raw.strip().splitlines()
    if lines and lines[0].strip().startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def normalize_ai_event(event):
    if not isinstance(event, dict):
        return None
    title = str(event.get("title") or "突发事件").strip()[:18]
    text = str(event.get("text") or "").strip()[:90]
    if not text:
        return None
    kind = str(event.get("kind") or event.get("type") or "").strip().lower()
    if kind not in {"passive", "optional"}:
        kind = "passive" if event.get("passive") is True else "optional"
    target = event.get("target")
    target = str(target).strip()[:16] if target else None
    effects = event.get("effects") if isinstance(event.get("effects"), dict) else {}
    if kind == "optional" and looks_like_passive_event(title, text):
        kind = "passive"
    effects = repair_event_effects(kind, effects)
    return {
        "kind": kind,
        "target": target,
        "title": title or "突发事件",
        "text": text,
        "effects": effects,
    }


def looks_like_passive_event(title, text):
    combined = f"{title}{text}"
    return any(word in combined for word in PASSIVE_EVENT_WORDS)


def repair_event_effects(kind, effects):
    fixed = dict(effects) if isinstance(effects, dict) else {}
    attrs = fixed.get("attrs") if isinstance(fixed.get("attrs"), dict) else {}
    fixed["attrs"] = {
        "theory": safe_number(attrs.get("theory")),
        "observe": safe_number(attrs.get("observe")),
        "practice": safe_number(attrs.get("practice")),
        "culture": safe_number(attrs.get("culture")),
    }
    fixed["stress"] = safe_number(fixed.get("stress"))
    fixed["money"] = safe_number(fixed.get("money"))
    fixed["morale"] = safe_number(fixed.get("morale"))
    fixed["equipment"] = safe_number(fixed.get("equipment"))

    if kind == "optional" and not has_effect_benefit(fixed):
        fixed["attrs"]["culture"] = max(fixed["attrs"]["culture"], 1)
        fixed["stress"] = max(fixed["stress"], 1)
    if kind == "passive":
        if not has_effect_benefit(fixed):
            fixed["attrs"]["culture"] = max(fixed["attrs"]["culture"], 1)
        if not has_effect_penalty(fixed):
            fixed["stress"] = max(fixed["stress"], 1)
    return fixed


def has_effect_benefit(effects):
    attrs = effects.get("attrs") if isinstance(effects, dict) and isinstance(effects.get("attrs"), dict) else {}
    return (
        sum(max(0, safe_number(value)) for value in attrs.values()) > 0
        or safe_number(effects.get("money")) > 0
        or safe_number(effects.get("morale")) > 0
        or safe_number(effects.get("equipment")) > 0
        or safe_number(effects.get("stress")) < 0
    )


def has_effect_penalty(effects):
    attrs = effects.get("attrs") if isinstance(effects, dict) and isinstance(effects.get("attrs"), dict) else {}
    return (
        sum(min(0, safe_number(value)) for value in attrs.values()) < 0
        or safe_number(effects.get("money")) < 0
        or safe_number(effects.get("morale")) < 0
        or safe_number(effects.get("equipment")) < 0
        or safe_number(effects.get("stress")) > 0
    )


def is_mixed_effect(effects):
    return has_effect_benefit(effects) and has_effect_penalty(effects)


def safe_number(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0


def parse_args():
    parser = argparse.ArgumentParser(description="Run the Astro Chaos web game.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind. Defaults to 127.0.0.1.")
    parser.add_argument("--port", type=int, default=8765, help="Port to bind. Defaults to 8765.")
    return parser.parse_args()


def main():
    args = parse_args()
    server = ThreadingHTTPServer((args.host, args.port), AstroChaosHandler)
    url = f"http://{args.host}:{args.port}/"
    print(f"天文闹赛网页端已启动: {url}")
    print("AI 默认开启；可在页面右上角配置 API Token、可选 Base URL 和模型。")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
