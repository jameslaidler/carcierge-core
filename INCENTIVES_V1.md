# Incentives (v1) – Design Notes

## Scope / guard rails

- Finance only (v1)
- New cars only (v1)
- Lease ignored
- Cash deal path ignored (widget assumes financing)
- `sale_price` is assumed to be **free of OEM incentives**
- OEM incentives may impact:
  - Finance cash (dollar incentives)
  - Subvented APR (absolute APR tables)
  - Conditional rate reductions (APR points)

## Core vs ecomm responsibilities

### What lives in `carcierge-core` (v1)

- Parse/validate normalized incentive schema
- Match offers for a given context:
  - `dealMode=finance`
  - `trim` (exact match)
  - `termMonths`
  - `asOfDate` (effective window)
- Partition offers by eligibility:
  - **Public**: `eligibility.required=false` (tag should be `public`)
  - **Conditional**: `eligibility.required=true` (tag like `loyalty`, `military`, `student`)
- Resolve stacking rules (v1):
  - Within the same `stacking.group`, v1 expects **0 or 1** matching offer (fail-fast if > 1)
- Produce a stable output contract for consumers:
  - Public finance APR for the selected term
  - Public finance cash line items + total
  - Conditional (available) programs (rate reductions, cash) with tags
  - Conditional (applied) deltas when UI provides selected tags

### What lives in `carcierge-ecomm` (v1)

- UI for selecting conditional programs (ex: loyalty)
- Passing selected eligibility tags into core evaluation
- Display rules, disclaimers, copy
- Deciding whether to show “best case” vs “standard”

## How pricing deltas should be applied (v1)

### Finance cash

- Finance cash incentives are represented as offers with:
  - `pathId` in the finance path (ex: `finance_promo`)
  - `type: "cash"`
  - `stacking.group: "finance_cash"`

v1 assumption:

- Treat finance cash as an additional discount (reduces amount financed).
- In the widget, include it in the `discountRequest` passed into payment calculation.

### APR

- Public APR is represented by an `apr_table` offer under the finance path.
- Conditional APR improvements are represented by `rate_reduction` offers.

v1 assumption:

- `rateReductionPercent` is treated as **APR points** (absolute subtraction), ex:
  - `5.29 - 0.5 = 4.79`

Conditional reductions are **not applied** unless UI indicates eligibility (ex: user selects “loyalty”).

## Input schema expectations (normalized upstream)

The incentives engine expects a normalized doc (per YMM + program set) containing:

- `effective.start` / `effective.end`
- `paths[]` where one path has `dealMode: "finance"`
- `offers[]` where offers include:
  - `offerId` string
  - `pathId` string
  - `type` (supported in v1: `cash`, `apr_table`, `rate_reduction`)
  - `selectors.trim` (exact match to trim label used in app)
  - `eligibility.required` boolean + `eligibility.tag` string
  - `benefit` per type
  - `stacking.group` string

## Fail-fast / error philosophy

- v1 should throw on malformed schema or ambiguous stacking.
- v1 should throw if required finance APR is missing for a matching trim.
- v1 should throw if `termMonths` has no APR in `aprByTermMonths`.

## Current implementation (v1)

- `src/incentives/*` provides `evaluateFinanceIncentivesV1()` which:
  - selects the finance path
  - matches offers by trim
  - partitions by eligibility
  - returns public + conditional (available/applied)

- `src/payments/calculations.ts` provides `calculatePaymentWithAnnualRateOverride()` so consumers can reuse the payment formula with subvented APR.
