type CreditScore = 'exceptional' | 'excellent' | 'good' | 'fair' | 'poor';
interface InterestRate {
    _id?: string;
    dealer_id: string;
    year: number;
    score: CreditScore;
    max_mileage: number;
    max_term: number;
    rate: number;
}
interface VehicleInfo {
    year: number;
    mileage: number;
    salePrice: number;
}
type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly';
interface PaymentConfig {
    creditScore: CreditScore;
    frequency: PaymentFrequency;
    term: number;
    downPayment?: number;
    tradeInValue?: number;
    lien?: number;
    discountRequest?: number;
    includeTaxes?: boolean;
}
interface PaymentResult {
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
interface TradeInVehicle {
    year: number;
    make: string;
    model: string;
    trim?: string;
    mileage: number;
}
interface TradeInSubmission {
    id: string;
    year: number;
    make: string;
    model: string;
    trim: string;
    mileage: number;
    ourValue: number;
    desiredAmount: number;
    lien: number;
}
interface TradeInValuation {
    askingPrice: number;
    ourValue: number;
    vehicle: TradeInVehicle;
}
interface OfferSubmission {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    message?: string;
    vehicleId: string;
    vin: string;
    stockNumber: string;
    salePrice: number;
    dealerId: string;
    discountRequest: number;
    downPayment: number;
    tradeIn?: TradeInSubmission;
    offerType: 'cash' | 'finance';
    payment?: {
        amount: number;
        frequency: PaymentFrequency;
        term: number;
        rate: number;
    };
    includeTaxes: boolean;
    taxAmount: number;
    netAmount: number;
    borrowCost: number;
    creditScore: CreditScore;
}
interface Make {
    id: number;
    name: string;
}
interface Model {
    id: number;
    name: string;
    model_year: number;
    make_id: number;
    make_name: string;
}

export type { CreditScore as C, InterestRate as I, Make as M, OfferSubmission as O, PaymentFrequency as P, TradeInVehicle as T, VehicleInfo as V, PaymentConfig as a, PaymentResult as b, TradeInSubmission as c, TradeInValuation as d, Model as e };
