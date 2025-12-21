type IncentiveDealModeV1 = 'finance';
interface IncentiveEligibilityV1 {
    required: boolean;
    tag: string;
}
interface IncentivePathV1 {
    pathId: string;
    dealMode: 'cash' | 'finance' | 'lease';
    label: string;
}
type IncentiveOfferTypeV1 = 'cash' | 'apr_table' | 'rate_reduction';
interface IncentiveOfferV1 {
    offerId: string;
    pathId: string;
    type: IncentiveOfferTypeV1;
    selectors: {
        trim?: string;
    };
    eligibility: IncentiveEligibilityV1;
    benefit: Record<string, unknown>;
    stacking: {
        group: string;
    };
}
interface IncentiveJsonDataV1 {
    ymmId: string;
    year: number;
    make: string;
    model: string;
    effective: {
        start: string;
        end: string;
    };
    paths: IncentivePathV1[];
    offers: IncentiveOfferV1[];
    programSetId: string;
}
declare function extractIncentiveJsonDataV1OrThrow(payload: unknown): IncentiveJsonDataV1;
interface EvaluateFinanceIncentivesInputV1 {
    jsonData: IncentiveJsonDataV1;
    trim: string;
    termMonths: number;
    asOfDate: string;
    selectedEligibilityTags?: string[];
}
interface IncentiveCashLineItemV1 {
    offerId: string;
    stackingGroup: string;
    eligibilityTag: string;
    amount: number;
    currency: string;
}
interface IncentiveRateReductionLineItemV1 {
    offerId: string;
    stackingGroup: string;
    eligibilityTag: string;
    aprPoints: number;
}
interface EvaluatedFinanceIncentivesV1 {
    public: {
        aprForTermMonths: number;
        financeCashTotal: number;
        financeCash: IncentiveCashLineItemV1[];
    };
    conditionalAvailable: {
        financeCash: IncentiveCashLineItemV1[];
        rateReductions: IncentiveRateReductionLineItemV1[];
    };
    conditionalApplied: {
        selectedEligibilityTags: string[];
        aprForTermMonths: number;
        financeCashTotal: number;
        financeCash: IncentiveCashLineItemV1[];
        rateReductions: IncentiveRateReductionLineItemV1[];
    };
}
declare function evaluateFinanceIncentivesV1(input: EvaluateFinanceIncentivesInputV1): EvaluatedFinanceIncentivesV1;

export { type EvaluateFinanceIncentivesInputV1, type EvaluatedFinanceIncentivesV1, type IncentiveCashLineItemV1, type IncentiveDealModeV1, type IncentiveEligibilityV1, type IncentiveJsonDataV1, type IncentiveOfferTypeV1, type IncentiveOfferV1, type IncentivePathV1, type IncentiveRateReductionLineItemV1, evaluateFinanceIncentivesV1, extractIncentiveJsonDataV1OrThrow };
