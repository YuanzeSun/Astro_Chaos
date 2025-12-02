GAME_TITLE = "天文闹赛 (Astronomy Chaos Competition)"
WEATHERS = ["晴朗", "少云", "多云", "阴天", "大雨"]
ATTRS = ["理论", "观测", "实测", "天文常识"]
MONTHS = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7]
WEEKS_PER_MONTH = 4
MAX_YEARS = 3
MONTHLY_FUNDS = 500 
NUM_WEEKLY_OPTIONS = 5 # 每周可选行动列表长度

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
EFFECT_MAP = {
    # 提升/降低数值
    "大幅提升": 4.0,  
    "提升": 3.0,      
    "小幅提升": 1.5,   
    "轻微提升": 1.0,   

    "大幅下降": -4.0,  
    "下降": -3.0,      
    "小幅下降": -1.0,
    "轻微下降": -0.5,

    # 压力数值 
    "压力大幅增高": 15.0,  
    "压力增高": 8.0,     
    "压力小幅增高": 3.0,   
    "压力大幅降低": -15.0, "压力降低": -8.0, "压力小幅降低": -3.0,
    # 淘汰惩罚
    "淘汰增压": 15.0,
}

GRADE_MAP = {
    95: "S+", 90: "S", 85: "A+", 80: "A", 75: "B+", 70: "B", 
    65: "B-", 60: "C+", 55: "C", 50: "C-", 45: "D+", 40: "D", 
    30: "D-", 20: "E", 0: "F"
}

FULL_TRAINING_POOL = [
    # 核心训练 
    {"name": "模拟笔试", "cost": 100, "stress_desc": "压力增高", "gains_desc": "理论提升, 实测小幅提升", "stress": EFFECT_MAP["压力增高"], "gains": {"理论": EFFECT_MAP["提升"], "实测": EFFECT_MAP["小幅提升"]}},
    {"name": "竞赛真题", "cost": 50, "stress_desc": "压力大幅增高", "gains_desc": "理论大幅提升, 天文常识小幅提升", "stress": EFFECT_MAP["压力大幅增高"], "gains": {"理论": EFFECT_MAP["大幅提升"], "天文常识": EFFECT_MAP["小幅提升"]}},
    {"name": "外出观测", "cost": 400, "stress_desc": "压力小幅增高", "gains_desc": "观测大幅提升, 实测小幅提升", "stress": EFFECT_MAP["压力小幅增高"], "gains": {"观测": EFFECT_MAP["大幅提升"], "实测": EFFECT_MAP["小幅提升"]}, "req_weather": ["晴朗", "少云"]},
    {"name": "数据处理", "cost": 150, "stress_desc": "压力增高", "gains_desc": "实测提升, 理论轻微提升", "stress": EFFECT_MAP["压力增高"], "gains": {"实测": EFFECT_MAP["提升"], "理论": EFFECT_MAP["轻微提升"]}},
    {"name": "复现论文", "cost": 0, "stress_desc": "压力大幅增高", "gains_desc": "实测大幅提升，理论小幅提升", "stress": EFFECT_MAP["压力大幅增高"], "gains": {"实测": EFFECT_MAP["大幅提升"], "理论": EFFECT_MAP["小幅提升"]}},
    {"name": "看李老师视频", "cost": 200, "stress_desc": "压力小幅降低", "gains_desc": "天文常识提升", "stress": EFFECT_MAP["压力小幅降低"], "gains": {"天文常识": EFFECT_MAP["提升"]}},

    # 减压/赚钱 
    {"name": "专业按摩", "cost": 800, "stress_desc": "压力大幅降低", "gains_desc": "天文常识轻微提升", "stress": EFFECT_MAP["压力大幅降低"], "gains": {"天文常识": EFFECT_MAP["轻微提升"]}}, 
    {"name": "兽聚", "cost": 800, "stress_desc": "压力大幅降低", "gains_desc": "天文常识小幅下降", "stress": EFFECT_MAP["压力大幅降低"], "gains": {"天文常识": EFFECT_MAP["小幅下降"]}, "req_attr": "Furry"}, 
    {"name": "女装晚会", "cost": 500, "stress_desc": "压力大幅降低", "gains_desc": "天文常识小幅下降", "stress": EFFECT_MAP["压力大幅降低"], "gains": {"天文常识": EFFECT_MAP["小幅下降"]}, "req_attr": "女装大佬"}, 
    {"name": "观看科普影片", "cost": 200, "stress_desc": "压力降低", "gains_desc": "天文常识大幅提升", "stress": EFFECT_MAP["压力降低"], "gains": {"天文常识": EFFECT_MAP["大幅提升"]}},
    
    # 综合训练
    {"name": "跨学科研讨", "cost": 0, "stress_desc": "压力增高", "gains_desc": "理论小幅提升, 实测小幅提升", "stress": EFFECT_MAP["压力增高"], "gains": {"理论": EFFECT_MAP["小幅提升"], "实测": EFFECT_MAP["小幅提升"]}},
    {"name": "撰写科普文", "cost": 0, "stress_desc": "压力增高", "gains_desc": "天文常识提升, 理论小幅提升", "stress": EFFECT_MAP["压力增高"], "gains": {"天文常识": EFFECT_MAP["提升"], "理论": EFFECT_MAP["小幅提升"]}},
    {"name": "PSP项目", "cost": 500, "stress_desc": "压力小幅增高", "gains_desc": "观测提升, 实测提升", "stress": EFFECT_MAP["压力小幅增高"], "gains": {"观测": EFFECT_MAP["提升"], "实测": EFFECT_MAP["提升"]}},
    {"name": "计算轨道", "cost": 100, "stress_desc": "压力大幅增高", "gains_desc": "实测大幅提升, 理论提升", "stress": EFFECT_MAP["压力大幅增高"], "gains": {"实测": EFFECT_MAP["大幅提升"], "理论": EFFECT_MAP["提升"]}},
    {"name": "星图识别训练", "cost": 100, "stress_desc": "压力增高", "gains_desc": "观测大幅提升, 天文常识提升", "stress": EFFECT_MAP["压力增高"], "gains": {"观测": EFFECT_MAP["大幅提升"], "天文常识": EFFECT_MAP["提升"]}},
    {"name": "科普报告", "cost": 150, "stress_desc": "压力小幅降低", "gains_desc": "理论提升, 天文常识提升", "stress": EFFECT_MAP["压力小幅降低"], "gains": {"理论": EFFECT_MAP["提升"], "天文常识": EFFECT_MAP["提升"]}},
    
    # 新增训练
    {"name": "户外生存", "cost": 500, "stress_desc": "压力降低", "gains_desc": "观测提升, 天文常识提升", "stress": EFFECT_MAP["压力降低"], "gains": {"观测": EFFECT_MAP["提升"], "天文常识": EFFECT_MAP["提升"]}},
    {"name": "哲学思辨", "cost": 0, "stress_desc": "压力小幅增高", "gains_desc": "理论轻微提升", "stress": EFFECT_MAP["压力小幅增高"], "gains": {"理论": EFFECT_MAP["轻微提升"]}},
    {"name": "观看流星雨", "cost": 400, "stress_desc": "压力降低", "gains_desc": "观测提升", "stress": EFFECT_MAP["压力降低"], "gains": {"观测": EFFECT_MAP["提升"]}, "req_weather": ["晴朗", "少云"]},
]

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
    Trait("民科", "总能提出惊世骇俗的理论，天文常识学习慢。", 
          lambda student: student.learning_rates.__setitem__("天文常识", student.learning_rates["天文常识"] * 0.6)), 
    Trait("卷王", "每晚只睡4小时，所有学习效率微升。", 
          lambda student: [student.learning_rates.update({k: v*1.1}) for k,v in student.learning_rates.items()]),
    Trait("欧皇", "考试运气极好（正向随机波动更大）。", 
          None), 
    Trait("非酋", "考试运气极差（负向随机波动更大）。", 
          None),
    Trait("迷妹", "崇拜大佬。抗压能力较低，但追随大佬理论学习速度较快", 
          lambda student: (student.__setattr__('stress_scale', student.stress_scale * 0.8),
                           student.learning_rates.__setitem__("理论", student.learning_rates["理论"] * 1.2))),
    Trait("理论奇才", "痴迷理论推导，初始理论能力强，学习效率高。", 
          lambda student: (student.attrs.__setitem__("理论", max(student.attrs["理论"], 60)),
                           student.learning_rates.__setitem__("理论", student.learning_rates["理论"] * 1.3))),
    Trait("性向独特", "这名学生的性取向有一点……怪。但不碍事", 
          None), 
    Trait("嗜睡体质", "每天需要睡够10小时，抗压能力强，但训练效率普遍降低。", 
          lambda student: (student.__setattr__('stress_scale', student.stress_scale * 0.7),
                           student.learning_rates.__setitem__("理论", student.learning_rates["理论"] * 0.8),
                           student.learning_rates.__setitem__("观测", student.learning_rates["观测"] * 0.8))),
    Trait("数据大师", "痴迷于三维建模，初始实测能力高，理论学习效率略有提升。", 
          lambda student: (student.attrs.__setitem__("实测", max(student.attrs["实测"], 50)), 
                           student.learning_rates.__setitem__("理论", student.learning_rates["理论"] * 1.1))),
    Trait("口胡大师", "天文常识储备惊人，但一到考试就发挥失常。", 
          lambda student: student.attrs.__setitem__("天文常识", max(student.attrs["天文常识"], 55))),
    Trait("女装大佬", "喜欢男扮女装，社团气氛活跃（压力敏感度略低）。", 
          lambda student: student.__setattr__('stress_scale', student.stress_scale * 0.9)), 
    Trait("外星人爱好者", "相信外星生命存在，理论学习效率略高。", 
          lambda student: student.learning_rates.__setitem__("理论", student.learning_rates["理论"] * 1.1)),
    Trait("散光", "观测提升速度慢，但对其他方面影响不大。", 
          lambda student: student.learning_rates.__setitem__("观测", student.learning_rates["观测"] * 0.7)),
    Trait("死宅", "抗压能力较低，但天文常识学习快。", 
          lambda student: (student.__setattr__('stress_scale', student.stress_scale * 1.2), 
                           student.learning_rates.__setitem__("天文常识", student.learning_rates["天文常识"] * 1.2))), 
]

