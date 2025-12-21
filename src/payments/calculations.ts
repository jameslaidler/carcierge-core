// ============================================
// PAYMENT CALCULATIONS
// Core math for automotive financing
// ============================================

import type { 
  CreditScore, 
  InterestRate, 
  VehicleInfo, 
  PaymentConfig, 
  PaymentResult,
  PaymentFrequency 
} from '../types';

export const MINIMUM_FINANCE_AMOUNT = 5000;

// ============================================
// RATE DETERMINATION
// ============================================

interface RateInfo {
  rate: number;
  maxTerm: number;
  isFinanceable: boolean;
  effectiveRate: number;
  effectiveTerm: number;
}

export function determineRate(
  creditScore: CreditScore,
  vehicle: VehicleInfo,
  interestRates: InterestRate[],
  requestedTerm: number
): RateInfo {
  // Filter to matching score and mileage
  const matchingRates = interestRates.filter(rate => 
    rate.score === creditScore &&
    rate.year <= vehicle.year &&
    (!rate.max_mileage || vehicle.mileage <= rate.max_mileage)
  );

  // Find the best match (highest year that's still <= vehicle year)
  const applicableRate = matchingRates.reduce<InterestRate | null>(
    (best, rate) => (!best || rate.year > best.year) ? rate : best,
    null
  );

  const maxTerm = applicableRate?.max_term ?? requestedTerm;
  const termIsAllowed = typeof applicableRate?.max_term === 'number'
    ? requestedTerm <= applicableRate.max_term
    : true;

  const isFinanceable = !!applicableRate && termIsAllowed;

  return {
    rate: applicableRate?.rate ?? 5,
    maxTerm,
    isFinanceable,
    effectiveRate: applicableRate?.rate ?? 5,
    effectiveTerm: requestedTerm
  };
}

// ============================================
// TAX CALCULATION
// ============================================

export function calculateTaxAmount(params: {
  salePrice: number;
  discountRequest: number;
  tradeInValue: number;
  tax1: number;
  tax2: number;
}): number {
  const { salePrice, discountRequest, tradeInValue, tax1, tax2 } = params;
  const priceAfterDiscount = salePrice - discountRequest;
  const taxableAmount = Math.max(0, priceAfterDiscount - tradeInValue);
  const totalTaxRate = (tax1 + tax2) / 100;
  return taxableAmount * totalTaxRate;
}

// ============================================
// TRADE VALUE
// ============================================

export function calculateNetTradeValue(tradeInValue: number, lien: number): number {
  return tradeInValue - (lien || 0);
}

// ============================================
// MONTHLY PAYMENT (BASE)
// ============================================

function calculateBaseMonthlyPayment(
  principal: number,
  term: number,
  annualRate: number
): number {
  if (annualRate === 0) {
    return principal / term;
  }

  const monthlyRate = (annualRate / 100) / 12;
  return principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, term)) / 
    (Math.pow(1 + monthlyRate, term) - 1);
}

// ============================================
// FREQUENCY CONVERSION
// ============================================

export function convertToFrequency(monthlyAmount: number, frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'weekly':
      return monthlyAmount * 12 / 52;
    case 'biweekly':
      return monthlyAmount * 12 / 26;
    case 'monthly':
      return monthlyAmount;
    default:
      return monthlyAmount;
  }
}

// ============================================
// TOTAL COST
// ============================================

function calculateTotalCost(params: {
  payment: number;
  frequency: PaymentFrequency;
  term: number;
  downPayment: number;
}): number {
  const { payment, frequency, term, downPayment } = params;
  const numberOfPayments = frequency === 'weekly' ? term * 52/12 :
                          frequency === 'biweekly' ? term * 26/12 : 
                          term;
  return (payment * numberOfPayments) + downPayment;
}

// ============================================
// BORROW COST (INTEREST PAID)
// ============================================

export function calculateBorrowCost(
  salePrice: number,
  discountRequest: number,
  downPayment: number,
  tradeInValue: number,
  term: number,
  rate: number
): number {
  const principal = salePrice - discountRequest - downPayment - tradeInValue;
  if (principal <= 0 || rate === 0) return 0;
  
  const monthlyRate = (rate / 100) / 12;
  const totalPayments = term * monthlyRate * principal / (1 - Math.pow(1 + monthlyRate, -term));
  return Math.max(0, totalPayments - principal);
}

// ============================================
// MAIN PAYMENT CALCULATION
// ============================================

export function calculatePayment(params: {
  vehicle: VehicleInfo;
  paymentConfig: PaymentConfig;
  docFee: number;
  tax1: number;
  tax2: number;
  interestRates?: InterestRate[];
}): PaymentResult {
  const { vehicle, paymentConfig, docFee, tax1, tax2, interestRates = [] } = params;
  const includeTaxes = paymentConfig.includeTaxes ?? false;
  
  // Calculate net trade value
  const netTradeValue = paymentConfig.tradeInValue ? 
    calculateNetTradeValue(paymentConfig.tradeInValue, paymentConfig.lien ?? 0) : 
    0;

  // Base price with doc fee
  const basePrice = vehicle.salePrice + docFee;

  // Apply discount
  const priceAfterDiscount = basePrice - (paymentConfig.discountRequest ?? 0);

  // Apply net trade and down payment
  const priceAfterTrade = Math.max(0, priceAfterDiscount - netTradeValue);
  const priceAfterDown = priceAfterTrade - (paymentConfig.downPayment ?? 0);

  // Calculate tax if needed
  const taxAmount = includeTaxes ? 
    calculateTaxAmount({
      salePrice: vehicle.salePrice,
      discountRequest: paymentConfig.discountRequest ?? 0,
      tradeInValue: paymentConfig.tradeInValue ?? 0,
      tax1,
      tax2
    }) : 0;

  // Final amounts
  const priceBeforeTax = priceAfterDown;
  const priceAfterTax = priceBeforeTax + taxAmount;
  const amountFinanced = priceAfterTax;

  // Get rate info
  const rateInfo = determineRate(
    paymentConfig.creditScore,
    vehicle,
    interestRates,
    paymentConfig.term
  );

  if (!rateInfo.isFinanceable) {
    return {
      payment: null,
      amountFinanced,
      totalCost: 0,
      taxAmount,
      priceBeforeTax,
      priceAfterTax,
      isFinanceable: false,
      effectiveRate: rateInfo.effectiveRate,
      effectiveTerm: rateInfo.effectiveTerm,
      borrowCost: 0,
      term: paymentConfig.term
    };
  }

  // Calculate monthly payment
  const monthlyPayment = calculateBaseMonthlyPayment(
    amountFinanced,
    rateInfo.effectiveTerm,
    rateInfo.effectiveRate
  );

  // Convert to selected frequency
  const payment = monthlyPayment ? 
    convertToFrequency(monthlyPayment, paymentConfig.frequency) : 
    null;

  // Calculate total cost
  const totalCost = payment ? 
    calculateTotalCost({
      payment,
      frequency: paymentConfig.frequency,
      term: rateInfo.effectiveTerm,
      downPayment: paymentConfig.downPayment ?? 0
    }) : 0;

  // Calculate borrow cost
  const borrowCost = calculateBorrowCost(
    vehicle.salePrice,
    paymentConfig.discountRequest ?? 0,
    paymentConfig.downPayment ?? 0,
    paymentConfig.tradeInValue ?? 0,
    paymentConfig.term,
    rateInfo.effectiveRate
  );

  return {
    payment,
    amountFinanced,
    totalCost,
    taxAmount,
    priceBeforeTax,
    priceAfterTax,
    isFinanceable: rateInfo.isFinanceable,
    effectiveRate: rateInfo.effectiveRate,
    effectiveTerm: rateInfo.effectiveTerm,
    borrowCost,
    term: paymentConfig.term
  };
}

export function calculatePaymentWithAnnualRateOverride(params: {
  vehicle: VehicleInfo;
  paymentConfig: PaymentConfig;
  docFee: number;
  tax1: number;
  tax2: number;
  annualRate: number;
}): PaymentResult {
  const { vehicle, paymentConfig, docFee, tax1, tax2, annualRate } = params;
  const includeTaxes = paymentConfig.includeTaxes ?? false;

  // Calculate net trade value
  const netTradeValue = paymentConfig.tradeInValue ?
    calculateNetTradeValue(paymentConfig.tradeInValue, paymentConfig.lien ?? 0) :
    0;

  // Base price with doc fee
  const basePrice = vehicle.salePrice + docFee;

  // Apply discount
  const priceAfterDiscount = basePrice - (paymentConfig.discountRequest ?? 0);

  // Apply net trade and down payment
  const priceAfterTrade = Math.max(0, priceAfterDiscount - netTradeValue);
  const priceAfterDown = priceAfterTrade - (paymentConfig.downPayment ?? 0);

  // Calculate tax if needed
  const taxAmount = includeTaxes ?
    calculateTaxAmount({
      salePrice: vehicle.salePrice,
      discountRequest: paymentConfig.discountRequest ?? 0,
      tradeInValue: paymentConfig.tradeInValue ?? 0,
      tax1,
      tax2
    }) : 0;

  // Final amounts
  const priceBeforeTax = priceAfterDown;
  const priceAfterTax = priceBeforeTax + taxAmount;
  const amountFinanced = priceAfterTax;

  // Calculate monthly payment
  const monthlyPayment = calculateBaseMonthlyPayment(
    amountFinanced,
    paymentConfig.term,
    annualRate
  );

  // Convert to selected frequency
  const payment = monthlyPayment ?
    convertToFrequency(monthlyPayment, paymentConfig.frequency) :
    null;

  // Calculate total cost
  const totalCost = payment ?
    calculateTotalCost({
      payment,
      frequency: paymentConfig.frequency,
      term: paymentConfig.term,
      downPayment: paymentConfig.downPayment ?? 0
    }) : 0;

  // Calculate borrow cost
  const borrowCost = calculateBorrowCost(
    vehicle.salePrice,
    paymentConfig.discountRequest ?? 0,
    paymentConfig.downPayment ?? 0,
    paymentConfig.tradeInValue ?? 0,
    paymentConfig.term,
    annualRate
  );

  return {
    payment,
    amountFinanced,
    totalCost,
    taxAmount,
    priceBeforeTax,
    priceAfterTax,
    isFinanceable: true,
    effectiveRate: annualRate,
    effectiveTerm: paymentConfig.term,
    borrowCost,
    term: paymentConfig.term
  };
}

// ============================================
// CASH PRICE CALCULATION
// ============================================

export function calculateCashPrice(params: {
  vehicle: VehicleInfo;
  paymentConfig: Partial<PaymentConfig>;
  docFee: number;
  tax1: number;
  tax2: number;
}): number {
  const { vehicle, paymentConfig, docFee, tax1, tax2 } = params;
  const includeTaxes = paymentConfig.includeTaxes ?? false;
  
  const netTradeValue = paymentConfig.tradeInValue ? 
    calculateNetTradeValue(paymentConfig.tradeInValue, paymentConfig.lien ?? 0) : 
    0;

  const priceWithDocFee = vehicle.salePrice + docFee;
  const priceAfterDiscount = priceWithDocFee - (paymentConfig.discountRequest ?? 0);
  const priceAfterTradeIn = priceAfterDiscount - netTradeValue;
  const priceAfterDown = priceAfterTradeIn - (paymentConfig.downPayment ?? 0);
  
  if (includeTaxes) {
    const taxAmount = calculateTaxAmount({
      salePrice: vehicle.salePrice,
      discountRequest: paymentConfig.discountRequest ?? 0,
      tradeInValue: paymentConfig.tradeInValue ?? 0,
      tax1,
      tax2
    });
    return priceAfterDown + taxAmount;
  }
  
  return priceAfterDown;
}

// ============================================
// MAX DISCOUNT
// ============================================

export function calculateMaxDiscount(salePrice: number, spanPercentage: number = 0.1): number {
  const rawDiscount = salePrice * spanPercentage;
  return Math.round(rawDiscount / 100) * 100;
}

// ============================================
// VEHICLE FINANCING HELPERS
// ============================================

/**
 * Get the maximum allowed term for a vehicle/credit combo
 */
export function getMaxTerm(
  vehicle: VehicleInfo,
  creditScore: CreditScore,
  interestRates: InterestRate[]
): number {
  const rateInfo = determineRate(creditScore, vehicle, interestRates, 999);
  return rateInfo.maxTerm;
}

/**
 * Get available term options for a vehicle/credit combo
 * Returns only terms that are <= the max allowed term
 */
export function getAvailableTerms(
  vehicle: VehicleInfo,
  creditScore: CreditScore,
  interestRates: InterestRate[],
  allTerms: number[] = [24, 36, 48, 60, 72, 84]
): number[] {
  const maxTerm = getMaxTerm(vehicle, creditScore, interestRates);
  return allTerms.filter(term => term <= maxTerm);
}

/**
 * Check if a vehicle is financeable for a given credit score
 */
export function isVehicleFinanceable(
  vehicle: VehicleInfo,
  creditScore: CreditScore,
  interestRates: InterestRate[]
): boolean {
  const rateInfo = determineRate(creditScore, vehicle, interestRates, 60);
  return rateInfo.isFinanceable;
}

/**
 * Get the rate for a specific vehicle/credit/term combo
 */
export function getRateForVehicle(
  vehicle: VehicleInfo,
  creditScore: CreditScore,
  interestRates: InterestRate[],
  requestedTerm: number
): { rate: number; effectiveTerm: number; isFinanceable: boolean } {
  const rateInfo = determineRate(creditScore, vehicle, interestRates, requestedTerm);
  return {
    rate: rateInfo.effectiveRate,
    effectiveTerm: rateInfo.effectiveTerm,
    isFinanceable: rateInfo.isFinanceable
  };
}
