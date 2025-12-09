// ============================================
// TRADE-IN API CALLS
// Calls to Central Vehicles API
// ============================================

import type { Make, Model, TradeInVehicle, TradeInValuation } from '../types';

const DEFAULT_CENTRAL_API_URL = 'https://central-vehicles-node.vercel.app';
const DEFAULT_TRADE_IN_MARGIN = 0.15; // 15% dealer margin

export interface TradeInApiConfig {
  baseUrl?: string;
  apiKey: string;
  tradeInMargin?: number;
}

// ============================================
// FETCH MAKES
// ============================================

export async function fetchMakes(config: TradeInApiConfig): Promise<Make[]> {
  const baseUrl = config.baseUrl || DEFAULT_CENTRAL_API_URL;
  
  const response = await fetch(`${baseUrl}/api/makes`, {
    headers: {
      'X-API-Key': config.apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch makes: ${response.status}`);
  }

  return response.json() as Promise<Make[]>;
}

// ============================================
// FETCH MODELS
// ============================================

export async function fetchModels(
  config: TradeInApiConfig,
  year: number,
  makeId: number
): Promise<Model[]> {
  const baseUrl = config.baseUrl || DEFAULT_CENTRAL_API_URL;
  
  const response = await fetch(
    `${baseUrl}/api/models?model_year=${year}&make_id=${makeId}`,
    {
      headers: {
        'X-API-Key': config.apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }

  return response.json() as Promise<Model[]>;
}

// ============================================
// GET VALUATION
// ============================================

export async function getValuation(
  config: TradeInApiConfig,
  vehicle: TradeInVehicle
): Promise<TradeInValuation> {
  const baseUrl = config.baseUrl || DEFAULT_CENTRAL_API_URL;
  const margin = config.tradeInMargin ?? DEFAULT_TRADE_IN_MARGIN;
  
  const response = await fetch(`${baseUrl}/api/trade-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim || 'Base',
      mileage: vehicle.mileage,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get valuation: ${response.status}`);
  }

  const data = await response.json() as { asking_price: number };
  const askingPrice = data.asking_price;
  const ourValue = Math.round(askingPrice * (1 - margin));

  return {
    askingPrice,
    ourValue,
    vehicle,
  };
}

// ============================================
// GENERATE YEARS
// ============================================

export function generateYears(startYear: number = 2000): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from(
    { length: currentYear - startYear + 1 }, 
    (_, i) => currentYear - i
  );
}
