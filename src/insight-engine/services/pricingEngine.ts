/**
 * Suggested price = cost / (1 - target_margin)
 * target_margin as decimal (e.g. 0.75 for 75%).
 *
 * The 12% cap: we limit the *suggested* price increase to MAX_INCREASE_PCT (12%) per item
 * so we don't recommend a 40% hike in one step — it's a safety/UX choice for "first step" actions.
 * Loss-to-target ($) is always computed at the full target margin (see priceAtTargetMargin).
 */
export const DEFAULT_TARGET_MARGIN = 0.75;
/** Max % we suggest raising price in one step; items needing more are flagged "Capped +12%". */
export const MAX_INCREASE_PCT = 12;
/** Flag as caution when suggested increase would exceed this %. */
export const CAUTION_INCREASE_PCT = 15;

/** Price needed to achieve target margin (no cap). Use for "how much we're losing to reach 75%". */
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
  capped: boolean;
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
      capped: false,
      caution: false,
    };
  }

  const rawSuggested = cost / (1 - targetMargin);
  const maxPrice = currentPrice * (1 + MAX_INCREASE_PCT / 100);
  const capped = rawSuggested > maxPrice;
  const suggested_price = capped ? round2(maxPrice) : round2(rawSuggested);
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
    capped,
    caution,
  };
};
