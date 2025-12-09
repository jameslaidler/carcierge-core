// ============================================
// PRODUCT CONFIG
// Per-product, per-dealer configuration
// ============================================

export interface EcommWidgetConfig {
  profit_span: number;        // % of profit margin allowed as discount (new vehicles with cost)
  used_span: number;          // % of sale price allowed as discount (used vehicles)
  default_span: number;       // Fallback discount $ (new vehicles without cost)
  incl_disc_span: boolean;    // Include discount in span calculation
  tax_1: number;              // Tax rate 1 (e.g., GST 5%)
  tax_2: number;              // Tax rate 2 (e.g., PST 7%)
  widget_style: 'full' | 'compact' | 'minimal';
  primary_color: string;      // Hex color for theming
}

export interface ProductConfig<T = EcommWidgetConfig> {
  _id?: string;
  product_id: number;
  product_slug: string;
  dealer_id: string;
  config: T;
  created_at?: Date;
  updated_at?: Date;
}

interface SpanCalculationParams {
  salePrice: number;
  cost?: number;              // Only for new vehicles
  condition: 'new' | 'used';
  config: EcommWidgetConfig;
}

/**
 * Calculate max discount (span) for a vehicle based on product config
 * 
 * Logic:
 * - New with cost: (salePrice - cost) * profit_span%
 * - New without cost: default_span (fallback)
 * - Used: salePrice * used_span%
 */
export function calculateMaxDiscountFromConfig(params: SpanCalculationParams): number {
  const { salePrice, cost, condition, config } = params;
  
  let rawDiscount: number;
  
  if (condition === 'new') {
    if (cost && cost > 0) {
      // New with cost: % of profit margin
      const profitMargin = salePrice - cost;
      rawDiscount = profitMargin * (config.profit_span / 100);
    } else {
      // New without cost: use default span
      rawDiscount = config.default_span;
    }
  } else {
    // Used: % of sale price
    rawDiscount = salePrice * (config.used_span / 100);
  }
  
  // Round to nearest $100
  return Math.round(rawDiscount / 100) * 100;
}

/**
 * Get total tax rate from config
 */
export function getTotalTaxRate(config: EcommWidgetConfig): number {
  return config.tax_1 + config.tax_2;
}
