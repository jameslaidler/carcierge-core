// ============================================
// TRADE-IN CALCULATIONS
// ============================================

import type { TradeInSubmission } from '../types';

/**
 * Calculate net trade value (trade-in minus lien)
 */
export function calculateNetTradeValue(tradeInValue: number, lien: number): number {
  return Math.max(0, tradeInValue - (lien || 0));
}

/**
 * Calculate net trade value from a submission
 */
export function getNetTradeFromSubmission(submission: TradeInSubmission): number {
  return calculateNetTradeValue(submission.desiredAmount, submission.lien);
}

/**
 * Apply dealer margin to asking price
 */
export function applyDealerMargin(askingPrice: number, margin: number = 0.15): number {
  return Math.round(askingPrice * (1 - margin));
}
