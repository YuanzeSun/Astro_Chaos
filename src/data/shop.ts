export interface ShopItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  /** 解锁的活动 */
  unlocks?: string;
  needs?: string;
}

export const SHOP: ShopItem[] = [
  { id: "stellarium", name: "Stellarium", price: 0, desc: "开源星图软件，免费。认星训练效果更好。" },
  { id: "binoculars", name: "7×50 双筒", price: 380, desc: "入门神器。户外观测收益提高。" },
  { id: "baader", name: "巴德膜", price: 120, desc: "一张保命的膜。解锁太阳观测。", unlocks: "solar" },
  { id: "warmers", name: "一箱暖宝宝", price: 60, desc: "贴在镜头上防结露，贴在身上防冻。冬天户外不再遭罪。" },
  { id: "repellent", name: "驱蚊液", price: 40, desc: "夏天观测不再献血。" },
  { id: "papers", name: "历年真题集", price: 260, desc: "刷真题收益提高。" },
  { id: "dino", name: "马门溪龙玩偶", price: 88, desc: "社团吉祥物。考前摸一摸，发挥稳一点。" },
  { id: "calculators", name: "一批函数计算器", price: 600, desc: "考试不怕没电。理论发挥更稳。" },
  { id: "dob", name: "八寸道布森", price: 2400, desc: "大口径，便宜，重。解锁深空巡天。", unlocks: "deepSky" },
  { id: "camera", name: "天文相机", price: 2600, desc: "制冷 CMOS。解锁变星测光。", unlocks: "photometry" },
  { id: "mount", name: "赤道仪", price: 4200, desc: "跟踪稳了，摄影才有意义。需要先有天文相机。解锁通宵拍星。", unlocks: "astroPhoto", needs: "camera" },
  { id: "aircon", name: "活动室空调", price: 3200, desc: "夏天不再是蒸笼。每周压力恢复更快。" },
  { id: "observatory", name: "楼顶小圆顶", price: 9000, desc: "学校楼顶自己的圆顶。所有观测收益提高，器材损耗减半。" },
];

export const SHOP_MAP: Record<string, ShopItem> = Object.fromEntries(SHOP.map((i) => [i.id, i]));
