interface EcommWidgetConfig {
    profit_span: number;
    new_span: number;
    used_span: number;
    default_span: number;
    incl_disc_span: boolean;
    tax_1: number;
    tax_2: number;
    widget_style: 'full' | 'compact' | 'minimal';
    primary_color: string;
}
interface ProductConfig<T = EcommWidgetConfig> {
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
    cost?: number;
    condition: 'new' | 'used';
    config: EcommWidgetConfig;
}
/**
 * Calculate max discount (span) for a vehicle based on product config
 *
 * Logic:
 * - New: salePrice * new_span%
 * - Used: salePrice * used_span%
 */
declare function calculateMaxDiscountFromConfig(params: SpanCalculationParams): number;
/**
 * Get total tax rate from config
 */
declare function getTotalTaxRate(config: EcommWidgetConfig): number;

export { type EcommWidgetConfig, type ProductConfig, calculateMaxDiscountFromConfig, getTotalTaxRate };
