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

// src/doc-fees/index.ts
var doc_fees_exports = {};
__export(doc_fees_exports, {
  getApplicableFees: () => getApplicableFees,
  getTotalDocFee: () => getTotalDocFee
});
module.exports = __toCommonJS(doc_fees_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getApplicableFees,
  getTotalDocFee
});
//# sourceMappingURL=index.js.map