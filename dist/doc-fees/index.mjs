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
export {
  getApplicableFees,
  getTotalDocFee
};
//# sourceMappingURL=index.mjs.map