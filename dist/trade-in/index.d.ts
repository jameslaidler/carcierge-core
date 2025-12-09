import { M as Make, e as Model, T as TradeInVehicle, d as TradeInValuation, c as TradeInSubmission } from '../types-BCSRb3Fo.js';

interface TradeInApiConfig {
    baseUrl?: string;
    apiKey: string;
    tradeInMargin?: number;
}
declare function fetchMakes(config: TradeInApiConfig): Promise<Make[]>;
declare function fetchModels(config: TradeInApiConfig, year: number, makeId: number): Promise<Model[]>;
declare function getValuation(config: TradeInApiConfig, vehicle: TradeInVehicle): Promise<TradeInValuation>;
declare function generateYears(startYear?: number): number[];

/**
 * Calculate net trade value (trade-in minus lien)
 */
declare function calculateNetTradeValue(tradeInValue: number, lien: number): number;
/**
 * Calculate net trade value from a submission
 */
declare function getNetTradeFromSubmission(submission: TradeInSubmission): number;
/**
 * Apply dealer margin to asking price
 */
declare function applyDealerMargin(askingPrice: number, margin?: number): number;

export { type TradeInApiConfig, applyDealerMargin, calculateNetTradeValue, fetchMakes, fetchModels, generateYears, getNetTradeFromSubmission, getValuation };
