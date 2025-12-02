import random
import time
import os
import sys
import math
from data import GAME_TITLE, WEATHERS, ATTRS, MONTHS, WEEKS_PER_MONTH, MAX_YEARS, MONTHLY_FUNDS, NUM_WEEKLY_OPTIONS
from data import SURNAMES, NAMES, EFFECT_MAP, GRADE_MAP, FULL_TRAINING_POOL, TRAIT_POOL

try:
    # 尝试导入 colorama 库用于颜色显示
    from colorama import Fore, Style, init
    init(autoreset=True) 
except ImportError:
    print("注意: 推荐安装 colorama 库以获得颜色显示效果。请运行 'pip install colorama'")
    # 如果导入失败，则使用 MockColor 确保代码可以继续运行
    class MockColor:
        def __getattr__(self, name): return ""
    Fore = Style = MockColor()
    
# 颜色函数 (不变)
def get_grade_color(grade_str):
    if grade_str.startswith('S') or grade_str.startswith('A'): return Fore.GREEN
    if grade_str.startswith('B'): return Fore.YELLOW
    if grade_str.startswith('C') or grade_str.startswith('D'): return Fore.CYAN
    return Fore.RED

def get_stress_color(stress_value):
    if stress_value > 80: return Fore.RED + Style.BRIGHT
    if stress_value > 50: return Fore.YELLOW
    return Fore.GREEN

# ==========================================
# 辅助函数 
# ==========================================

def get_grade(value):
    """根据属性值返回对应的评级字符串"""
    for threshold, grade in GRADE_MAP.items():
        if value >= threshold:
            return grade
    return "F"

def clear_screen():
    """清除控制台屏幕"""
    os.system('cls' if os.name == 'nt' else 'clear')

def print_separator(char='-', length=80):
    """打印分隔线"""
    print(char * length)

def press_enter():
    """等待用户按下回车键"""
    input("\n>> 按回车键继续...")

# ==========================================
# 学生类 
# ==========================================

class Student:
    def __init__(self):
        self.name = f"{random.choice(SURNAMES)}{random.choice(NAMES)}"
        # 初始属性随机化
        self.attrs = {k: random.uniform(10, 30) for k in ATTRS}
        self.temp_attrs = {k: 0 for k in ATTRS}
        # 初始学习效率随机化
        self.learning_rates = {k: random.uniform(0.8, 1.2) for k in ATTRS}
        self.stress = random.uniform(5, 20)
        # 压力敏感度随机化
        self.stress_scale = random.uniform(0.8, 1.2)
        self.status = "在社" 
        self.honor = "" # 用于标记市赛、省赛、国集等荣誉
        
        # 随机抽取天赋并应用效果
        num_traits = random.choices([0, 1, 2], weights=[0.3, 0.4, 0.3])[0]
        self.traits = random.sample(TRAIT_POOL, num_traits)
        
        for trait in self.traits:
            if trait.effect_func:
                trait.effect_func(self)

    def train(self, gain_config, global_factor=1.0):
        """应用训练带来的属性增益"""
        if self.status != "在社": return
        for attr, base_gain in gain_config.items():
            actual_gain = base_gain * self.learning_rates.get(attr, 1.0) * global_factor
            self.attrs[attr] = min(100, self.attrs[attr] + actual_gain) # 属性上限100

    def apply_stress(self, amount):
        """应用压力，若压力过高可能导致退社"""
        if self.status != "在社": return
        # 考虑压力敏感度
        real_stress = amount * self.stress_scale
        self.stress = max(0, self.stress + real_stress)
        
        if self.stress > 100:
            if random.random() < 0.8:
                self.status = "退社"
                return True # 返回 True 表示退社
        return False

    def get_contest_score(self, attr_weights, variance=0.1):
        """根据属性和比赛权重计算比赛得分"""
        # 计算基础得分
        total_weight = sum(attr_weights.values())
        if total_weight == 0:
            return 0 

        base_score = sum((self.attrs.get(attr, 0) + self.temp_attrs.get(attr, 0)) * weight 
                                for attr, weight in attr_weights.items()) 
        base_score /= total_weight
        
        # 应用特性影响 (欧皇/非酋)
        trait_names = [t.name for t in self.traits]
        variance_range = (-variance, variance) # 默认随机波动范围
        if "欧皇" in trait_names:
            variance_range = (-0.05, 0.25) # 欧皇更偏向正向波动
        elif "非酋" in trait_names:
            variance_range = (-0.25, 0.05) # 非酋更偏向负向波动
            
        rnd = random.uniform(*variance_range)
        final_score = base_score * (1 + rnd)
        
        return min(100, max(0, final_score)) # 分数限制在 0-100

    def get_display_info(self):
        """获取学生在 UI 上显示的详细信息"""
        status_color = get_stress_color(self.stress)
        
        attr_parts = []
        for k, v in self.attrs.items():
            grade = get_grade(v)
            color = get_grade_color(grade)
            attr_parts.append(f"{k}: {color}{grade:<3}{Style.RESET_ALL}")
            
        attr_str = " | ".join(attr_parts)
        trait_names = ",".join([t.name for t in self.traits])
        
        # 荣誉标记
        honor_str = f" {Fore.YELLOW}[{self.honor}]{Style.RESET_ALL}" if self.honor else ""

        return (
            f"| {self.name:<6}{honor_str:<8} | 压力: {status_color}{int(self.stress):>3}/100{Style.RESET_ALL} | "
            f"{attr_str} | {trait_names}"
        )


# ==========================================
# 游戏主逻辑类 
# ==========================================

class Game:
    def __init__(self):
        self.year = 1
        self.month_idx = 0
        self.week = 1
        self.money = 2000 # 初始资金
        self.students = []
        self.weather = "晴朗"
        self.game_over = False
        self.victory = False
        self.logs = []
        self.available_training = []
        self.num_weekly_options = NUM_WEEKLY_OPTIONS

    def log(self, msg):
        """添加游戏日志"""
        self.logs.append(f"[{Fore.CYAN}第{self.year}年 {MONTHS[self.month_idx]}月 第{self.week}周{Style.RESET_ALL}] {msg}")
        if len(self.logs) > 10:
            self.logs.pop(0) # 保持日志数量不超过 10 条
    
    def generate_weather(self):
        """生成本周天气，考虑阴天教徒的影响"""
        weights = [30, 27, 20, 15, 8] 
        
        # 检查是否有阴天教徒，如果有则增加阴天的概率权重
        cloud_cultists = sum(1 for s in self.students if "阴天教徒" in [t.name for t in s.traits] and s.status == "在社")
        if cloud_cultists > 0:
            weights[3] += cloud_cultists * 10 
            
        self.weather = random.choices(WEATHERS, weights=weights, k=1)[0]
        
    def setup_students(self):
        """游戏开始时的学生招募和初始设置"""
        clear_screen()
        print_separator()
        print("欢迎来到【天文闹赛】！作为优秀指导老师，你现在需要选（骗）拔（到）一批高一新生。")
        try:
            count = int(input("请输入你想招募的学生数量 (1-10): "))
            count = max(1, min(10, count))
        except:
            count = 5
        
        for _ in range(count):
            s = Student()
            # 检查是否有富二代，给予启动资金
            if any(t.name == "富二代" for t in s.traits):
                self.money += 2000 
                print(f"学生 {s.name} 家长赞助了 2000 元！")
            self.students.append(s)
        print(f"招募完成！现有资金: {self.money}")
        press_enter()

    def print_ui(self):
        """打印游戏主界面"""
        clear_screen()
        print_separator('=')
        print(f"🌌 {GAME_TITLE} | 第 {self.year} 年 | {MONTHS[self.month_idx]} 月 | 第 {self.week} 周")
        contest_countdown = self.get_contest_countdown()
        
        countdown_str = ""
        if contest_countdown:
            name, weeks = contest_countdown
            countdown_str = f" | ⏳ 下一场[{name}]：{Fore.MAGENTA}{weeks} 周{Style.RESET_ALL}"
        else:
            countdown_str = f" | ⏳ {Fore.CYAN}本年无重要比赛{Style.RESET_ALL}"

        print(f"💰 资金: {Fore.YELLOW}{self.money:>5}{Style.RESET_ALL} | ☀️ 天气: {self.weather}{countdown_str}")
        print_separator('=')
        
        print(f"{Fore.BLUE}--- 【社员列表】 ---{Style.RESET_ALL}")
        print("| 姓名              |      压力     |    理论   |    观测   |   实测    |   天文常识    |   特性")
        print("-" * 80)
        
        # 打印在社学生信息
        for s in self.students:
            if s.status == "在社":
                print(s.get_display_info())
            
        # 打印退社学生列表
        if any(s.status == "退社" for s in self.students):
             print(f"\n{Fore.RED}【退社成员】:{Style.RESET_ALL} {', '.join([s.name for s in self.students if s.status == '退社'])}")
        
        print_separator('-')
        self._print_trait_explanations()
        print_separator('-')
        print(f"{Fore.BLUE}--- 【最新消息】 ---{Style.RESET_ALL}")
        for l in self.logs:
            print(l)
        print_separator('=')

    def _print_trait_explanations(self):
        """打印在社学生的天赋解释"""
        active_traits = {}
        for s in self.students:
            if s.status == "在社":
                for t in s.traits:
                    active_traits[t.name] = t.desc
        
        if active_traits:
            print(f"{Fore.MAGENTA}--- 【在社同学特性解释】 ---{Style.RESET_ALL}")
            for name, desc in active_traits.items():
                print(f"{name}: {desc}")
    
    def process_week(self):
        """处理每周的逻辑流程"""
        month = MONTHS[self.month_idx]
        self.generate_weather()
        
        # 每月固定经费发放
        if self.week == 1:
            self.adjust_money(MONTHLY_FUNDS)
            self.log(f"{Fore.GREEN}收到校方拨款 {MONTHLY_FUNDS} 元。{Style.RESET_ALL}")
        
        # 生成本周可供选择的训练项目
        training_options = random.sample(FULL_TRAINING_POOL, self.num_weekly_options)
        self.available_training = training_options
        self.available_training.append({"name": "摸鱼", "cost": 0, "stress_desc": "无", "gains_desc": "无", "stress": 0, "gains": {}})
        
        self.print_ui()
        
        contest_happened = False
        # 比赛时间点检查
        if self.week == 4:
            if month == 10: self.run_city_contest(); contest_happened = True
            elif month == 11: self.run_province_contest(); contest_happened = True
            elif month == 4: self.run_national_prelim(); contest_happened = True
            elif month == 5: self.run_national_final(); contest_happened = True
        
        if not contest_happened:
            self.action_menu()
            self.check_random_events()
        
        self._advance_time(month)

        # 国际赛（通常在下一年的八月）
        if month == 8 and self.week == 1 and self.year > 1:
            self.run_ioaa() 

    def _advance_time(self, current_month):
        """时间推进逻辑"""
        self.week += 1
        if self.week > WEEKS_PER_MONTH:
            self.week = 1
            self.month_idx += 1
            if self.month_idx >= 12:
                self.month_idx = 0
                self.year += 1
            if self.month_idx == 1 and self.week ==1:
                self.new_year_processing()

    def new_year_processing(self):
        for s in self.students:
                if s.status == "在社":
                    s.honor = ""

    def action_menu(self):
        """处理用户选择训练活动"""
        print(f"\n{Fore.GREEN}--- 【本周活动安排】 ---{Style.RESET_ALL}")
        
        menu_items = {}
        
        for i, plan in enumerate(self.available_training):
            index = str(i + 1)
            
            # 统一成本字符串的长度
            cost = plan.get('cost', 0)
            cost_str = f"成本: {cost:>4}元" if cost > 0 else "免费      "
            
            # 采用更宽的占位符来容纳中文，并使用制表符 '\t' 辅助对齐
            # 注意：在某些终端，纯粹的 ljust 仍可能不完美，但这是最简单的修正
            print(
                f"{index}. {plan['name']:<6}\t | {cost_str:8}\t | "
                f"压力: {plan['stress_desc']:<8}\t | "
                f"收益: {plan['gains_desc']:<25}"
            )
            if 'req_weather' in plan:
                print(f"---- 需天气：{', '.join(plan['req_weather'])}")
            if 'req_attr' in plan:
                print(f"---- 需{plan['req_attr']}")
            
            menu_items[index] = plan
        
        choice = input("请选择指令 (1-{}): ".format(len(self.available_training)))
        
        while choice not in menu_items:
            print("指令无效，重新输入。")
            choice = input("请选择指令 (1-{}): ".format(len(self.available_training)))
        
        plan = menu_items[choice]
        
        if plan['name'] == "摸鱼":
            return
            
        cost = plan.get("cost", 0)
        money_gain = plan.get("money_gain", 0)
        
        # 资金检查
        if self.money < cost:
            self.log(f"{Fore.RED}资金不足！活动 {plan['name']} 取消。{Style.RESET_ALL}")
            time.sleep(1)
            return
            
        # 天气检查
        if "req_weather" in plan:
            if self.weather not in plan["req_weather"]:
                self.log(f"{Fore.YELLOW}天气 {self.weather} 不适合进行 {plan['name']}！活动取消。{Style.RESET_ALL}")
                time.sleep(1)
                return
        if "req_attr" in plan:
            if not any(t.name == plan["req_attr"] for s in self.students for t in s.traits):
                self.log(f"{Fore.YELLOW}无特性为 {plan["req_attr"]} 的学生! {plan['name']}活动取消。{Style.RESET_ALL}")
                time.sleep(1)
                return

        # 执行资金变动
        self.adjust_money(money_gain - cost)
        
        self.log(f"执行活动：{plan['name']}...")
        
        quit_names = []
        for s in self.students:
            if s.status == "在社":
                s.train(plan.get("gains", {}))
                is_quit = s.apply_stress(plan.get("stress", 0))
                if is_quit:
                    quit_names.append(s.name)
        
        if quit_names:
            self.log(f"{Fore.RED}悲报！{','.join(quit_names)} 顶不住压力退社了！{Style.RESET_ALL}")
        
        time.sleep(0.5)

    def check_random_events(self):
        """检查并执行随机事件"""
        events = [
            (0.04, f"有社员偷偷浏览P站被教导主任发现, 全员写检讨。",
            lambda: [s.apply_stress(EFFECT_MAP["压力增高"]) for s in self.students if s.status == "在社"]),
            (0.03, f"民科组织入侵社团活动室，宣扬“地球是平的”，大家血压飙升，天文常识值小幅下降。",
            (lambda: [s.apply_stress(EFFECT_MAP["压力大幅增高"]) for s in self.students if s.status == "在社"],
            lambda: [s.train({"天文常识": EFFECT_MAP["小幅下降"]}) for s in self.students if s.status == "在社"])), # 使用元组存储多个函数
            (0.03, f"【鱼雷入侵】某人的视频被反复播放，学生普遍感到恶心，观测、实测、天文常识大幅下降，压力大幅增高！",
            (lambda: [s.apply_stress(EFFECT_MAP["压力大幅增高"] ) for s in self.students if s.status == "在社"],
            lambda: [s.train({"天文常识": EFFECT_MAP['大幅下降'], "观测": EFFECT_MAP['大幅下降'], "实测": EFFECT_MAP['大幅下降']}) for s in self.students if s.status == "在社"])),
            (0.03, f"【对家直播】对家机构马鸣溪天文正在直播，社员被分散注意力，天文常识轻微下降，压力小幅增高。",
            (lambda: [s.apply_stress(EFFECT_MAP["压力小幅增高"]) for s in self.students if s.status == "在社"],
            lambda: [s.train({"理论": EFFECT_MAP['轻微下降'], "观测":EFFECT_MAP['轻微下降'], "实测":EFFECT_MAP['轻微下降']}) for s in self.students if s.status == "在社"])),
            (0.02, f"富二代社员请客，资金+{Fore.YELLOW}1000{Style.RESET_ALL}元。",
            lambda: self.adjust_money(1000) if any(t.name == "富二代" for s in self.students for t in s.traits) else None),
            (0.03, f"某位社员穿着女装来训练，士气大振，压力大幅降低！",
            lambda: [s.apply_stress(EFFECT_MAP["压力大幅降低"]) for s in self.students if s.status == "在社"]),
            (0.01, f"天文摄影砖家拍摄到了黑洞照片，大家观测能力小幅提升。",
            lambda: [s.train({"观测": EFFECT_MAP["小幅提升"]}) for s in self.students if "天文摄影砖家" in [t.name for t in s.traits] and s.status == "在社"]),
            (0.02, f"食堂推出了“星空特饮”（难喝的深蓝色液体），大家压力小幅增高。",
            lambda: [s.apply_stress(EFFECT_MAP["压力小幅增高"]) for s in self.students if s.status == "在社"]),
            (0.04, f"遭遇连续阴雨天，心情低落，观测能力小幅下降。",
            (lambda: [s.apply_stress(EFFECT_MAP["压力小幅增高"]) for s in self.students if s.status == "在社"] if self.weather in ["阴天", "大雨"] else None,
            lambda: [s.train({"观测": EFFECT_MAP['小幅下降']}) for s in self.students if s.status == "在社"] if self.weather in ["阴天", "大雨"] else None)),
            (0.02, f"社团望远镜被体育生当哑铃举，损坏维修需{Fore.RED}500{Style.RESET_ALL}元。",
            lambda: self.adjust_money(-500)),
            (0.02, f"在漫展中，天文社摆摊算命赚了外快，资金+{Fore.YELLOW}300{Style.RESET_ALL}元。",
            lambda: self.adjust_money(300)),
            (0.03, f"全体社员被安利了Furry文化, 大家沉迷于兽聚, 荒废学业, 导致天文常识和理论值小幅下降。",
            lambda: [s.train({"天文常识": EFFECT_MAP['小幅下降'], "理论": EFFECT_MAP['小幅下降']}) for s in self.students if any(t.name == "Furry" for t in s.traits) and s.status == "在社"]),
            (0.04, f"发现了一本天文学家的八卦杂志，大家天文常识小幅提升。",
            lambda: [s.train({"天文常识": EFFECT_MAP["小幅提升"]}) for s in self.students if s.status == "在社"]),
            (0.02, f"某社员看太阳没有用巴德膜，被迫送医，索性无大碍。",
            lambda: self.adjust_money(-500)),
            (0.03, f"社团掀起了理论学习狂潮，理论小幅提升。",
            lambda: [s.train({"理论": EFFECT_MAP["小幅提升"]}) for s in self.students if s.status == "在社"]),
            (0.02, f"社长迷上了占星术，社团活动经费被用来买水晶球，资金-{Fore.RED}300{Style.RESET_ALL}元。",
            lambda: self.adjust_money(-300)),
            (0.03, f"社员在学校表演了《星球大战》主题的宅舞，社团知名度提升，天文常识提升。",
            lambda: [s.train({"天文常识": EFFECT_MAP["提升"]}) for s in self.students if s.status == "在社"]),
            (0.08, f"【无作业日】压力降低。",
            lambda: [s.apply_stress(EFFECT_MAP["压力降低"]) for s in self.students if s.status == "在社"]),
            (0.03, f"【心结打开】某位玻璃心社员突然想通，压力大幅降低，并开导他人。",
            (lambda: [s.apply_stress(EFFECT_MAP["压力降低"]) for s in self.students if s.status == "在社"],
            lambda: [s.apply_stress(EFFECT_MAP["压力大幅降低"]) for s in self.students if "玻璃心" in [t.name for t in s.traits] and s.status == "在社"])),
            (0.02, f"星图软件获得重大更新，使用体验极佳，实测小幅提升，压力小幅降低。",
            (lambda: [s.train({"实测": EFFECT_MAP["小幅提升"]}) for s in self.students if s.status == "在社"],
            lambda: [s.apply_stress(EFFECT_MAP["压力小幅降低"]) for s in self.students if s.status == "在社"])),
            (0.01, f"社团成员们在观测后玩起了阿鲁巴，虽然身体很痛，但大家的关系更亲密了，压力大幅降低！",
            lambda: [s.apply_stress(EFFECT_MAP["压力大幅降低"]) for s in self.students if s.status == "在社"]),
            (0.02, f"【键政狂潮】几位社员在争论“星辰大海”的国际意义，虽然没有结果，但大家理论值小幅提升。",
            lambda: [s.train({"理论": EFFECT_MAP["小幅提升"]}) for s in self.students if s.status == "在社"]),
            (0.02, f"某社员在天文社团里谈笑风生，分享了他AKIOI的经历，大家天文常识小幅提升，但压力增高。",
            (lambda: [s.train({"天文常识": EFFECT_MAP["小幅提升"]}) for s in self.students if s.status == "在社"],
            lambda: [s.apply_stress(EFFECT_MAP["压力增高"]) for s in self.students if s.status == "在社"])),
            (0.01, f"【流星雨之夜】观测到罕见的流星雨爆发，全体社员实测和观测能力小幅提升，压力大幅降低！",
            (lambda: [s.train({"实测": EFFECT_MAP["小幅提升"], "观测": EFFECT_MAP["小幅提升"]}) for s in self.students if s.status == "在社"],
            lambda: [s.apply_stress(EFFECT_MAP["压力大幅降低"]) for s in self.students if s.status == "在社"])),
            (0.01, f"天文社团日常在楼顶观测，被教导主任误以为是邪教活动，全员写检讨，压力大幅增高。",
            lambda: [s.apply_stress(EFFECT_MAP["压力大幅增高"]) for s in self.students if s.status == "在社"]),
            (0.02, f"社团吉祥物（一只玩偶，或许是熊？）被学生会没收，理由是“过于可爱”，大家心情低落，压力小幅增高。",
            lambda: [s.apply_stress(EFFECT_MAP["压力小幅增高"]) for s in self.students if s.status == "在社"]),
            (0.01, f"有社员在网络论坛上与“地平论”支持者激烈辩论，虽然很耗时间，但天文常识值小幅提升。",
            lambda: [s.train({"天文常识": EFFECT_MAP["小幅提升"]}) for s in self.students if s.status == "在社"]),
            (0.01, f"【占星术的诱惑】一位社员沉迷于占星术，认为星座比科学更可靠。大家为此争论不休，常识小幅下降，但理论小幅上升，压力小幅增高。",
            (lambda: [s.train({"天文常识": EFFECT_MAP['小幅下降'], "理论": EFFECT_MAP['小幅提升']}) for s in self.students if s.status == "在社"],
            lambda: [s.apply_stress(EFFECT_MAP["压力小幅增高"]) for s in self.students if s.status == "在社"])),
        ]

        for prob, desc, func in events:
            if random.random() < prob:
                if isinstance(func, tuple):
                    # 修正: 确保元组中的所有函数都被调用执行
                    for f in func: f()
                else:
                    func()
                self.log(f"【事件】{desc}")

    def adjust_money(self, amount):
        """调整资金，并记录日志，提醒资金透支"""
        self.money += amount
        if amount < 0:
            self.log(f"资金支出 {-amount} 元。当前资金: {Fore.YELLOW}{self.money}{Style.RESET_ALL}")
        elif amount > 0 and amount != MONTHLY_FUNDS:
            self.log(f"资金收入 {amount} 元。当前资金: {Fore.YELLOW}{self.money}{Style.RESET_ALL}")
            
        if self.money < 0:
            self.log(f"{Fore.RED}注意: 资金已透支！可能会对社团声誉和未来活动造成严重影响。{Style.RESET_ALL}")

    def run_contest_logic(self, name, required_attrs, cutoff_criteria, is_interactive=False, honor_level=""):
        """比赛的核心逻辑，包括打分、互动和晋级/淘汰"""
        clear_screen()
        print_separator(Fore.YELLOW + "*")
        print(f"【{name}】正式开始！")
        print_separator("*")
        press_enter()

        active_students = [s for s in self.students if s.status == "在社"]
        if not active_students:
            self.log("社团无人，自动弃权。")
            return []

        # 比赛前的互动环节（用于省赛和国决）
        if is_interactive:
            days = 1 if "省级" in name else 3
            self.interactive_session(name, active_students, days=days)

        results = []
        print(f"{'姓名':<10} {'得分':<10} {'结果'}")
        print("-" * 30)
        
        scores = []
        for s in active_students:
            score = s.get_contest_score(required_attrs) 
            scores.append((s, score))
        
        scores.sort(key=lambda x: x[1], reverse=True)
        
        # 晋级指标计算
        if cutoff_criteria < 1: # 百分比晋级
            cutoff_index = int(len(scores) * cutoff_criteria)
            cutoff_index = max(1, cutoff_index) 
        else: # 名额晋级
            cutoff_index = int(cutoff_criteria)

        promoted = []
        for i, (s, score) in enumerate(scores):
            # 分数低于 40 无法晋级
            is_promoted = (i < cutoff_index and score >= 50) if name == "CNAO 国决" else (i < cutoff_index and score >= 32)
            
            status_str = f"{Fore.GREEN}晋级{Style.RESET_ALL}" if is_promoted else f"{Fore.RED}淘汰{Style.RESET_ALL}"
            print(f"{s.name:<10} {score:.1f}      {status_str}")
            
            s.apply_stress(10) # 比赛本身带来的压力
            
            if is_promoted:
                promoted.append(s)
                # 修正 B4: 确保荣誉标签能够被新的高级荣誉覆盖
                if honor_level:
                    s.honor = honor_level 
            else:
                # 未晋级的队员大幅增加压力
                s.apply_stress(EFFECT_MAP["淘汰增压"])
                self.log(f"选手 {s.name} {Fore.RED}被淘汰{Style.RESET_ALL}，压力大幅增高！")


        press_enter()
        return promoted

    def interactive_session(self, contest_name, students, days):
        """比赛期间的互动环节，让玩家决定当日的策略"""
        for day in range(1, days + 1):
                    
            # 每天 3 次行动机会
            for action_count in range(1, 3):
                clear_screen()
                print_separator(Fore.YELLOW + '☆')
                print(f"--- {contest_name} 第 {day}/{days} 天 | 第 {action_count}/2 次行动 ---")
                
                # 显示当前临时属性状态 (只显示第一个学生的状态)
                print(f"{Fore.CYAN}【临时知识状态】{Style.RESET_ALL}")
                temp_attr_parts = []
                # 遍历属性，只显示非零的临时增益
                for k, v in students[0].temp_attrs.items():
                    if v != 0:
                        color = Fore.GREEN if v > 0 else Fore.RED
                        temp_attr_parts.append(f"{k}: {color}{v:+.0f}{Style.RESET_ALL}")
                if not temp_attr_parts: temp_attr_parts.append("无临时增益")
                print(" | ".join(temp_attr_parts))
                print_separator('.')
                
                print(f"{Fore.GREEN}请选择今天的活动（行动 {action_count}/2）：{Style.RESET_ALL}")
                
                # 每次随机选 4 个行动
                available_actions = random.sample(CNAO_ACTIONS, min(4, len(CNAO_ACTIONS))) 
                menu_map = {}
                
                for i, action in enumerate(available_actions):
                    index = str(i + 1)
                    print(f"{index}. {action['name']:<15}: {action['desc']}")
                    menu_map[index] = action
                
                choice = input("请输入选择 (1-4) 或 's' 跳过：").lower()
                
                if choice == 's':
                    self.log("选择了休息，恢复精力。")
                    press_enter()
                    continue
                
                if choice not in menu_map:
                    self.log("无效的选择，浪费了一次机会。")
                    time.sleep(1)
                    press_enter()
                    continue

                action = menu_map[choice]
                self.log(f"【行动】参与：{action['name']}")
                
                # --- 执行行动函数 ---
                # 调用对应的函数，将 Game 实例和学生列表传入，
                # 函数内部通过 get_choice 处理多轮交互和随机结果。
                action['function'](self, students) 
                
                press_enter()
                
            self.log(f"国决第 {day} 天结束。")

        press_enter()

    def run_city_contest(self):
        """市级预赛"""
        self.log("参加市级预赛。")
        promoted = self.run_contest_logic("市级预赛", {"理论": 0.3, "天文常识": 0.5, "观测": 0.2}, 0.9, honor_level="市队") 
        self.log(f"市赛结束，{Fore.GREEN}{len(promoted)}{Style.RESET_ALL} 人晋级。")

    def run_province_contest(self):
        """省级复赛"""
        self.log("参加省赛。")
        
        # --- [START] 增加省赛参赛资格筛选 ---
        eligible_students = [s for s in self.students if s.status == "在社" and "市队" in s.honor]
        
        if not eligible_students:
            self.log(f"{Fore.RED}无人获得市队荣誉，无法参加省赛。{Style.RESET_ALL}")
            return
            
        # 暂时将筛选后的学生列表设为 game.students，以适应 run_contest_logic 的内部实现
        original_students = self.students
        self.students = eligible_students
        # --- [END] 增加省赛参赛资格筛选 ---

        required_attrs = {"理论": 0.3, "观测": 0.3, "实测": 0.3, "天文常识": 0.1}
        
        # 恶劣天气取消观测
        if self.weather in ["阴天", "大雨"]:
            self.log(f"{Fore.YELLOW}省赛观测考试因天气 {self.weather} 取消！观测权重归零。{Style.RESET_ALL}")
            required_attrs["观测"] = 0
            
        promoted = self.run_contest_logic("省级复赛", 
                                          required_attrs, 
                                          0.8, is_interactive=True, honor_level="省队") 
        self.log(f"省赛结束，{Fore.GREEN}{len(promoted)}{Style.RESET_ALL} 人入选省队。")
        
        # --- [START] 恢复 game.students 列表 ---
        self.students = original_students
        # --- [END] 恢复 game.students 列表 ---

    def run_national_prelim(self):
        """全国预赛（国初）"""
        self.log("参加全国预赛（国初）。")
        candidates = [s for s in self.students if s.status == "在社"]
        if not candidates: return

        self.run_contest_logic("CNAO 国初", {"理论": 0.7, "天文常识": 0.3}, 4, honor_level="国初") 

    def run_national_final(self):
        """全国决赛（CNAO）"""
        self.log("参加全国决赛（CNAO）。")
        
        # --- [START] 增加国决参赛资格筛选 ---
        eligible_students = [s for s in self.students if s.status == "在社" and "国初" in s.honor]
        
        if not eligible_students:
            self.log(f"{Fore.RED}无人获得国初荣誉，无法参加国决。{Style.RESET_ALL}")
            return
            
        original_students = self.students
        self.students = eligible_students
        # --- [END] 增加国决参赛资格筛选 ---
        
        promoted = self.run_contest_logic("CNAO 国决", 
                                          {"理论": 0.4, "观测": 0.3, "实测": 0.3}, 
                                          5, is_interactive=True, honor_level="国集")
        
        for s in promoted:
            self.log(f"恭喜 {Fore.GREEN}{s.name}{Style.RESET_ALL} 进入国家集训队！")
            
        # --- [START] 恢复 game.students 列表 ---
        self.students = original_students
        # --- [END] 恢复 game.students 列表 ---

    def run_ioaa(self):
        """IOAA 国际比赛"""
        self.log("参加 IOAA 国际比赛。")
        candidates = [s for s in self.students if "国集" in s.honor]
        
        if not candidates: 
            self.log(f"{Fore.RED}无人入选国家集训队，无法参加 IOAA。{Style.RESET_ALL}")
            return

        winners = self.run_contest_logic("IOAA 国际赛", 
                                         {"理论": 0.4, "观测": 0.3, "实测": 0.3}, 
                                         1, is_interactive=False, honor_level="IOAA")
        
        if len(winners) > 0:
            self.victory = True
            clear_screen()
            print_separator(Fore.MAGENTA + "!")
            print(f" 奇迹！{Fore.YELLOW}{winners[0].name}{Style.RESET_ALL} 在 IOAA 中斩获奖牌！")
            print(" 你的教学生涯达到了巅峰！")
            print_separator("!")
            press_enter()
        else:
            self.log(f"{Fore.RED}很遗憾，国际赛未能获奖。{Style.RESET_ALL}")
            
        self.game_over = True # 国际赛结束后，游戏结束

    def get_contest_countdown(self):
            """计算距离下一场重要比赛的剩余周数和名称"""
            current_month = MONTHS[self.month_idx]
            current_year = self.year
            current_week = self.week
            
            # 比赛时间点：(月, 周, 比赛名称)
            CONTEST_SCHEDULE = [
                (10, 4, "市级预赛"),
                (11, 4, "省级复赛"),
                (4, 4, "CNAO 国初"),
                (5, 4, "CNAO 国决"),
                (8, 1, "IOAA 国际赛", 2) # IOAA 发生在第二年或第三年的 8 月
            ]
            
            # 将当前时间转换为总周数 (从第一年 8 月第一周开始)
            # 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7 (12个月)
            month_index_map = {m: i for i, m in enumerate(MONTHS)}
            current_total_months = (current_year - 1) * 12 + month_index_map.get(current_month, 0)
            current_total_weeks = current_total_months * WEEKS_PER_MONTH + current_week
            
            next_contest_info = None
            min_countdown_weeks = float('inf')

            # 遍历所有可能的比赛时间
            for month, week, name, *req_year in CONTEST_SCHEDULE:
                
                # 计算比赛发生的年份（IOAA 在第二年或第三年）
                contest_year = current_year
                
                # 如果 IOAA 有年份要求 (req_year[0]) 且当前年小于要求年，则将比赛年份后推
                if req_year and current_year < req_year[0]:
                    contest_year = req_year[0]
                
                # 计算比赛发生的总月数
                contest_month_idx = month_index_map.get(month, 0)
                
                # 修正：如果当前月份在比赛月份之后，则比赛在下一年进行
                if month_index_map.get(current_month) > contest_month_idx:
                    contest_year += 1
                elif month_index_map.get(current_month) == contest_month_idx and current_week >= week:
                    # 如果是当月但已过本周，则比赛在下一年进行 (除了 IOAA，它会在新一年重新计算)
                    if name != "IOAA 国际赛":
                        contest_year += 1

                # 计算比赛发生的总周数
                contest_total_months = (contest_year - 1) * 12 + month_index_map.get(month, 0)
                contest_total_weeks = contest_total_months * WEEKS_PER_MONTH + week

                countdown = contest_total_weeks - current_total_weeks

                # 找到最近的且在未来的比赛
                if countdown > 0 and countdown < min_countdown_weeks:
                    min_countdown_weeks = countdown
                    next_contest_info = (name, countdown)
            
            # 如果没有找到任何比赛，且已超过最大年限，则返回 None
            if current_year > MAX_YEARS:
                return None
                
            return next_contest_info

# ==========================================
# 程序入口
# ==========================================

def main():
    clear_screen()
    print_separator(Fore.MAGENTA + '*')
    print(GAME_TITLE)
    print("【声明】本游戏纯属虚构，由AI辅助生成。\n\n作者：@Luca\nLuogu：https://www.luogu.com.cn/user/62659\nGithub：https://github.com/YuanzeSun\n\n本项目代码仓库（获取最新更新，游戏相关介绍）：https://github.com/YuanzeSun/Astro_Chaos")
    print_separator('*')
    print("按回车开始游戏...")
    input()
    
    game = Game()
    game.setup_students()
    
    while not game.game_over:
        game.process_week()
        
        if game.victory:
            print(f"{Fore.GREEN}恭喜！你成功培养出了IOAA选手！游戏胜利！{Style.RESET_ALL}")
            break
        
        # 检查是否所有学生都已退社
        active_count = sum(1 for s in game.students if s.status != "退社")
        if active_count == 0:
            print(f"{Fore.RED}所有社员都退社了... 游戏结束。{Style.RESET_ALL}")
            game.game_over = True # 确保跳出循环
            break
            
    # 游戏结束总结
    if not game.victory:
        print_separator('-')
        if game.year > MAX_YEARS:
             print("三年期限已到，未能培养出IOAA选手。游戏结束。")
        elif sum(1 for s in game.students if s.status != "退社") == 0:
             # 已在上面输出，此处可省略
             pass 



# ==================================
def get_choice(prompt, options):
    """
    显示提示和选项，并循环等待有效输入。
    """
    keys = list(options.keys())
    # 确保选项按字母顺序显示，更美观
    keys.sort() 
    
    while True:
        print(f"\n{Fore.YELLOW}>> {prompt}{Style.RESET_ALL}")
        for key in keys:
            print(f"  [{key}] {options[key]}")
        choice = input(f"请选择 ({'/'.join(keys)}): ").upper()
        if choice in keys:
            return choice
        print(f"{Fore.RED}无效选择'{choice}'，请重新输入。{Style.RESET_ALL}")
    
def apply_effect_to_all_active(students, attr_name, key):
    """
    根据 EFFECT_MAP 的键值，将效果应用给所有在社学生。
    """
    # 尝试安全获取值，如果键不存在则默认为 0
    effect_value = EFFECT_MAP.get(key, 0.0) 
    
    # 只有效果值不为 0 时才进行计算
    if effect_value == 0:
        return 
        
    for s in students:
        if s.status == "在社":
            # 确保 temp_attrs 是字典并且包含该属性的键，然后使用数值进行加法运算
            s.temp_attrs[attr_name] = s.temp_attrs.get(attr_name, 0) + effect_value


def action_aluba_master(game, students):
    print("【阿鲁巴大师挑战】国决期间的特色友好交流")
    
    choice1 = get_choice(
        "你的目标是隔壁省队最壮的那个，你打算用什么策略迷惑他？",
        {"A": "声东击西，假装去阿他旁边那个瘦子。", "B": "直捣黄龙，用充满哲学意味的眼神盯着他，让他害怕。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("声东击西成功，目标被分心，但瘦子跑得很快，你错失了良机。")
        choice2 = get_choice(
            "你决定在僵持中，大喊狼来了：",
            {"C": "“看！鱼雷入侵了！”", "D": "“李老师在盯着你！”"}
        )
        if choice2 == "C":
            r = random.random()
            if r < 0.7:
                apply_effect_to_all_active(students, "天文常识", "提升")
                msg = Fore.GREEN + f"成功阿倒！对方被你的喊话震慑！常识{Fore.GREEN}提升{Style.RESET_ALL}！"
            else:
                apply_effect_to_all_active(students, "理论", "轻微下降")
                msg = Fore.RED + f"被反击！你被阿了。理论{Fore.RED}轻微下降{Style.RESET_ALL}！"
        else:
            msg = Fore.YELLOW + "对方愣了一下，你决定悄悄溜走，无事发生。"
    
    elif choice1 == "B":
        print("你的眼神战术奏效，目标感到了压力，但你发现自己也处于危险中。")
        r = random.random()
        if r < 0.4:
            apply_effect_to_all_active(students, "理论", "大幅提升")
            msg = Fore.GREEN + f"成功阿倒！通过强大的心理暗示，你领悟了理论即是力量。理论{Fore.GREEN}大幅提升{Style.RESET_ALL}！"
        else:
            apply_effect_to_all_active(students, "实测", "小幅下降")
            msg = Fore.RED + f"你被意外反击，最终被阿了，实测{Fore.RED}小幅下降{Style.RESET_ALL}！"
            
    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")

def action_lilaoshi(game, students):
    print("在酒店大堂你看到了一个疑似天文李老师的人")
    
    choice1 = get_choice(
        "是否打招呼？",
        {"A": "打招呼。", "B": "偷偷溜走。"}
    )
    msg = ""
    if choice1 == "A":
        print("李老师问你是否给他的视频三连了。")
        choice2 = get_choice(
            "是否三连过？",
            {"C": "“已经三连！”", "D": "“没有三连！”"}
        )
        if choice2 == "C":
            r = random.random()
            if r < 0.7:
                apply_effect_to_all_active(students, "天文常识", "提升")
                msg = Fore.GREEN + f"李老师很高兴！天文常识{Fore.GREEN}提升{Style.RESET_ALL}！"
            else:
                apply_effect_to_all_active(students, "天文常识", "下降")
                msg = Fore.RED + f"李老师戳穿了你的谎言，并敦促你立即去三连。天文常识{Fore.RED}下降{Style.RESET_ALL}！"
        else:
            apply_effect_to_all_active(students, "天文常识", "下降")
            msg = Fore.RED + f"李老师将你记在小本本上，愤怒的离开了。天文常识{Fore.RED}下降{Style.RESET_ALL}！"
    
    elif choice1 == "B":
        print("尝试偷偷溜走。")
        r = random.random()
        if r < 0.4:
            apply_effect_to_all_active(students, "理论", "小幅提升")
            msg = Fore.GREEN + f"被李老师看到了，并开始谈笑风生。理论{Fore.GREEN}小幅提升{Style.RESET_ALL}！"
        else:
            msg = Fore.YELLOW + f"李老师没有看到你，成功溜走，无事发生！"
            
    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")

def action_yulei(game, students):
    print("你躺在床上，开始刷手机，突然你看到啵酱天文发新文章了！")
    
    choice1 = get_choice(
        "是否打开",
        {"A": "打开。", "B": "不打开。"}
    )
    msg = ""
    if choice1 == "A":
        print("啵酱发了一套新的国决模拟题！。")
        choice2 = get_choice(
            "你决定...",
            {"C": "“分享到群里！”", "D": "“自己偷偷看！”"}
        )
        if choice2 == "C":
            apply_effect_to_all_active(students, "理论", "下降")
            game.adjust_money(-100)
            msg = Fore.RED + f"群友非常愤怒，决定向你收税。你损失了一些金钱，理论{Fore.RED}下降{Style.RESET_ALL}！"
        else:
            apply_effect_to_all_active(students, "理论", "大幅下降")
            msg = Fore.RED + f"你尝试独自消化，但题目不知所云。理论{Fore.RED}大幅下降{Style.RESET_ALL}！"
    
    elif choice1 == "B":
        print("你并不想点开来看，但还是有点反胃。")
        apply_effect_to_all_active(students, "天文常识", "小幅下降")
        msg = Fore.YELLOW + Fore.RED + f"天文常识{Fore.RED}小幅下降{Style.RESET_ALL}！"
            
    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_wolf_celestial_logic(game, students):
    """2. 通宵狼人杀：星图逻辑推理 (理论/常识)"""
    print("【通宵狼人杀：星图逻辑推理】国决期间的智力游戏，大家都开始用天文梗对线...")

    choice1 = get_choice(
        "一位玩家被质疑身份，他的辩解提到了'北天极附近恒星永不落'来证明自己是好人。你决定如何反驳？",
        {"A": "指出他发言的逻辑漏洞：永不落不等于永不撒谎。", "B": "指出他的天文常识错误：北天极附近也有周期性隐匿的恒星。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("你强大的逻辑思维让对手哑口无言。你获得了最终发言权。")
        r = random.random()
        if r < 0.8:
            apply_effect_to_all_active(students, "理论", "提升")
            msg = Fore.GREEN + f"逻辑严密！你赢得了全场赞同。理论{Fore.GREEN}提升{Style.RESET_ALL}！"
        else:
            msg = Fore.YELLOW + "虽然逻辑正确，但对手被其他玩家救了，无增益。"
    
    elif choice1 == "B":
        print("你指出他常识错误的举动引起了全场关于'永不落'定义的激烈辩论。")
        r = random.random()
        if r < 0.5:
            apply_effect_to_all_active(students, "天文常识", "小幅提升") 
            msg = Fore.GREEN + f"常识+1.5！辩论让你巩固了极区天体常识！"
        else:
            apply_effect_to_all_active(students, "理论", "轻微下降") 
            msg = Fore.RED + f"你被人质疑在玩游戏时太死板！理论{Fore.RED}轻微下降{Style.RESET_ALL}！"

    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_deep_sky_gossip(game, students):
    """3. 深空八卦：导师黑历史 (常识)"""
    print("【深空八卦大会】有人爆料某知名老师多年前赶到很远的设备观测点，到设备故障...")
    
    choice1 = get_choice(
        "你决定加入讨论，并提出你认为当年最可能导致故障的原因：", 
        {"A": "老师忘记摘镜头盖。", "B": "忘记带备用电源，电池耗尽，无法自动追踪。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("你和爆料人进行了一番煞有介事的讨论。")
        apply_effect_to_all_active(students, "观测", "小幅提升")
        msg = Fore.YELLOW + f"观测+1.5！分析过程让你对野外器材维护有了深入了解。"
    
    elif choice1 == "B":
        print("你加入了更多关于电源管理和夜间观测流程的细节，成功引起了两位前辈的注意。")
        r = random.random()
        if r < 0.9:
            apply_effect_to_all_active(students, "天文常识", "提升")
            msg = Fore.GREEN + f"常识+3！前辈为你讲解了电源管理的野外常识！"
        else:
            apply_effect_to_all_active(students, "天文常识", "轻微下降")
            msg = Fore.RED + f"前辈纠正了你的一个严重常识错误，常识{Fore.RED}轻微下降{Style.RESET_ALL}！"

    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_observatory_misadventure(game, students):
    """4. 观测台的灵异事件 (观测/常识)"""
    print("【观测台的灵异事件】半夜天文台传来了奇怪的“咚咚”声，像是有东西在撞击圆顶...")
    
    choice1 = get_choice(
        "你鼓起勇气偷偷潜入天文台，声音来自圆顶内部。你决定：", 
        {"A": "立即打开圆顶控制开关，查看是否有异物（高风险）。", "B": "检查圆顶通风口或观察窗，用手机电筒侦查（低风险）。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("你打开圆顶，发现一只巨大的飞蛾被困在圆顶边缘，它吓了你一跳。")
        r = random.random()
        if r < 0.7:
            apply_effect_to_all_active(students, "观测", "提升")
            msg = Fore.GREEN + f"观测+3！你因祸得福，发现圆顶校准有一点偏差，并将其修好！"
        else:
            apply_effect_to_all_active(students, "观测", "小幅下降")
            msg = Fore.RED + "你弄坏了一个小部件，被飞蛾嘲笑，观测{Fore.RED}小幅下降{Style.RESET_ALL}。"
    
    elif choice1 == "B":
        print("你偷偷侦查，发现了那只飞蛾。虽然没学到技术，但获得了宝贵的深夜观测经验。")
        r = random.random()
        if r < 0.8:
            apply_effect_to_all_active(students, "天文常识", "小幅提升")
            msg = Fore.GREEN + f"常识+1.5！你认识到了野外观测中昆虫对设备的影响！"
        else:
            msg = Fore.YELLOW + "飞蛾飞走了，你什么都没发现。"
            
    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_ccd_driver_haunted(game, students):
    """6. CCD驱动故障与玄学 (实测/观测)"""
    print("【CCD驱动故障与玄学】你正在为野外观测调试CCD，但驱动总是间歇性崩溃...")
    
    choice1 = get_choice(
        "你检查了所有参数，但找不到原因。一位老油条建议你试试'祭天'（烧高香）或：", 
        {"A": "用U盘重新刷入一个据说很稳定但年代久远的驱动版本。", "B": "彻底放弃软件，转而检查数据线和电源线的接触。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("旧驱动成功刷入，但兼容性很差，你必须手动调整数百个参数。")
        r = random.random()
        if r < 0.4:
            apply_effect_to_all_active(students, "实测", "大幅提升")
            msg = Fore.GREEN + f"实测+4！你通过手动调试掌握了CCD底层参数的奥秘！"
        else:
            apply_effect_to_all_active(students, "观测", "小幅下降")
            msg = Fore.RED + f"调试失败，CCD彻底罢工，观测{Fore.RED}小幅下降{Style.RESET_ALL}！"
            
    elif choice1 == "B":
        print("你发现数据线的一个接口松动了，重新插紧后，驱动奇迹般地稳定了。")
        apply_effect_to_all_active(students, "实测", "提升")
        msg = Fore.GREEN + f"实测+3！大道至简！硬件才是真理！"

    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_exam_paper_treasure(game, students):
    """7. 考场楼道寻宝：旧试卷残片 (理论/常识)"""
    print("【考场楼道寻宝】你找到了一张某年国决的旧试卷残片，上面写着一道关于'引力波'探测的计算题...")
    
    choice1 = get_choice(
        "残片上缺少了描述'时空微扰'的关键公式。你决定：", 
        {"A": "尝试凭对广义相对论的理解补全公式，进行理论推导。", "B": "只记住已有的已知条件和结论，回去查阅 LIGO 论文。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("你对着残片琢磨了半小时，最终补全了一个关键的张量方程。")
        r = random.random()
        if r < 0.6:
            apply_effect_to_all_active(students, "理论", "提升")
            msg = Fore.GREEN + f"理论+3！补全成功，你对引力波有了更深的理解！"
        else:
            apply_effect_to_all_active(students, "理论", "轻微下降")
            msg = Fore.RED + f"补全失败，你把公式写错了，理论{Fore.RED}轻微下降{Style.RESET_ALL}！"
        
    elif choice1 == "B":
        print("你记住了关键词：'引力波'和'时空微扰'。")
        apply_effect_to_all_active(students, "天文常识", "小幅提升")
        msg = Fore.GREEN + f"常识+1.5！关键词记忆成功，常识得到了巩固！"
    
    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_constellation_teller(game, students):
    """8. 星座算命大师 (常识/理论)"""
    print("【星座算命大师】一个隔壁队伍的学姐声称能用星图知识为你占卜考试命运...")
    
    choice1 = get_choice(
        "她要求你选择你本命星座（假设是天蝎座）对冲的星座（金牛座），并问'天蝎座的恒星颜色代表了什么命运？' 你选择：", 
        {"A": "指出天蝎座主星心宿二（Antares）是红色超巨星，代表巨大但短暂的爆发。", "B": "胡诌一个'黄色代表光明，蓝色代表智慧'的答案。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("学姐惊讶于你的知识储备，开始认真讲解恒星演化对人生的'启示'。")
        r = random.random()
        if r < 0.6:
            apply_effect_to_all_active(students, "理论", "小幅提升")
            msg = Fore.GREEN + f"理论+1.5！学姐被你带入科学，你获得了关于赫罗图的知识！"
        else:
            msg = Fore.YELLOW + "学姐表示'你太理性了'，占卜失败，无增益。"
            
    elif choice1 == "B":
        print("学姐笑了，但为了配合你，她给了你一个关于'古代七曜'的图谱。")
        r = random.random()
        if r < 0.8:
            apply_effect_to_all_active(students, "天文常识", "提升")
            msg = Fore.GREEN + f"常识+3！你巩固了大量黄道星座和古代行星常识！"
        else:
            msg = Fore.YELLOW + "图谱是假的，无增益。"

    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_usb_dark_matter(game, students):
    """9. U盘里的暗物质数据 (实测/理论)"""
    print("【U盘里的暗物质数据】老师离开了电脑，U盘里是关于暗物质的原始数据...")
    
    choice1 = get_choice(
        "U盘里有两个文件夹，一个叫'DM_MODEL_v3'，另一个叫'Final_Exam_Prep'。你选择查看：", 
        {"A": "DM_MODEL_v3：暗物质模型和模拟代码。", "B": "Final_Exam_Prep：最后的考前资料。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("模型是加密的。")
        r = random.random()
        if r < 0.2:
            apply_effect_to_all_active(students, "理论", "大幅提升")
            msg = Fore.GREEN + f"理论+4！你竟然破解了密码！看到了几道关键的暗物质模型公式！"
        else:
            msg = Fore.RED + f"密码错误，老师回来了！你被狠狠训了一顿，无增益。"
            
    elif choice1 == "B":
        print("你打开了考前资料，发现里面只有一张'好好睡觉'的图片和一个巨大的 Excel 表格。")
        choice2 = get_choice(
            "你决定：",
            {"C": "复制 Excel 表格，回去研究里面的'天体普查数据'。", "D": "只看图片，听从老师的劝告去睡觉。"}
        )
        if choice2 == "C":
            r = random.random()
            if r < 0.6:
                apply_effect_to_all_active(students, "实测", "提升")
                msg = Fore.GREEN + f"实测+3！你成功处理了普查数据，获得了宝贵的经验！"
            else:
                msg = Fore.YELLOW + f"表格是空的，老师的玩笑，无增益。"
        else:
            msg = Fore.YELLOW + f"你获得了充足的休息，但没有知识增益。"

    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_cosmos_cuisine(game, students):
    """10. 宇宙料理挑战 (常识)"""
    print("【宇宙料理挑战】联欢会上有一道名为'宇宙大尺度结构'的黑暗料理...")
    
    choice1 = get_choice(
        "这道菜看起来像一个巨大的、松散的、充满各种奇怪物质的球体。你决定：", 
        {"A": "挑战它，吃完一整份，领悟大尺度结构的复杂性。", "B": "只尝一小口，专注于其中看起来最像'星系团'的部分。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("你吃完了，感受到了巨大的痛苦，仿佛味蕾在经历'宇宙膨胀'。")
        r = random.random()
        if r < 0.4:
            apply_effect_to_all_active(students, "理论", "小幅提升")
            msg = Fore.GREEN + f"理论+1.5！痛苦让你想起了宇宙结构的层次原理！"
        else:
            apply_effect_to_all_active(students, "天文常识", "轻微下降")
            msg = Fore.RED + f"你吐了，胃部极度不适，常识{Fore.RED}轻微下降{Style.RESET_ALL}！"
            
    elif choice1 == "B":
        print("你成功分离出了一块'星系团'，并和一位本地同学交流了这道菜的地域特色。")
        r = random.random()
        if r < 0.8:
            apply_effect_to_all_active(students, "天文常识", "提升")
            msg = Fore.GREEN + f"常识+3！本地同学告诉你了很多关于当地夜空和观测点的常识！"
        else:
            msg = Fore.YELLOW + f"交流了半天，发现对方也是外地的。无增益。"

    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_big_bang_debate(game, students):
    """11. 大爆炸终极辩论：宇宙模型 (理论/常识)"""
    print("【大爆炸终极辩论】一位老教授提出了对标准宇宙模型的质疑，引起激烈辩论...")
    
    choice1 = get_choice(
        "教授认为'宇宙暴胀理论'存在瑕疵。你选择支持哪个观点？", 
        {"A": "反驳：利用最新观测到的 CMB 数据证明暴胀的必要性。", "B": "支持：提出'火劫宇宙模型'作为暴胀的替代方案。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("你的观点基于最新数据和严谨的理论，让反对者哑口无言。")
        apply_effect_to_all_active(students, "理论", "大幅提升")
        msg = Fore.GREEN + f"理论+4！你的理论知识得到了飞速提升！"
            
    elif choice1 == "B":
        print("你的新观点（火劫模型）引起了激烈的争论。你决定：")
        choice2 = get_choice(
            "如何支持你的火劫模型观点？",
            {"C": "引用一道涉及弦理论的复杂数学公式来镇场。", "D": "用生动的比喻来解释周期性宇宙的常识。"}
        )
        if choice2 == "C":
            r = random.random()
            if r < 0.7:
                apply_effect_to_all_active(students, "理论", "提升")
                msg = Fore.GREEN + f"理论+3！查资料巩固了大量知识！"
            else:
                msg = Fore.YELLOW + f"公式写错了，被嘲笑了，无增益。"
        else:
            apply_effect_to_all_active(students, "天文常识", "小幅提升")
            msg = Fore.YELLOW + f"常识+1.5！比喻生动有趣，略有收获。"

    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_basketball_kepler(game, students):
    """15. 篮球：开普勒投篮 (理论/常识)"""
    print("【篮球：开普勒投篮】你获得了最后一投的机会，比分持平...")
    
    choice1 = get_choice(
        "你决定用哪种方式确保命中？", 
        {"A": "默念'我的运动是开普勒轨道'，用理论计算抛物线弧度。", "B": "相信直觉，用你最擅长的姿势大力出奇迹！"}
    )
    
    msg = ""
    if choice1 == "A":
        print("你严格遵循物理原理，投出了一个漂亮的弧线。")
        r = random.random()
        if r < 0.6:
            apply_effect_to_all_active(students, "理论", "小幅提升")
            msg = Fore.GREEN + f"理论+1.5！命中！抛物线计算成功！"
        else:
            msg = Fore.YELLOW + f"物理学救不了篮球，但你回忆起了动量定理，无增益。"
            
    elif choice1 == "B":
        print("球飞得很高，在空中停留了很久，大家开始讨论'空气阻力'对天体运动的微弱影响！")
        apply_effect_to_all_active(students, "天文常识", "轻微提升")
        msg = Fore.GREEN + f"常识+1！虽然球没进，但你巩固了常识！"

    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_midnight_poetry(game, students):
    """16. 午夜天文诗歌大会 (常识)"""
    print("【午夜天文诗歌大会】你被要求以'黑洞'为主题即兴创作一首诗歌...")
    
    choice1 = get_choice(
        "你决定突出黑洞的哪个特征？", 
        {"A": "事件视界（Event Horizon）的哲学意境。", "B": "吸积盘（Accretion Disk）发出X射线的物理过程。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("你的诗歌充满了对时空边界的思考，得到了文学爱好者的赞赏。")
        apply_effect_to_all_active(students, "天文常识", "小幅提升")
        msg = Fore.GREEN + f"常识+1.5！你巩固了黑洞的基本概念！"
    
    elif choice1 == "B":
        print("你的诗歌太专业，提到了黑体辐射和光子能量，一位理论导师对你表示赞赏。")
        apply_effect_to_all_active(students, "理论", "轻微提升")
        msg = Fore.YELLOW + f"理论+1！你的专业度得到了认可。"
        
    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_meteorite_identification(game, students):
    """17. 陨石真伪鉴别 (常识/实测)"""
    print("【陨石真伪鉴别】有人声称在校园里捡到了一块陨石，并要卖给你...")
    
    choice1 = get_choice(
        "你检查了这块石头，它看起来像陨石。你决定用什么方法快速鉴定？", 
        {"A": "检查是否具有磁性，并用指甲试刮（实测）。", "B": "询问关于它在进入大气层时燃烧的颜色（常识）。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("石头有微弱的磁性，但没有熔壳。你需要确定它是否是普通地球岩石。")
        r = random.random()
        if r < 0.7:
            apply_effect_to_all_active(students, "实测", "提升")
            msg = Fore.GREEN + f"实测+3！你成功鉴别出这块石头是含镍铁陨石（或铁矿石）！"
        else:
            apply_effect_to_all_active(students, "实测", "轻微下降")
            msg = Fore.YELLOW + "你被割伤了手，无法确定真伪。实测轻微下降。"
    
    elif choice1 == "B":
        print("对方被你问得语塞，你回忆起了不同元素燃烧产生的颜色常识。")
        apply_effect_to_all_active(students, "天文常识", "小幅提升")
        msg = Fore.GREEN + f"常识+1.5！巩固了陨石化学成分相关知识！"
        
    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_planetarium_date(game, students):
    """18. 星象厅的秘密约会 (观测/常识)"""
    print("【星象厅的秘密约会】偷偷在星象厅练习定位，你发现投影仪的坐标系是错的...")
    
    choice1 = get_choice(
        "为了不惊动别人，你决定偷偷校准坐标系。你选择练习定位：", 
        {"A": "南天极附近的麦哲伦星系（需要精确的坐标变换）。", "B": "银河系中心的Sagittarius A* 区域（需要大量常识定位）。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("南天极的星图比想象中复杂，你需要多次尝试校准。")
        r = random.random()
        if r < 0.8:
            apply_effect_to_all_active(students, "观测", "提升")
            msg = Fore.GREEN + f"观测+3！成功校准坐标系，定位了南半球天体！"
        else:
            apply_effect_to_all_active(students, "观测", "小幅下降")
            msg = Fore.RED + "你被投影仪的噪音吸引了工作人员，被迫逃跑。观测小幅下降。"
    
    elif choice1 == "B":
        print("银心区域的常识性知识点非常多。")
        apply_effect_to_all_active(students, "天文常识", "小幅提升")
        msg = Fore.GREEN + f"常识+1.5！复习了银心区域的知识！"
        
    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")


def action_solar_filter_drama(game, students):
    """19. 太阳滤光片意外 (观测/常识)"""
    print("【太阳滤光片意外】有人在调试望远镜时忘记盖上太阳滤光片，阳光直射而入！")
    
    choice1 = get_choice(
        "滤光片突然掉了！你必须立即采取行动：", 
        {"A": "迅速关闭目镜盖，并检查观测室的遮光状态，大喊'注意光害！'。", "B": "大喊一声'日冕抛射！'然后逃跑，引开人群。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("你成功避免了事故，并学到了紧急处理流程。")
        apply_effect_to_all_active(students, "观测", "小幅提升")
        msg = Fore.GREEN + f"观测+1.5！成功的紧急处理经验！"
    
    elif choice1 == "B":
        print("你的喊声引起了围观，但并没有解决问题。")
        apply_effect_to_all_active(students, "天文常识", "轻微提升")
        msg = Fore.YELLOW + f"常识+1！大家讨论了日冕抛射的危害，无实际观测增益。"
        
    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")

def action_astronomical_meme(game, students):
    """25. 天文梗图设计大赛 (常识)"""
    print("【天文梗图设计大赛】用天文知识设计搞笑梗图，大家投票决定优胜者...")
    
    choice1 = get_choice(
        "你决定设计一个关于'黑洞'的梗图，你突出：", 
        {"A": "黑洞对周围恒星的潮汐力撕裂效果（Spaghettification）的痛苦和生草。", "B": "黑洞视界（Event Horizon）内'霍金辐射'的量子物理悖论。"}
    )
    
    msg = ""
    if choice1 == "A":
        print("你的梗图简单粗暴又搞笑，在人群中广为流传，大家都记住了潮汐力！")
        apply_effect_to_all_active(students, "天文常识", "提升")
        msg = Fore.GREEN + f"常识+3！梗图大受欢迎，巩固了恒星演化常识！"
    
    elif choice1 == "B":
        print("你的梗图过于深奥，只有少数理论大佬看懂了，但他们对你的理论知识表示敬佩。")
        apply_effect_to_all_active(students, "理论", "轻微提升")
        msg = Fore.YELLOW + f"理论+1！小众梗图得到了理论圈的认可。"
        
    print(f"{Fore.MAGENTA}*** 结果 ***: {msg}{Style.RESET_ALL}")

CNAO_ACTIONS = [
    {"name": "阿鲁巴", "desc": "传统游戏。", "function": action_aluba_master},
    {"name": "狼人杀", "desc": "找出狼人。", "function": action_wolf_celestial_logic},
    {"name": "八卦夜聊", "desc": "讨论老师观测中的重大失误。", "function": action_deep_sky_gossip},
    {"name": "天文台灵异事件", "desc": "调查望远镜的'幽灵星'出没事件。", "function": action_observatory_misadventure},
    {"name": "修复CCD", "desc": "解决驱动问题，使用玄学仪式。", "function": action_ccd_driver_haunted},
    {"name": "考场楼道寻宝", "desc": "寻找十年前的国决旧试卷残片。", "function": action_exam_paper_treasure},
    {"name": "星座算命大师", "desc": "用你的本命星座预测考试分数。", "function": action_constellation_teller},
    {"name": "U盘里的暗物质数据", "desc": "老师U盘里是机密暗物质旋转曲线数据。", "function": action_usb_dark_matter},
    {"name": "宇宙料理挑战", "desc": "挑战以'类星体'命名的诡异炒饭。", "function": action_cosmos_cuisine},
    {"name": "大爆炸终极辩论", "desc": "关于'宇宙是否有中心'的激烈思辨。", "function": action_big_bang_debate},
    {"name": "篮球放松", "desc": "用开普勒定律计算完美弧度投篮。", "function": action_basketball_kepler},
    {"name": "午夜神秘天文诗歌仪式", "desc": "以'红巨星'为主题即兴创作诗歌。", "function": action_midnight_poetry},
    {"name": "陨石真伪鉴别", "desc": "鉴别一块声称是陨石的石头。", "function": action_meteorite_identification},
    {"name": "星象厅的秘密约会", "desc": "偷偷打开星象厅投影仪练习南天极定位。", "function": action_planetarium_date},
    {"name": "太阳滤光片意外", "desc": "紧急处理望远镜滤光片脱落的事故。", "function": action_solar_filter_drama},
    {"name": "天文梗图设计大赛", "desc": "为联欢会做准备！", "function": action_astronomical_meme},
    {"name": "散步寻找熟人", "desc": "看看会发生什么吧", "function": action_lilaoshi},
    {"name": "网上冲浪", "desc": "还是刷刷手机吧", "function": action_yulei},
]
# ==================================
if __name__ == "__main__":
    main()