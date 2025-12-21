export type IncentiveDealModeV1 = 'finance';

export interface IncentiveEligibilityV1 {
  required: boolean;
  tag: string;
}

export interface IncentivePathV1 {
  pathId: string;
  dealMode: 'cash' | 'finance' | 'lease';
  label: string;
}

export type IncentiveOfferTypeV1 = 'cash' | 'apr_table' | 'rate_reduction';

export interface IncentiveOfferV1 {
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

export interface IncentiveJsonDataV1 {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isIncentiveJsonDataV1(value: unknown): value is IncentiveJsonDataV1 {
  if (!isRecord(value)) return false;

  return (
    typeof value.ymmId === 'string' &&
    typeof value.year === 'number' &&
    typeof value.make === 'string' &&
    typeof value.model === 'string' &&
    isRecord(value.effective) &&
    typeof value.effective.start === 'string' &&
    typeof value.effective.end === 'string' &&
    Array.isArray(value.paths) &&
    Array.isArray(value.offers) &&
    typeof value.programSetId === 'string'
  );
}

export function extractIncentiveJsonDataV1OrThrow(payload: unknown): IncentiveJsonDataV1 {
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

  const hint = isRecord(payload) ? Object.keys(payload).slice(0, 10).join(',') : typeof payload;
  throw new Error(`Unable to extract IncentiveJsonDataV1 from payload (${hint})`);
}

export interface EvaluateFinanceIncentivesInputV1 {
  jsonData: IncentiveJsonDataV1;
  trim: string;
  termMonths: number;
  asOfDate: string;
  selectedEligibilityTags?: string[];
}

export interface IncentiveCashLineItemV1 {
  offerId: string;
  stackingGroup: string;
  eligibilityTag: string;
  amount: number;
  currency: string;
}

export interface IncentiveRateReductionLineItemV1 {
  offerId: string;
  stackingGroup: string;
  eligibilityTag: string;
  aprPoints: number;
}

export interface EvaluatedFinanceIncentivesV1 {
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

function parseIsoDateOrThrow(value: string, label: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return d;
}

function groupByStackingGroupOrThrow<T extends { stackingGroup: string }>(
  items: T[],
  label: string
): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    const existing = map.get(item.stackingGroup);
    if (existing) {
      throw new Error(`Ambiguous stacking: multiple ${label} items in group '${item.stackingGroup}'`);
    }
    map.set(item.stackingGroup, item);
  }
  return map;
}

function getFinancePathIdOrThrow(paths: IncentivePathV1[]): string {
  const financePaths = paths.filter(p => p.dealMode === 'finance');
  if (financePaths.length !== 1) {
    throw new Error(`Expected exactly 1 finance path, found ${financePaths.length}`);
  }
  return financePaths[0].pathId;
}

function getAprForTermOrThrow(offer: IncentiveOfferV1, termMonths: number): number {
  if (offer.type !== 'apr_table') {
    throw new Error('Expected apr_table offer');
  }

  const benefit = offer.benefit as { aprByTermMonths?: Record<string, unknown> };
  const table = benefit.aprByTermMonths;
  if (!table || typeof table !== 'object') {
    throw new Error(`APR table missing for offer ${offer.offerId}`);
  }

  const value = table[String(termMonths)];
  if (typeof value !== 'number') {
    throw new Error(`APR missing for termMonths=${termMonths} on offer ${offer.offerId}`);
  }

  return value;
}

function normalizeMatchKey(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function cashLineItemFromOfferOrThrow(offer: IncentiveOfferV1): IncentiveCashLineItemV1 {
  if (offer.type !== 'cash') {
    throw new Error('Expected cash offer');
  }
  const benefit = offer.benefit as { cash?: unknown; currency?: unknown };
  if (typeof benefit.cash !== 'number') {
    throw new Error(`Cash benefit missing/invalid for offer ${offer.offerId}`);
  }
  if (typeof benefit.currency !== 'string') {
    throw new Error(`Cash currency missing/invalid for offer ${offer.offerId}`);
  }

  return {
    offerId: offer.offerId,
    stackingGroup: offer.stacking.group,
    eligibilityTag: offer.eligibility.tag,
    amount: benefit.cash,
    currency: benefit.currency,
  };
}

function rateReductionFromOfferOrThrow(offer: IncentiveOfferV1): IncentiveRateReductionLineItemV1 {
  if (offer.type !== 'rate_reduction') {
    throw new Error('Expected rate_reduction offer');
  }
  const benefit = offer.benefit as { rateReductionPercent?: unknown };
  if (typeof benefit.rateReductionPercent !== 'number') {
    throw new Error(`rateReductionPercent missing/invalid for offer ${offer.offerId}`);
  }

  return {
    offerId: offer.offerId,
    stackingGroup: offer.stacking.group,
    eligibilityTag: offer.eligibility.tag,
    aprPoints: benefit.rateReductionPercent,
  };
}

export function evaluateFinanceIncentivesV1(input: EvaluateFinanceIncentivesInputV1): EvaluatedFinanceIncentivesV1 {
  const { jsonData, trim, termMonths, asOfDate, selectedEligibilityTags = [] } = input;

  const asOf = parseIsoDateOrThrow(asOfDate, 'asOfDate');
  const start = parseIsoDateOrThrow(jsonData.effective.start, 'effective.start');
  const end = parseIsoDateOrThrow(jsonData.effective.end, 'effective.end');

  if (asOf < start || asOf > end) {
    throw new Error(`Incentives not effective for asOfDate=${asOfDate}`);
  }

  const financePathId = getFinancePathIdOrThrow(jsonData.paths);

  const trimKey = normalizeMatchKey(trim);

  const matchingOffers = jsonData.offers.filter(o =>
    o.pathId === financePathId &&
    normalizeMatchKey(o.selectors.trim ?? '') === trimKey
  );

  const publicOffers = matchingOffers.filter(o => !o.eligibility.required);
  const conditionalOffers = matchingOffers.filter(o => o.eligibility.required);

  const publicAprOffers = publicOffers.filter(o => o.type === 'apr_table');
  if (publicAprOffers.length !== 1) {
    throw new Error(`Expected exactly 1 public apr_table offer for trim='${trim}', found ${publicAprOffers.length}`);
  }
  const publicAprForTerm = getAprForTermOrThrow(publicAprOffers[0], termMonths);

  const publicFinanceCash = publicOffers
    .filter(o => o.type === 'cash')
    .map(cashLineItemFromOfferOrThrow);

  groupByStackingGroupOrThrow(publicFinanceCash, 'public cash');

  const conditionalCash = conditionalOffers
    .filter(o => o.type === 'cash')
    .map(cashLineItemFromOfferOrThrow);

  groupByStackingGroupOrThrow(conditionalCash, 'conditional cash');

  const conditionalRateReductions = conditionalOffers
    .filter(o => o.type === 'rate_reduction')
    .map(rateReductionFromOfferOrThrow);

  groupByStackingGroupOrThrow(conditionalRateReductions, 'conditional rate reduction');

  const publicFinanceCashTotal = publicFinanceCash.reduce((sum, item) => sum + item.amount, 0);

  const selectedSet = new Set(selectedEligibilityTags);
  const appliedConditionalCash = conditionalCash.filter(i => selectedSet.has(i.eligibilityTag));
  const appliedConditionalRateReductions = conditionalRateReductions.filter(i => selectedSet.has(i.eligibilityTag));

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
      financeCash: publicFinanceCash,
    },
    conditionalAvailable: {
      financeCash: conditionalCash,
      rateReductions: conditionalRateReductions,
    },
    conditionalApplied: {
      selectedEligibilityTags: [...selectedEligibilityTags],
      aprForTermMonths: appliedAprForTerm,
      financeCashTotal: publicFinanceCashTotal + appliedConditionalCashTotal,
      financeCash: [...publicFinanceCash, ...appliedConditionalCash],
      rateReductions: appliedConditionalRateReductions,
    },
  };
}
