"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/offers/index.ts
var offers_exports = {};
__export(offers_exports, {
  buildOfferPayload: () => buildOfferPayload,
  formatPhone: () => formatPhone,
  isValid: () => isValid,
  submitOffer: () => submitOffer,
  validateCustomerInfo: () => validateCustomerInfo
});
module.exports = __toCommonJS(offers_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildOfferPayload,
  formatPhone,
  isValid,
  submitOffer,
  validateCustomerInfo
});
//# sourceMappingURL=index.js.map