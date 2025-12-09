import { O as OfferSubmission } from '../types-BCSRb3Fo.js';

interface OfferApiConfig {
    baseUrl: string;
}
interface OfferPayload {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    message: string;
    vin: string;
    dealer_id: string;
    vehicle_id: string;
    stock_number: string;
    offer_type: 'cash' | 'finance';
    buy_payment: {
        selloffprice: number;
        net_amount_to_finance: number;
        requsted_discount: number;
        downpayment: number;
        borrow_cost: number;
        payment_amount: number;
        has_trade_in: string;
        trade_in_value: number;
        frequency: 'weekly' | 'bi-weekly' | 'monthly';
        term: number;
        rate: number;
        has_taxes: number;
        tax_amount: number;
        credit_score: string;
        doc_fee: number;
    };
    trade_in_id?: string;
}
/**
 * Build offer payload from submission
 */
declare function buildOfferPayload(submission: OfferSubmission, docFee?: number): OfferPayload;
/**
 * Submit offer to API
 */
declare function submitOffer(config: OfferApiConfig, submission: OfferSubmission, docFee?: number): Promise<{
    success: boolean;
    id?: string;
    error?: string;
}>;

interface ValidationErrors {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    general?: string;
}
interface CustomerInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}
/**
 * Validate customer info for offer submission
 */
declare function validateCustomerInfo(info: CustomerInfo): ValidationErrors;
/**
 * Check if validation passed
 */
declare function isValid(errors: ValidationErrors): boolean;
/**
 * Format phone number for display
 */
declare function formatPhone(phone: string): string;

export { type CustomerInfo, type OfferApiConfig, type OfferPayload, type ValidationErrors, buildOfferPayload, formatPhone, isValid, submitOffer, validateCustomerInfo };
