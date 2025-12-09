// src/trade-in/api.ts
var DEFAULT_CENTRAL_API_URL = "https://central-vehicles-node.vercel.app";
var DEFAULT_TRADE_IN_MARGIN = 0.15;
async function fetchMakes(config) {
  const baseUrl = config.baseUrl || DEFAULT_CENTRAL_API_URL;
  const response = await fetch(`${baseUrl}/api/makes`, {
    headers: {
      "X-API-Key": config.apiKey
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch makes: ${response.status}`);
  }
  return response.json();
}
async function fetchModels(config, year, makeId) {
  const baseUrl = config.baseUrl || DEFAULT_CENTRAL_API_URL;
  const response = await fetch(
    `${baseUrl}/api/models?model_year=${year}&make_id=${makeId}`,
    {
      headers: {
        "X-API-Key": config.apiKey
      }
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`);
  }
  return response.json();
}
async function getValuation(config, vehicle) {
  const baseUrl = config.baseUrl || DEFAULT_CENTRAL_API_URL;
  const margin = config.tradeInMargin ?? DEFAULT_TRADE_IN_MARGIN;
  const response = await fetch(`${baseUrl}/api/trade-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey
    },
    body: JSON.stringify({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim || "Base",
      mileage: vehicle.mileage
    })
  });
  if (!response.ok) {
    throw new Error(`Failed to get valuation: ${response.status}`);
  }
  const data = await response.json();
  const askingPrice = data.asking_price;
  const ourValue = Math.round(askingPrice * (1 - margin));
  return {
    askingPrice,
    ourValue,
    vehicle
  };
}
function generateYears(startYear = 2e3) {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  return Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => currentYear - i
  );
}

// src/trade-in/calculations.ts
function calculateNetTradeValue(tradeInValue, lien) {
  return Math.max(0, tradeInValue - (lien || 0));
}
function getNetTradeFromSubmission(submission) {
  return calculateNetTradeValue(submission.desiredAmount, submission.lien);
}
function applyDealerMargin(askingPrice, margin = 0.15) {
  return Math.round(askingPrice * (1 - margin));
}
export {
  applyDealerMargin,
  calculateNetTradeValue,
  fetchMakes,
  fetchModels,
  generateYears,
  getNetTradeFromSubmission,
  getValuation
};
//# sourceMappingURL=index.mjs.map