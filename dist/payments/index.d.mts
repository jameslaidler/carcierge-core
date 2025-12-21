import { C as CreditScore, V as VehicleInfo, I as InterestRate, P as PaymentFrequency, a as PaymentConfig, b as PaymentResult } from '../types-BCSRb3Fo.mjs';

declare const MINIMUM_FINANCE_AMOUNT = 5000;
interface RateInfo {
    rate: number;
    maxTerm: number;
    isFinanceable: boolean;
    effectiveRate: number;
    effectiveTerm: number;
}
declare function determineRate(creditScore: CreditScore, vehicle: VehicleInfo, interestRates: InterestRate[], requestedTerm: number): RateInfo;
declare function calculateTaxAmount(params: {
    salePrice: number;
    discountRequest: number;
    tradeInValue: number;
    tax1: number;
    tax2: number;
}): number;
declare function calculateNetTradeValue(tradeInValue: number, lien: number): number;
declare function convertToFrequency(monthlyAmount: number, frequency: PaymentFrequency): number;
declare function calculateBorrowCost(salePrice: number, discountRequest: number, downPayment: number, tradeInValue: number, term: number, rate: number): number;
declare function calculatePayment(params: {
    vehicle: VehicleInfo;
    paymentConfig: PaymentConfig;
    docFee: number;
    tax1: number;
    tax2: number;
    interestRates?: InterestRate[];
}): PaymentResult;
declare function calculatePaymentWithAnnualRateOverride(params: {
    vehicle: VehicleInfo;
    paymentConfig: PaymentConfig;
    docFee: number;
    tax1: number;
    tax2: number;
    annualRate: number;
}): PaymentResult;
declare function calculateCashPrice(params: {
    vehicle: VehicleInfo;
    paymentConfig: Partial<PaymentConfig>;
    docFee: number;
    tax1: number;
    tax2: number;
}): number;
declare function calculateMaxDiscount(salePrice: number, spanPercentage?: number): number;
/**
 * Get the maximum allowed term for a vehicle/credit combo
 */
declare function getMaxTerm(vehicle: VehicleInfo, creditScore: CreditScore, interestRates: InterestRate[]): number;
/**
 * Get available term options for a vehicle/credit combo
 * Returns only terms that are <= the max allowed term
 */
declare function getAvailableTerms(vehicle: VehicleInfo, creditScore: CreditScore, interestRates: InterestRate[], allTerms?: number[]): number[];
/**
 * Check if a vehicle is financeable for a given credit score
 */
declare function isVehicleFinanceable(vehicle: VehicleInfo, creditScore: CreditScore, interestRates: InterestRate[]): boolean;
/**
 * Get the rate for a specific vehicle/credit/term combo
 */
declare function getRateForVehicle(vehicle: VehicleInfo, creditScore: CreditScore, interestRates: InterestRate[], requestedTerm: number): {
    rate: number;
    effectiveTerm: number;
    isFinanceable: boolean;
};

declare function formatCurrency(amount: number): string;
declare function formatWholeNumber(amount: number): string;
declare function formatNumber(amount: number): string;
declare function formatFrequencyLabel(frequency: string): string;
declare function formatCreditLabel(score: string): string;

export { MINIMUM_FINANCE_AMOUNT, calculateBorrowCost, calculateCashPrice, calculateMaxDiscount, calculateNetTradeValue, calculatePayment, calculatePaymentWithAnnualRateOverride, calculateTaxAmount, convertToFrequency, determineRate, formatCreditLabel, formatCurrency, formatFrequencyLabel, formatNumber, formatWholeNumber, getAvailableTerms, getMaxTerm, getRateForVehicle, isVehicleFinanceable };
