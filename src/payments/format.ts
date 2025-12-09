// ============================================
// FORMATTING UTILITIES
// ============================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function formatWholeNumber(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-US').format(amount);
}

export function formatFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case 'weekly': return 'Weekly';
    case 'biweekly': return 'Bi-weekly';
    case 'monthly': return 'Monthly';
    default: return frequency;
  }
}

export function formatCreditLabel(score: string): string {
  switch (score) {
    case 'poor': return 'Poor';
    case 'fair': return 'Fair';
    case 'good': return 'Good';
    case 'excellent': return 'Excellent';
    default: return score;
  }
}
