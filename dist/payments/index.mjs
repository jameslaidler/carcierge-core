// src/payments/calculations.ts
var MINIMUM_FINANCE_AMOUNT = 5e3;
function determineRate(creditScore, vehicle, interestRates, requestedTerm) {
  const matchingRates = interestRates.filter(
    (rate) => rate.score === creditScore && rate.year <= vehicle.year && (!rate.max_mileage || vehicle.mileage <= rate.max_mileage)
  );
  const applicableRate = matchingRates.reduce(
    (best, rate) => !best || rate.year > best.year ? rate : best,
    null
  );
  return {
    rate: applicableRate?.rate ?? 5,
    maxTerm: applicableRate?.max_term ?? requestedTerm,
    isFinanceable: !!applicableRate,
    effectiveRate: applicableRate?.rate ?? 5,
    effectiveTerm: Math.min(requestedTerm, applicableRate?.max_term ?? requestedTerm)
  };
}
function calculateTaxAmount(params) {
  const { salePrice, discountRequest, tradeInValue, tax1, tax2 } = params;
  const priceAfterDiscount = salePrice - discountRequest;
  const taxableAmount = Math.max(0, priceAfterDiscount - tradeInValue);
  const totalTaxRate = (tax1 + tax2) / 100;
  return taxableAmount * totalTaxRate;
}
function calculateNetTradeValue(tradeInValue, lien) {
  return tradeInValue - (lien || 0);
}
function calculateBaseMonthlyPayment(principal, term, annualRate) {
  if (annualRate === 0) {
    return principal / term;
  }
  const monthlyRate = annualRate / 100 / 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
}
function convertToFrequency(monthlyAmount, frequency) {
  switch (frequency) {
    case "weekly":
      return monthlyAmount * 12 / 52;
    case "biweekly":
      return monthlyAmount * 12 / 26;
    case "monthly":
      return monthlyAmount;
    default:
      return monthlyAmount;
  }
}
function calculateTotalCost(params) {
  const { payment, frequency, term, downPayment } = params;
  const numberOfPayments = frequency === "weekly" ? term * 52 / 12 : frequency === "biweekly" ? term * 26 / 12 : term;
  return payment * numberOfPayments + downPayment;
}
function calculateBorrowCost(salePrice, discountRequest, downPayment, tradeInValue, term, rate) {
  const principal = salePrice - discountRequest - downPayment - tradeInValue;
  if (principal <= 0 || rate === 0) return 0;
  const monthlyRate = rate / 100 / 12;
  const totalPayments = term * monthlyRate * principal / (1 - Math.pow(1 + monthlyRate, -term));
  return Math.max(0, totalPayments - principal);
}
function calculatePayment(params) {
  const { vehicle, paymentConfig, docFee, tax1, tax2, interestRates = [] } = params;
  const includeTaxes = paymentConfig.includeTaxes ?? false;
  const netTradeValue = paymentConfig.tradeInValue ? calculateNetTradeValue(paymentConfig.tradeInValue, paymentConfig.lien ?? 0) : 0;
  const basePrice = vehicle.salePrice + docFee;
  const priceAfterDiscount = basePrice - (paymentConfig.discountRequest ?? 0);
  const priceAfterTrade = Math.max(0, priceAfterDiscount - netTradeValue);
  const priceAfterDown = priceAfterTrade - (paymentConfig.downPayment ?? 0);
  const taxAmount = includeTaxes ? calculateTaxAmount({
    salePrice: vehicle.salePrice,
    discountRequest: paymentConfig.discountRequest ?? 0,
    tradeInValue: paymentConfig.tradeInValue ?? 0,
    tax1,
    tax2
  }) : 0;
  const priceBeforeTax = priceAfterDown;
  const priceAfterTax = priceBeforeTax + taxAmount;
  const amountFinanced = priceAfterTax;
  const rateInfo = determineRate(
    paymentConfig.creditScore,
    vehicle,
    interestRates,
    paymentConfig.term
  );
  const monthlyPayment = calculateBaseMonthlyPayment(
    amountFinanced,
    rateInfo.effectiveTerm,
    rateInfo.effectiveRate
  );
  const payment = monthlyPayment ? convertToFrequency(monthlyPayment, paymentConfig.frequency) : null;
  const totalCost = payment ? calculateTotalCost({
    payment,
    frequency: paymentConfig.frequency,
    term: rateInfo.effectiveTerm,
    downPayment: paymentConfig.downPayment ?? 0
  }) : 0;
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
function calculateCashPrice(params) {
  const { vehicle, paymentConfig, docFee, tax1, tax2 } = params;
  const includeTaxes = paymentConfig.includeTaxes ?? false;
  const netTradeValue = paymentConfig.tradeInValue ? calculateNetTradeValue(paymentConfig.tradeInValue, paymentConfig.lien ?? 0) : 0;
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
function calculateMaxDiscount(salePrice, spanPercentage = 0.1) {
  const rawDiscount = salePrice * spanPercentage;
  return Math.round(rawDiscount / 100) * 100;
}
function getMaxTerm(vehicle, creditScore, interestRates) {
  const rateInfo = determineRate(creditScore, vehicle, interestRates, 999);
  return rateInfo.maxTerm;
}
function getAvailableTerms(vehicle, creditScore, interestRates, allTerms = [24, 36, 48, 60, 72, 84]) {
  const maxTerm = getMaxTerm(vehicle, creditScore, interestRates);
  return allTerms.filter((term) => term <= maxTerm);
}
function isVehicleFinanceable(vehicle, creditScore, interestRates) {
  const rateInfo = determineRate(creditScore, vehicle, interestRates, 60);
  return rateInfo.isFinanceable;
}
function getRateForVehicle(vehicle, creditScore, interestRates, requestedTerm) {
  const rateInfo = determineRate(creditScore, vehicle, interestRates, requestedTerm);
  return {
    rate: rateInfo.effectiveRate,
    effectiveTerm: rateInfo.effectiveTerm,
    isFinanceable: rateInfo.isFinanceable
  };
}

// src/payments/format.ts
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
}
function formatWholeNumber(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
function formatNumber(amount) {
  return new Intl.NumberFormat("en-US").format(amount);
}
function formatFrequencyLabel(frequency) {
  switch (frequency) {
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Bi-weekly";
    case "monthly":
      return "Monthly";
    default:
      return frequency;
  }
}
function formatCreditLabel(score) {
  switch (score) {
    case "poor":
      return "Poor";
    case "fair":
      return "Fair";
    case "good":
      return "Good";
    case "excellent":
      return "Excellent";
    default:
      return score;
  }
}
export {
  MINIMUM_FINANCE_AMOUNT,
  calculateBorrowCost,
  calculateCashPrice,
  calculateMaxDiscount,
  calculateNetTradeValue,
  calculatePayment,
  calculateTaxAmount,
  convertToFrequency,
  determineRate,
  formatCreditLabel,
  formatCurrency,
  formatFrequencyLabel,
  formatNumber,
  formatWholeNumber,
  getAvailableTerms,
  getMaxTerm,
  getRateForVehicle,
  isVehicleFinanceable
};
//# sourceMappingURL=index.mjs.map