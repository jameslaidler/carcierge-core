// ============================================
// @carcierge/core
// Core business logic for Carcierge widgets
// ============================================

// All types
export * from './types';

// Trade-in module
export {
  fetchMakes,
  fetchModels,
  getValuation,
  generateYears,
  calculateNetTradeValue,
  getNetTradeFromSubmission,
  applyDealerMargin,
  type TradeInApiConfig,
} from './trade-in';

// Payments module
export {
  determineRate,
  calculateTaxAmount,
  convertToFrequency,
  calculateBorrowCost,
  calculatePayment,
  calculatePaymentWithAnnualRateOverride,
  calculateCashPrice,
  calculateMaxDiscount,
  getMaxTerm,
  getAvailableTerms,
  isVehicleFinanceable,
  getRateForVehicle,
  formatCurrency,
  formatWholeNumber,
  formatNumber,
  formatFrequencyLabel,
  formatCreditLabel,
  MINIMUM_FINANCE_AMOUNT,
} from './payments';

// Product Config module
export {
  calculateMaxDiscountFromConfig,
  getTotalTaxRate,
  type ProductConfig,
  type EcommWidgetConfig,
} from './product-config';

// Doc Fees module
export {
  getApplicableFees,
  getTotalDocFee,
  type DocFee,
  type ApplicableFee,
  type DocFeeResult,
  type VehicleCondition,
  type DealType,
} from './doc-fees';

// Incentives module
export * from './incentives';

// Offers module
export {
  submitOffer,
  buildOfferPayload,
  validateCustomerInfo,
  isValid,
  formatPhone,
  type OfferApiConfig,
  type OfferPayload,
  type ValidationErrors,
  type CustomerInfo,
} from './offers';
