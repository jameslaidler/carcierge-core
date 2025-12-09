// ============================================
// OFFERS API
// Submit offers to dealer
// ============================================

import type { OfferSubmission, PaymentFrequency } from '../types';

export interface OfferApiConfig {
  baseUrl: string; // e.g., 'https://demo.dealers.works' or Central API
}

export interface OfferPayload {
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
 * Convert PaymentFrequency to API format
 */
function mapFrequency(freq: PaymentFrequency): 'weekly' | 'bi-weekly' | 'monthly' {
  if (freq === 'biweekly') return 'bi-weekly';
  return freq;
}

/**
 * Build offer payload from submission
 */
export function buildOfferPayload(
  submission: OfferSubmission,
  docFee: number = 0
): OfferPayload {
  return {
    first_name: submission.firstName,
    last_name: submission.lastName,
    email: submission.email,
    phone: submission.phone,
    message: submission.message || '',
    vin: submission.vin,
    dealer_id: submission.dealerId,
    vehicle_id: submission.vehicleId,
    stock_number: submission.stockNumber,
    offer_type: submission.offerType,
    buy_payment: {
      selloffprice: submission.salePrice,
      net_amount_to_finance: submission.netAmount,
      requsted_discount: submission.discountRequest,
      downpayment: submission.downPayment,
      borrow_cost: submission.borrowCost,
      payment_amount: submission.payment?.amount || 0,
      has_trade_in: submission.tradeIn ? '1' : '0',
      trade_in_value: submission.tradeIn?.desiredAmount || 0,
      frequency: submission.payment ? mapFrequency(submission.payment.frequency) : 'bi-weekly',
      term: submission.payment?.term || 0,
      rate: submission.payment?.rate || 0,
      has_taxes: submission.includeTaxes ? 1 : 0,
      tax_amount: submission.taxAmount,
      credit_score: submission.creditScore,
      doc_fee: docFee,
    },
    trade_in_id: submission.tradeIn?.id,
  };
}

/**
 * Submit offer to API
 */
export async function submitOffer(
  config: OfferApiConfig,
  submission: OfferSubmission,
  docFee: number = 0
): Promise<{ success: boolean; id?: string; error?: string }> {
  const payload = buildOfferPayload(submission, docFee);
  
  const response = await fetch(`${config.baseUrl}/api/offers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { success: false, error: `Failed to submit offer: ${response.status}` };
  }

  const data = await response.json() as { success: boolean; id?: string };
  return { success: true, id: data.id };
}
