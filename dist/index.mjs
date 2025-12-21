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
  const maxTerm = applicableRate?.max_term ?? requestedTerm;
  const termIsAllowed = typeof applicableRate?.max_term === "number" ? requestedTerm <= applicableRate.max_term : true;
  const isFinanceable = !!applicableRate && termIsAllowed;
  return {
    rate: applicableRate?.rate ?? 5,
    maxTerm,
    isFinanceable,
    effectiveRate: applicableRate?.rate ?? 5,
    effectiveTerm: requestedTerm
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
function calculatePaymentWithAnnualRateOverride(params) {
  const { vehicle, paymentConfig, docFee, tax1, tax2, annualRate } = params;
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
  const monthlyPayment = calculateBaseMonthlyPayment(
    amountFinanced,
    paymentConfig.term,
    annualRate
  );
  const payment = monthlyPayment ? convertToFrequency(monthlyPayment, paymentConfig.frequency) : null;
  const totalCost = payment ? calculateTotalCost({
    payment,
    frequency: paymentConfig.frequency,
    term: paymentConfig.term,
    downPayment: paymentConfig.downPayment ?? 0
  }) : 0;
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

// src/incentives/v1.ts
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isIncentiveJsonDataV1(value) {
  if (!isRecord(value)) return false;
  return typeof value.ymmId === "string" && typeof value.year === "number" && typeof value.make === "string" && typeof value.model === "string" && isRecord(value.effective) && typeof value.effective.start === "string" && typeof value.effective.end === "string" && Array.isArray(value.paths) && Array.isArray(value.offers) && typeof value.programSetId === "string";
}
function extractIncentiveJsonDataV1OrThrow(payload) {
  const direct = payload;
  if (isIncentiveJsonDataV1(direct)) {
    return direct;
  }
  if (isRecord(payload) && isIncentiveJsonDataV1(payload.json_data)) {
    return payload.json_data;
  }
  if (isRecord(payload) && Array.isArray(payload.data) && payload.data.length > 0) {
    const first = payload.data[0];
    if (isRecord(first) && isIncentiveJsonDataV1(first.json_data)) {
      return first.json_data;
    }
  }
  const hint = isRecord(payload) ? Object.keys(payload).slice(0, 10).join(",") : typeof payload;
  throw new Error(`Unable to extract IncentiveJsonDataV1 from payload (${hint})`);
}
function parseIsoDateOrThrow(value, label) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return d;
}
function groupByStackingGroupOrThrow(items, label) {
  const map = /* @__PURE__ */ new Map();
  for (const item of items) {
    const existing = map.get(item.stackingGroup);
    if (existing) {
      throw new Error(`Ambiguous stacking: multiple ${label} items in group '${item.stackingGroup}'`);
    }
    map.set(item.stackingGroup, item);
  }
  return map;
}
function getFinancePathIdOrThrow(paths) {
  const financePaths = paths.filter((p) => p.dealMode === "finance");
  if (financePaths.length !== 1) {
    throw new Error(`Expected exactly 1 finance path, found ${financePaths.length}`);
  }
  return financePaths[0].pathId;
}
function getAprForTermOrThrow(offer, termMonths) {
  if (offer.type !== "apr_table") {
    throw new Error("Expected apr_table offer");
  }
  const benefit = offer.benefit;
  const table = benefit.aprByTermMonths;
  if (!table || typeof table !== "object") {
    throw new Error(`APR table missing for offer ${offer.offerId}`);
  }
  const value = table[String(termMonths)];
  if (typeof value !== "number") {
    throw new Error(`APR missing for termMonths=${termMonths} on offer ${offer.offerId}`);
  }
  return value;
}
function normalizeMatchKey(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
function cashLineItemFromOfferOrThrow(offer) {
  if (offer.type !== "cash") {
    throw new Error("Expected cash offer");
  }
  const benefit = offer.benefit;
  if (typeof benefit.cash !== "number") {
    throw new Error(`Cash benefit missing/invalid for offer ${offer.offerId}`);
  }
  if (typeof benefit.currency !== "string") {
    throw new Error(`Cash currency missing/invalid for offer ${offer.offerId}`);
  }
  return {
    offerId: offer.offerId,
    stackingGroup: offer.stacking.group,
    eligibilityTag: offer.eligibility.tag,
    amount: benefit.cash,
    currency: benefit.currency
  };
}
function rateReductionFromOfferOrThrow(offer) {
  if (offer.type !== "rate_reduction") {
    throw new Error("Expected rate_reduction offer");
  }
  const benefit = offer.benefit;
  if (typeof benefit.rateReductionPercent !== "number") {
    throw new Error(`rateReductionPercent missing/invalid for offer ${offer.offerId}`);
  }
  return {
    offerId: offer.offerId,
    stackingGroup: offer.stacking.group,
    eligibilityTag: offer.eligibility.tag,
    aprPoints: benefit.rateReductionPercent
  };
}
function evaluateFinanceIncentivesV1(input) {
  const { jsonData, trim, termMonths, asOfDate, selectedEligibilityTags = [] } = input;
  const asOf = parseIsoDateOrThrow(asOfDate, "asOfDate");
  const start = parseIsoDateOrThrow(jsonData.effective.start, "effective.start");
  const end = parseIsoDateOrThrow(jsonData.effective.end, "effective.end");
  if (asOf < start || asOf > end) {
    throw new Error(`Incentives not effective for asOfDate=${asOfDate}`);
  }
  const financePathId = getFinancePathIdOrThrow(jsonData.paths);
  const trimKey = normalizeMatchKey(trim);
  const matchingOffers = jsonData.offers.filter(
    (o) => o.pathId === financePathId && normalizeMatchKey(o.selectors.trim ?? "") === trimKey
  );
  const publicOffers = matchingOffers.filter((o) => !o.eligibility.required);
  const conditionalOffers = matchingOffers.filter((o) => o.eligibility.required);
  const publicAprOffers = publicOffers.filter((o) => o.type === "apr_table");
  if (publicAprOffers.length !== 1) {
    throw new Error(`Expected exactly 1 public apr_table offer for trim='${trim}', found ${publicAprOffers.length}`);
  }
  const publicAprForTerm = getAprForTermOrThrow(publicAprOffers[0], termMonths);
  const publicFinanceCash = publicOffers.filter((o) => o.type === "cash").map(cashLineItemFromOfferOrThrow);
  groupByStackingGroupOrThrow(publicFinanceCash, "public cash");
  const conditionalCash = conditionalOffers.filter((o) => o.type === "cash").map(cashLineItemFromOfferOrThrow);
  groupByStackingGroupOrThrow(conditionalCash, "conditional cash");
  const conditionalRateReductions = conditionalOffers.filter((o) => o.type === "rate_reduction").map(rateReductionFromOfferOrThrow);
  groupByStackingGroupOrThrow(conditionalRateReductions, "conditional rate reduction");
  const publicFinanceCashTotal = publicFinanceCash.reduce((sum, item) => sum + item.amount, 0);
  const selectedSet = new Set(selectedEligibilityTags);
  const appliedConditionalCash = conditionalCash.filter((i) => selectedSet.has(i.eligibilityTag));
  const appliedConditionalRateReductions = conditionalRateReductions.filter((i) => selectedSet.has(i.eligibilityTag));
  const appliedConditionalCashTotal = appliedConditionalCash.reduce((sum, item) => sum + item.amount, 0);
  const appliedRateReductionTotal = appliedConditionalRateReductions.reduce((sum, item) => sum + item.aprPoints, 0);
  const appliedAprForTerm = publicAprForTerm - appliedRateReductionTotal;
  if (appliedAprForTerm < 0) {
    throw new Error(`Computed APR is negative (${appliedAprForTerm}) after reductions`);
  }
  return {
    public: {
      aprForTermMonths: publicAprForTerm,
      financeCashTotal: publicFinanceCashTotal,
      financeCash: publicFinanceCash
    },
    conditionalAvailable: {
      financeCash: conditionalCash,
      rateReductions: conditionalRateReductions
    },
    conditionalApplied: {
      selectedEligibilityTags: [...selectedEligibilityTags],
      aprForTermMonths: appliedAprForTerm,
      financeCashTotal: publicFinanceCashTotal + appliedConditionalCashTotal,
      financeCash: [...publicFinanceCash, ...appliedConditionalCash],
      rateReductions: appliedConditionalRateReductions
    }
  };
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
  calculatePaymentWithAnnualRateOverride,
  calculateTaxAmount,
  convertToFrequency,
  determineRate,
  evaluateFinanceIncentivesV1,
  extractIncentiveJsonDataV1OrThrow,
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