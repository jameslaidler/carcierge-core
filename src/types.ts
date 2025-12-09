// ============================================
// SHARED TYPES FOR CARCIERGE CORE
// ============================================

// Credit & Rates
export type CreditScore = 'exceptional' | 'excellent' | 'good' | 'fair' | 'poor';

export interface InterestRate {
  _id?: string;
  dealer_id: string;
  year: number;
  score: CreditScore;
  max_mileage: number;
  max_term: number;
  rate: number;
}

// Vehicle
export interface VehicleInfo {
  year: number;
  mileage: number;
  salePrice: number;
}


// Payment
export type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface PaymentConfig {
  creditScore: CreditScore;
  frequency: PaymentFrequency;
  term: number;
  downPayment?: number;
  tradeInValue?: number;
  lien?: number;
  discountRequest?: number;
  includeTaxes?: boolean;
}

export interface PaymentResult {
  payment: number | null;
  amountFinanced: number;
  totalCost: number;
  taxAmount: number;
  priceBeforeTax: number;
  priceAfterTax: number;
  isFinanceable: boolean;
  effectiveRate: number;
  effectiveTerm: number;
  borrowCost: number;
  term: number;
}

// Trade-In
export interface TradeInVehicle {
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
}

export interface TradeInSubmission {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  ourValue: number;      // ML-generated value with margin applied
  desiredAmount: number; // User's requested value
  lien: number;
}

export interface TradeInValuation {
  askingPrice: number;   // Raw ML price
  ourValue: number;      // After dealer margin
  vehicle: TradeInVehicle;
}

// Offer
export interface OfferSubmission {
  // Customer info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string;
  
  // Vehicle
  vehicleId: string;
  vin: string;
  stockNumber: string;
  salePrice: number;
  
  // Deal structure
  dealerId: string;
  discountRequest: number;
  downPayment: number;
  tradeIn?: TradeInSubmission;
  
  // Payment (if financing)
  offerType: 'cash' | 'finance';
  payment?: {
    amount: number;
    frequency: PaymentFrequency;
    term: number;
    rate: number;
  };
  
  // Taxes
  includeTaxes: boolean;
  taxAmount: number;
  
  // Calculated
  netAmount: number;
  borrowCost: number;
  creditScore: CreditScore;
}

// API Response types
export interface Make {
  id: number;
  name: string;
}

export interface Model {
  id: number;
  name: string;
  model_year: number;
  make_id: number;
  make_name: string;
}
