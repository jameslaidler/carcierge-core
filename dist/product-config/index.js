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

// src/product-config/index.ts
var product_config_exports = {};
__export(product_config_exports, {
  calculateMaxDiscountFromConfig: () => calculateMaxDiscountFromConfig,
  getTotalTaxRate: () => getTotalTaxRate
});
module.exports = __toCommonJS(product_config_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateMaxDiscountFromConfig,
  getTotalTaxRate
});
//# sourceMappingURL=index.js.map