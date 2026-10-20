import type { GameState } from "../engine/types";
import { SHOP } from "../data/shop";

export function ShopModal({ g, onBuy, onClose }: { g: GameState; onBuy: (id: string) => void; onClose: () => void }) {
  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="shop-title" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <h2 id="shop-title">器材店</h2>
        <p className="meta">
          账上 <span className="num">¥{g.money}</span>
        </p>
        <div className="shop">
          {SHOP.map((item) => {
            const owned = g.items.includes(item.id);
            const blocked = item.needs && !g.items.includes(item.needs);
            return (
              <div key={item.id} className="ware">
                <b>{item.name}</b>
                <button type="button" className="ghost" onClick={() => onBuy(item.id)} disabled={owned || Boolean(blocked) || g.money < item.price}>
                  {owned ? "已有" : item.price ? `¥${item.price}` : "免费"}
                </button>
                <p>{item.desc}</p>
              </div>
            );
          })}
        </div>
        <div className="card-foot">
          <button type="button" className="ghost" onClick={onClose}>
            走了
          </button>
        </div>
      </div>
    </div>
  );
}
