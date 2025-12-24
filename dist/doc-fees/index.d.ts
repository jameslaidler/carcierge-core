type VehicleCondition = 'new' | 'used';
type DealType = 'finance' | 'cash' | 'lease';
interface DocFee {
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
interface ApplicableFee {
    name: string;
    value: number;
    description?: string;
}
interface DocFeeResult {
    totalFee: number;
    fees: ApplicableFee[];
}
/**
 * Get applicable doc fees for a deal
 */
declare function getApplicableFees(allFees: DocFee[], condition: VehicleCondition, dealType: DealType): DocFeeResult;
/**
 * Quick helper to just get total fee amount
 */
declare function getTotalDocFee(allFees: DocFee[], condition: VehicleCondition, dealType: DealType): number;

export { type ApplicableFee, type DealType, type DocFee, type DocFeeResult, type VehicleCondition, getApplicableFees, getTotalDocFee };
