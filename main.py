import random
import time
import os
import sys
import math

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
    
# ==========================================
# 配置与常量定义
# ==========================================

GAME_TITLE = "天文闹赛 (Astronomy Chaos Competition)"

# 时间设定
MONTHS = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7]
WEEKS_PER_MONTH = 4
MAX_YEARS = 3
MONTHLY_FUNDS = 500 # 每月固定经费

# 属性维度
ATTRS = ["理论", "观测", "实测", "天文常识"]

# 评级阈值
GRADE_MAP = {
    95: "S+", 90: "S", 85: "A+", 80: "A", 75: "B+", 70: "B", 
    65: "B-", 60: "C+", 55: "C", 50: "C-", 45: "D+", 40: "D", 
    30: "D-", 20: "E", 0: "F"
}

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

# 训练影响级别描述与对应数值
EFFECT_MAP = {
    # 提升/降低数值
    "大幅提升": 4.0,  
    "提升": 3.0,      
    "小幅提升": 1.5,   
    "轻微提升": 1.0,   

    "大幅下降": 4.0,  
    "下降": 3.0,      
    "小幅下降": 1,
    "轻微下降": 0.5,

    # 压力数值 
    "压力大幅增高": 15.0,  
    "压力增高": 8.0,     
    "压力小幅增高": 3.0,   
    "压力大幅降低": -15.0, "压力降低": -8.0, "压力小幅降低": -3.0,
    # 淘汰惩罚
    "淘汰增压": 15.0,
}

# 天气 (不变)
WEATHERS = ["晴朗", "少云", "多云", "阴天", "大雨"]

# 名字库 (不变)
SURNAMES = [
    "张", "王", "李", "赵", "刘", "陈", "杨", "黄", "吴", "徐", "孙", "马", "朱",
    "胡", "林", "郭", "何", "高", "罗", "郑", "梁", "谢", "宋", "唐", "许",
    "邓", "冯", "曹", "彭", "曾", "肖", "田", "董", "潘", "袁", "于", "蒋",
    "蔡", "余", "杜", "叶", "范", "韩", "金", "邱", "姜", "覃"
]
NAMES = [
    "子涵", "梓涵", "思源", "嘉琪", "浩然", "子瑜", "语晨", "雨泽", "若溪", "俊熙",
    "睿航", "思睿", "奕辰", "晨曦", "书瑶", "依诺", "芷若", "欣怡", "诗琪", "浩宇",
    "怡然", "昕悦", "嘉懿", "沐阳", "一航", "子墨", "梓萱", "靖雯", "若楠", "星辰",
    "明轩", "皓轩", "嘉豪", "芷宁", "雅涵", "之恒", "瑞宁", "泽楷", "子睿", "钰琪",
    "晨悦", "若彤", "思辰", "梓逸", "绍涵", "煜城", "沐辰", "凌云", "嘉禾", "乐瑶"
]


# ==========================================
# 训练池 
# ==========================================

FULL_TRAINING_POOL = [
    # 核心训练 
    {"name": "模拟笔试", "cost": 100, "stress_desc": "压力增高", "gains_desc": "理论提升, 实测小幅提升", "stress": EFFECT_MAP["压力增高"], "gains": {"理论": EFFECT_MAP["提升"], "实测": EFFECT_MAP["小幅提升"]}},
    {"name": "竞赛真题", "cost": 50, "stress_desc": "压力大幅增高", "gains_desc": "理论大幅提升, 天文常识小幅提升", "stress": EFFECT_MAP["压力大幅增高"], "gains": {"理论": EFFECT_MAP["大幅提升"], "天文常识": EFFECT_MAP["小幅提升"]}},
    {"name": "外出观测", "cost": 400, "stress_desc": "压力小幅增高", "gains_desc": "观测大幅提升, 实测小幅提升", "stress": EFFECT_MAP["压力小幅增高"], "gains": {"观测": EFFECT_MAP["大幅提升"], "实测": EFFECT_MAP["小幅提升"]}, "req_weather": ["晴朗", "少云"]},
    {"name": "数据处理", "cost": 150, "stress_desc": "压力增高", "gains_desc": "实测提升, 理论轻微提升", "stress": EFFECT_MAP["压力增高"], "gains": {"实测": EFFECT_MAP["提升"], "理论": EFFECT_MAP["轻微提升"]}},
    {"name": "常识讲座", "cost": 200, "stress_desc": "压力小幅降低", "gains_desc": "天文常识大幅提升, 理论轻微提升", "stress": EFFECT_MAP["压力小幅降低"], "gains": {"天文常识": EFFECT_MAP["大幅提升"], "理论": EFFECT_MAP["轻微提升"]}},
    
    # 减压/赚钱 
    {"name": "专业按摩", "cost": 800, "stress_desc": "压力大幅降低", "gains_desc": "天文常识轻微提升", "stress": EFFECT_MAP["压力大幅降低"], "gains": {"天文常识": EFFECT_MAP["轻微提升"]}}, 
    {"name": "社团接单", "cost": 0, "stress_desc": "压力增高", "gains_desc": "实测轻微提升", "stress": EFFECT_MAP["压力增高"], "gains": {"实测": EFFECT_MAP["轻微提升"]}, "money_gain": 400}, 
    {"name": "科教片放松", "cost": 200, "stress_desc": "压力降低", "gains_desc": "天文常识大幅提升", "stress": EFFECT_MAP["压力降低"], "gains": {"天文常识": EFFECT_MAP["大幅提升"]}},
    
    # 综合训练
    {"name": "跨学科研讨", "cost": 0, "stress_desc": "压力增高", "gains_desc": "理论小幅提升, 实测小幅提升", "stress": EFFECT_MAP["压力增高"], "gains": {"理论": EFFECT_MAP["小幅提升"], "实测": EFFECT_MAP["小幅提升"]}},
    {"name": "撰写科普文", "cost": 0, "stress_desc": "压力增高", "gains_desc": "天文常识提升, 理论小幅提升", "stress": EFFECT_MAP["压力增高"], "gains": {"天文常识": EFFECT_MAP["提升"], "理论": EFFECT_MAP["小幅提升"]}},
    {"name": "寻找新星", "cost": 500, "stress_desc": "压力小幅增高", "gains_desc": "观测提升, 实测提升", "stress": EFFECT_MAP["压力小幅增高"], "gains": {"观测": EFFECT_MAP["提升"], "实测": EFFECT_MAP["提升"]}, "req_weather": ["晴朗", "少云"]},
    {"name": "计算轨道", "cost": 100, "stress_desc": "压力大幅增高", "gains_desc": "实测大幅提升, 理论提升", "stress": EFFECT_MAP["压力大幅增高"], "gains": {"实测": EFFECT_MAP["大幅提升"], "理论": EFFECT_MAP["提升"]}},
    {"name": "星图识别训练", "cost": 100, "stress_desc": "压力增高", "gains_desc": "观测大幅提升, 天文常识提升", "stress": EFFECT_MAP["压力增高"], "gains": {"观测": EFFECT_MAP["大幅提升"], "天文常识": EFFECT_MAP["提升"]}},
    {"name": "黑洞科普", "cost": 150, "stress_desc": "压力小幅降低", "gains_desc": "理论提升, 天文常识提升", "stress": EFFECT_MAP["压力小幅降低"], "gains": {"理论": EFFECT_MAP["提升"], "天文常识": EFFECT_MAP["提升"]}},
    
    # 新增训练
    {"name": "户外生存", "cost": 500, "stress_desc": "压力降低", "gains_desc": "观测提升, 天文常识提升", "stress": EFFECT_MAP["压力降低"], "gains": {"观测": EFFECT_MAP["提升"], "天文常识": EFFECT_MAP["提升"]}},
    {"name": "编程算法", "cost": 50, "stress_desc": "压力大幅增高", "gains_desc": "实测大幅提升", "stress": EFFECT_MAP["压力大幅增高"], "gains": {"实测": EFFECT_MAP["大幅提升"]}},
    {"name": "哲学思辨", "cost": 0, "stress_desc": "压力小幅增高", "gains_desc": "理论轻微提升", "stress": EFFECT_MAP["压力小幅增高"], "gains": {"理论": EFFECT_MAP["轻微提升"]}},
    {"name": "观看流星雨", "cost": 400, "stress_desc": "压力降低", "gains_desc": "观测提升", "stress": EFFECT_MAP["压力降低"], "gains": {"观测": EFFECT_MAP["提升"]}, "req_weather": ["晴朗", "少云"]},
]
NUM_WEEKLY_OPTIONS = 5

# ==========================================
# 天赋池 
# ==========================================

class Trait:
    def __init__(self, name, desc, effect_func=None):
        self.name = name
        self.desc = desc
        self.effect_func = effect_func

TRAIT_POOL = [
    Trait("Furry", "对毛茸茸的东西没有抵抗力，天文常识较高，压力敏感度略高。", 
          lambda student: (student.attrs.__setitem__("天文常识", student.attrs["天文常识"] + 15),
                           student.__setattr__('stress_scale', student.stress_scale * 1.2))),
    Trait("阴天教徒", "所到之处，云量增加（小幅增加阴天概率）。", 
          lambda student: None), 
    Trait("天文摄影砖家", "器材党，初始观测能力强，但不爱处理数据（实测学习效率降低）。", 
          lambda student: (student.attrs.__setitem__("观测", max(student.attrs["观测"], 60)),
                           student.learning_rates.__setitem__("实测", student.learning_rates["实测"] * 0.8))),
    Trait("富二代", "家里有矿，性格开朗抗压能力强。", 
          lambda student: student.__setattr__('stress_scale', student.stress_scale * 0.8)),
    Trait("玻璃心", "非常敏感，容易退社，但理论学习能力强。", 
          lambda student: (student.__setattr__('stress_scale', student.stress_scale * 1.5),
                           student.learning_rates.__setitem__("理论", student.learning_rates["理论"] * 1.3))),
    Trait("民科体质", "总能提出惊世骇俗的理论，天文常识学习慢。", 
          lambda student: student.learning_rates.__setitem__("天文常识", student.learning_rates["天文常识"] * 0.5)), 
    Trait("肝帝", "每晚只睡4小时，所有学习效率微升。", 
          lambda student: [student.learning_rates.update({k: v*1.1}) for k,v in student.learning_rates.items()]),
    Trait("欧皇", "考试运气极好（正向随机波动更大）。", 
          None), 
    Trait("非酋", "考试运气极差（负向随机波动更大）。", 
          None),
    Trait("理论天才", "痴迷理论推导，初始理论能力强，学习效率高。", 
          lambda student: (student.attrs.__setitem__("理论", max(student.attrs["理论"], 60)),
                           student.learning_rates.__setitem__("理论", student.learning_rates["理论"] * 1.3))),
    Trait("性向独特", "这名学生的性取向有一点……怪。", 
          None), 
    Trait("嗜睡体质", "每天需要睡够10小时，抗压能力强，但训练效率普遍降低。", 
          lambda student: (student.__setattr__('stress_scale', student.stress_scale * 0.7),
                           student.learning_rates.__setitem__("理论", student.learning_rates["理论"] * 0.8),
                           student.learning_rates.__setitem__("观测", student.learning_rates["观测"] * 0.8))),
    Trait("数据分析师", "痴迷于三维建模，初始实测能力高，理论学习效率略有提升。", 
          lambda student: (student.attrs.__setitem__("实测", max(student.attrs["实测"], 50)), 
                           student.learning_rates.__setitem__("理论", student.learning_rates["理论"] * 1.1))),
    Trait("口胡大师", "天文常识储备惊人，但一到考试就发挥失常。", 
          lambda student: student.attrs.__setitem__("天文常识", max(student.attrs["天文常识"], 55))),
    Trait("女装控", "喜欢男扮女装，社团气氛活跃（压力敏感度略低）。", 
          lambda student: student.__setattr__('stress_scale', student.stress_scale * 0.9)), 
    Trait("星际公民", "相信外星生命存在，理论学习效率略高。", 
          lambda student: student.learning_rates.__setitem__("理论", student.learning_rates["理论"] * 1.1)),
    Trait("近视眼", "观测能力初始值低，但对理论/实测影响不大。", 
          lambda student: student.attrs.__setitem__("观测", min(student.attrs["观测"], 15))),
    Trait("社牛", "社交达人，比赛期间的社交活动效果加倍。", 
          None), 
    Trait("宅属性", "抗压能力强（宅家习惯），但天文常识学习慢。", 
          lambda student: (student.__setattr__('stress_scale', student.stress_scale * 0.8), 
                           student.learning_rates.__setitem__("天文常识", student.learning_rates["天文常识"] * 0.8))), 
]

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

        base_score = sum(self.attrs.get(attr, 0) * weight for attr, weight in attr_weights.items())
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
        self.logs.append(f"[{Fore.CYAN}第{self.year}年 {MONTHS[self.month_idx]}月 第{self.week}{Style.RESET_ALL}周] {msg}")
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
        print("欢迎来到【天文闹赛】！作为指导老师，你需要选拔一批高一新生。")
        try:
            count = int(input("请输入你想招募的学生数量 (1-10): "))
            count = max(1, min(10, count))
        except:
            count = 4
        
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
            
            weather_req = f" [需天气: {', '.join(plan['req_weather'])}]" if 'req_weather' in plan else ""
            
            # 采用更宽的占位符来容纳中文，并使用制表符 '\t' 辅助对齐
            # 注意：在某些终端，纯粹的 ljust 仍可能不完美，但这是最简单的修正
            print(
                f"{index}. {plan['name']:<6}\t | {cost_str:8}\t | "
                f"压力: {plan['stress_desc']:<8}\t | "
                f"收益: {plan['gains_desc']:<25}{weather_req}"
            )
            
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
            days = 2 if "省级" in name else 5
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
            is_promoted = i < cutoff_index and score >= 32
            
            status_str = f"{Fore.GREEN}晋级{Style.RESET_ALL}" if is_promoted else f"{Fore.RED}淘汰{Style.RESET_ALL}"
            print(f"{s.name:<10} {score:.1f}      {status_str}")
            
            s.apply_stress(15) # 比赛本身带来的压力
            
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
            clear_screen()
            print(f"--- {contest_name} 第 {day}/{days} 天 ---")
            print("你可以安排今天的活动：")
            print("1. 考前突击 (理论提升，压力增高)")
            print("2. 考场社交 (天文常识提升，压力小幅降低，可能触发事件)")
            print("3. 考前放松 (压力大幅降低)")
            print("4. 勘测考场 (仅限观测日，观测小幅提升)")
            
            choice = input("请选择活动 (1-4): ")
            
            social_factor = 1.0
            if choice == "2":
                # 检查社牛天赋
                if any("社牛" in [t.name for t in s.traits] for s in students):
                    self.log(f"{Fore.YELLOW}因'社牛'同学存在，社交效果翻倍！{Style.RESET_ALL}")
                    social_factor = 2.0
            
            if choice == "1":
                self.log("大家在酒店疯狂刷题...")
                for s in students: 
                    s.train({"理论": EFFECT_MAP["小幅提升"]}, 1.0)
                    s.apply_stress(EFFECT_MAP["压力小幅增高"])
            elif choice == "2":
                self.log("与其他学校的同学交流...")
                for s in students:
                    s.train({"天文常识": EFFECT_MAP["小幅提升"]}, social_factor)
                    s.apply_stress(EFFECT_MAP["压力小幅降低"] * social_factor)
                
                event = random.choice([
                    "遇到了传说中的大佬，深受打击（压力增高）。", 
                    "遇到了可爱的妹子/汉子，心情愉悦（压力降低）。",
                    "听说隔壁学校全员重感冒，暗自窃喜（压力降低）。"
                ])
                self.log(f"社交事件：{event}")
                if "打击" in event: [s.apply_stress(EFFECT_MAP["压力小幅增高"]) for s in students]
                if "愉悦" in event: [s.apply_stress(EFFECT_MAP["压力小幅降低"]) for s in students]
                if "窃喜" in event: [s.apply_stress(EFFECT_MAP["压力小幅降低"]) for s in students]
            elif choice == "3":
                self.log("大家去吃了一顿好的...")
                for s in students: s.apply_stress(EFFECT_MAP["压力大幅降低"])
            elif choice == "4":
                # 省赛和国决都有观测考试
                if "省级" in contest_name or "国决" in contest_name:
                    self.log("去考场踩点...")
                    for s in students: s.train({"观测": EFFECT_MAP["小幅提升"]}, 1.0)
                else:
                    self.log("今天没有观测项目，踩点没用，大家在寒风中白站了一小时。")
                    for s in students: s.apply_stress(EFFECT_MAP["压力小幅增高"])
            
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

        self.run_contest_logic("CNAO 国初", {"理论": 0.7, "天文常识": 0.3}, 0.2, honor_level="国初") 

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
    print("【声明】本游戏纯属虚构，由AI生成。\n\n作者：@Luca\nLuogu：https://www.luogu.com.cn/user/62659\nGithub：https://github.com/YuanzeSun\n\n本项目代码仓库（获取最新更新，游戏相关介绍）：https://github.com/YuanzeSun/Astro_Chaos")
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

if __name__ == "__main__":
    main()