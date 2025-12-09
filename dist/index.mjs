// src/trade-in/api.ts
var DEFAULT_CENTRAL_API_URL = "https://central-vehicles-node.vercel.app";
var DEFAULT_TRADE_IN_MARGIN = 0.15;
async function fetchMakes(config) {
  const baseUrl = config.baseUrl || DEFAULT_CENTRAL_API_URL;
  const response = await fetch(`${baseUrl}/api/makes`, {
    headers: {
      "X-API-Key": config.apiKey
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch makes: ${response.status}`);
  }
  return response.json();
}
async function fetchModels(config, year, makeId) {
  const baseUrl = config.baseUrl || DEFAULT_CENTRAL_API_URL;
  const response = await fetch(
    `${baseUrl}/api/models?model_year=${year}&make_id=${makeId}`,
    {
      headers: {
        "X-API-Key": config.apiKey
      }
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }
  return response.json();
}
async function getValuation(config, vehicle) {
  const baseUrl = config.baseUrl || DEFAULT_CENTRAL_API_URL;
  const margin = config.tradeInMargin ?? DEFAULT_TRADE_IN_MARGIN;
  const response = await fetch(`${baseUrl}/api/trade-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey
    },
    body: JSON.stringify({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim || "Base",
      mileage: vehicle.mileage
    })
  });
  if (!response.ok) {
    throw new Error(`Failed to get valuation: ${response.status}`);
  }
  const data = await response.json();
  const askingPrice = data.asking_price;
  const ourValue = Math.round(askingPrice * (1 - margin));
  return {
    askingPrice,
    ourValue,
    vehicle
  };
}
function generateYears(startYear = 2e3) {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  return Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => currentYear - i
  );
}

// src/trade-in/calculations.ts
function calculateNetTradeValue(tradeInValue, lien) {
  return Math.max(0, tradeInValue - (lien || 0));
}
function getNetTradeFromSubmission(submission) {
  return calculateNetTradeValue(submission.desiredAmount, submission.lien);
}
function applyDealerMargin(askingPrice, margin = 0.15) {
  return Math.round(askingPrice * (1 - margin));
}

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
function calculateNetTradeValue2(tradeInValue, lien) {
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
  const netTradeValue = paymentConfig.tradeInValue ? calculateNetTradeValue2(paymentConfig.tradeInValue, paymentConfig.lien ?? 0) : 0;
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
  const netTradeValue = paymentConfig.tradeInValue ? calculateNetTradeValue2(paymentConfig.tradeInValue, paymentConfig.lien ?? 0) : 0;
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

// src/product-config/index.ts
function calculateMaxDiscountFromConfig(params) {
  const { salePrice, cost, condition, config } = params;
  let rawDiscount;
  if (condition === "new") {
    if (cost && cost > 0) {
      const profitMargin = salePrice - cost;
      rawDiscount = profitMargin * (config.profit_span / 100);
    } else {
      rawDiscount = config.default_span;
    }
  } else {
    rawDiscount = salePrice * (config.used_span / 100);
  }
  return Math.round(rawDiscount / 100) * 100;
}
function getTotalTaxRate(config) {
  return config.tax_1 + config.tax_2;
}

// src/doc-fees/index.ts
function getApplicableFees(allFees, condition, dealType) {
  const applicableFees = allFees.filter((fee) => {
    if (!fee.is_active) return false;
    const conditionMatch = condition === "new" ? fee.applies_new : fee.applies_used;
    if (!conditionMatch) return false;
    const dealTypeMatch = dealType === "finance" && fee.applies_finance || dealType === "cash" && fee.applies_cash || dealType === "lease" && fee.applies_lease;
    if (!dealTypeMatch) return false;
    return true;
  }).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const fees = applicableFees.map((fee) => ({
    name: fee.name,
    value: fee.value
  }));
  const totalFee = fees.reduce((sum, fee) => sum + fee.value, 0);
  return { totalFee, fees };
}
function getTotalDocFee(allFees, condition, dealType) {
  return getApplicableFees(allFees, condition, dealType).totalFee;
}

// src/offers/api.ts
function mapFrequency(freq) {
  if (freq === "biweekly") return "bi-weekly";
  return freq;
}
function buildOfferPayload(submission, docFee = 0) {
  return {
    first_name: submission.firstName,
    last_name: submission.lastName,
    email: submission.email,
    phone: submission.phone,
    message: submission.message || "",
    vin: submission.vin,
    dealer_id: submission.dealerId,
    vehicle_id: submission.vehicleId,
    stock_number: submission.stockNumber,
    offer_type: submission.offerType,
    buy_payment: {
      selloffprice: submission.salePrice,
      net_amount_to_finance: submission.netAmount,
      requsted_discount: submission.discountRequest,
      downpayment: submission.downPayment,
      borrow_cost: submission.borrowCost,
      payment_amount: submission.payment?.amount || 0,
      has_trade_in: submission.tradeIn ? "1" : "0",
      trade_in_value: submission.tradeIn?.desiredAmount || 0,
      frequency: submission.payment ? mapFrequency(submission.payment.frequency) : "bi-weekly",
      term: submission.payment?.term || 0,
      rate: submission.payment?.rate || 0,
      has_taxes: submission.includeTaxes ? 1 : 0,
      tax_amount: submission.taxAmount,
      credit_score: submission.creditScore,
      doc_fee: docFee
    },
    trade_in_id: submission.tradeIn?.id
  };
}
async function submitOffer(config, submission, docFee = 0) {
  const payload = buildOfferPayload(submission, docFee);
  const response = await fetch(`${config.baseUrl}/api/offers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    return { success: false, error: `Failed to submit offer: ${response.status}` };
  }
  const data = await response.json();
  return { success: true, id: data.id };
}

// src/offers/validation.ts
function validateCustomerInfo(info) {
  const errors = {};
  if (!info.firstName?.trim()) {
    errors.firstName = "First name is required";
  }
  if (!info.lastName?.trim()) {
    errors.lastName = "Last name is required";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!info.email?.trim() || !emailRegex.test(info.email)) {
    errors.email = "Valid email is required";
  }
  const phoneRegex = /^\d{10,}$/;
  const cleanPhone = info.phone?.replace(/\D/g, "") || "";
  if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
    errors.phone = "Valid phone number is required";
  }
  return errors;
}
function isValid(errors) {
  return Object.keys(errors).length === 0;
}
function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}
export {
  MINIMUM_FINANCE_AMOUNT,
  applyDealerMargin,
  buildOfferPayload,
  calculateBorrowCost,
  calculateCashPrice,
  calculateMaxDiscount,
  calculateMaxDiscountFromConfig,
  calculateNetTradeValue,
  calculatePayment,
  calculateTaxAmount,
  convertToFrequency,
  determineRate,
  fetchMakes,
  fetchModels,
  formatCreditLabel,
  formatCurrency,
  formatFrequencyLabel,
  formatNumber,
  formatPhone,
  formatWholeNumber,
  generateYears,
  getApplicableFees,
  getAvailableTerms,
  getMaxTerm,
  getNetTradeFromSubmission,
  getRateForVehicle,
  getTotalDocFee,
  getTotalTaxRate,
  getValuation,
  isValid,
  isVehicleFinanceable,
  submitOffer,
  validateCustomerInfo
};
//# sourceMappingURL=index.mjs.map