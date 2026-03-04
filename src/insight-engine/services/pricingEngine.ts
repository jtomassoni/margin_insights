/**
 * Suggested price = cost / (1 - target_margin)
 * target_margin as decimal (e.g. 0.75 for 75%).
 */
export const DEFAULT_TARGET_MARGIN = 0.75;
/** Flag as caution when suggested increase would exceed this %. */
export const CAUTION_INCREASE_PCT = 15;

/** Price needed to achieve target margin. */
export const priceAtTargetMargin = (cost: number, targetMargin: number): number =>
  cost <= 0 ? 0 : cost / (1 - targetMargin);

export interface PriceSuggestion {
  current_price: number;
  cost: number;
  current_margin_pct: number;
  target_margin_pct: number;
  suggested_price: number;
  suggested_margin_pct: number;
  increase_pct: number;
  caution: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const suggestPrice = (
  cost: number,
  currentPrice: number,
  targetMargin: number = DEFAULT_TARGET_MARGIN
): PriceSuggestion => {
  if (cost <= 0) {
    return {
      current_price: currentPrice,
      cost,
      current_margin_pct: 0,
      target_margin_pct: targetMargin * 100,
      suggested_price: currentPrice,
      suggested_margin_pct: 0,
      increase_pct: 0,
      caution: false,
    };
  }

  const suggested_price = round2(cost / (1 - targetMargin));
  const suggested_margin_pct = suggested_price > 0 ? ((suggested_price - cost) / suggested_price) * 100 : 0;
  const current_margin_pct = currentPrice > 0 ? ((currentPrice - cost) / currentPrice) * 100 : 0;
  const increase_pct = currentPrice > 0 ? ((suggested_price - currentPrice) / currentPrice) * 100 : 0;
  const caution = increase_pct > CAUTION_INCREASE_PCT;

  return {
    current_price: currentPrice,
    cost,
    current_margin_pct: round2(current_margin_pct),
    target_margin_pct: targetMargin * 100,
    suggested_price,
    suggested_margin_pct: round2(suggested_margin_pct),
    increase_pct: round2(increase_pct),
    caution,
  };
};
