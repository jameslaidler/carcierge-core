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
export {
  calculateMaxDiscountFromConfig,
  getTotalTaxRate
};
//# sourceMappingURL=index.mjs.map