# @carcierge/core

Core business logic for Carcierge widgets - trade-in valuation, payment calculations, and offer submission.

## Installation

```bash
npm install @carcierge/core
# or link locally during development
npm link
```

## Modules

### Trade-In (`@carcierge/core/trade-in`)

Vehicle trade-in valuation via Central Vehicles API.

```typescript
import { fetchMakes, fetchModels, getValuation, generateYears } from '@carcierge/core/trade-in';

const config = {
  apiKey: 'your-central-api-key',
  tradeInMargin: 0.15, // 15% dealer margin
};

// Get available makes
const makes = await fetchMakes(config);

// Get models for a year/make
const models = await fetchModels(config, 2022, makeId);

// Get valuation
const valuation = await getValuation(config, {
  year: 2022,
  make: 'Toyota',
  model: 'Camry',
  trim: 'XLE',
  mileage: 45000,
});
// Returns: { askingPrice: 25000, ourValue: 21250, vehicle: {...} }
```

### Payments (`@carcierge/core/payments`)

Automotive financing calculations.

```typescript
import { calculatePayment, calculateCashPrice, formatCurrency } from '@carcierge/core/payments';

const result = calculatePayment({
  vehicle: { year: 2022, mileage: 45000, salePrice: 35000 },
  paymentConfig: {
    creditScore: 'good',
    frequency: 'biweekly',
    term: 60,
    downPayment: 5000,
    tradeInValue: 10000,
    lien: 2000,
  },
  dealerConfig: {
    dealerId: 'xxx',
    docFee: 499,
    tax1: 5,
    tax2: 8,
  },
  interestRates: [...], // From dealer config
});

console.log(formatCurrency(result.payment)); // "$245.00"
```

### Offers (`@carcierge/core/offers`)

Offer submission and validation.

```typescript
import { submitOffer, validateCustomerInfo, isValid } from '@carcierge/core/offers';

// Validate customer info
const errors = validateCustomerInfo({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '5551234567',
});

if (isValid(errors)) {
  const result = await submitOffer(
    { baseUrl: 'https://demo.dealers.works' },
    offerSubmission,
    docFee
  );
}
```

## Types

All shared types are exported from the main package:

```typescript
import type {
  CreditScore,
  InterestRate,
  VehicleInfo,
  DealerConfig,
  PaymentFrequency,
  PaymentConfig,
  PaymentResult,
  TradeInVehicle,
  TradeInSubmission,
  TradeInValuation,
  OfferSubmission,
  Make,
  Model,
} from '@carcierge/core';
```

## Usage in Widgets

This package is used by:
- **Trade-In Widget** - Standalone trade-in valuation
- **E-Comm Widget** - Full deal builder with payments
- **AI Chat** - Conversational deal building via tool calls
- **dealers.works site** - Built-in components

## Development

```bash
npm install
npm run build    # Build the package
npm run dev      # Watch mode
npm run test     # Run tests
```
