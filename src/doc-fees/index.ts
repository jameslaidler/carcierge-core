// ============================================
// DOC FEE HANDLER
// Filters and calculates applicable dealer fees
// ============================================

export type VehicleCondition = 'new' | 'used';
export type DealType = 'finance' | 'cash' | 'lease';

export interface DocFee {
  _id?: string;
  dealer_id: string;
  name: string;
  description?: string;
  value: number;
  applies_new: boolean;
  applies_used: boolean;
  applies_finance: boolean;
  applies_cash: boolean;
  applies_lease: boolean;
  is_active: boolean;
  display_order?: number;
}

export interface ApplicableFee {
  name: string;
  value: number;
}

export interface DocFeeResult {
  totalFee: number;
  fees: ApplicableFee[];
}

/**
 * Get applicable doc fees for a deal
 */
export function getApplicableFees(
  allFees: DocFee[],
  condition: VehicleCondition,
  dealType: DealType
): DocFeeResult {
  const applicableFees = allFees
    .filter(fee => {
      // Must be active
      if (!fee.is_active) return false;
      
      // Check vehicle condition
      const conditionMatch = condition === 'new' 
        ? fee.applies_new 
        : fee.applies_used;
      if (!conditionMatch) return false;
      
      // Check deal type
      const dealTypeMatch = 
        (dealType === 'finance' && fee.applies_finance) ||
        (dealType === 'cash' && fee.applies_cash) ||
        (dealType === 'lease' && fee.applies_lease);
      if (!dealTypeMatch) return false;
      
      return true;
    })
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const fees: ApplicableFee[] = applicableFees.map(fee => ({
    name: fee.name,
    value: fee.value,
  }));

  const totalFee = fees.reduce((sum, fee) => sum + fee.value, 0);

  return { totalFee, fees };
}

/**
 * Quick helper to just get total fee amount
 */
export function getTotalDocFee(
  allFees: DocFee[],
  condition: VehicleCondition,
  dealType: DealType
): number {
  return getApplicableFees(allFees, condition, dealType).totalFee;
}
