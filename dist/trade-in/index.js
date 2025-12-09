"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/trade-in/index.ts
var trade_in_exports = {};
__export(trade_in_exports, {
  applyDealerMargin: () => applyDealerMargin,
  calculateNetTradeValue: () => calculateNetTradeValue,
  fetchMakes: () => fetchMakes,
  fetchModels: () => fetchModels,
  generateYears: () => generateYears,
  getNetTradeFromSubmission: () => getNetTradeFromSubmission,
  getValuation: () => getValuation
});
module.exports = __toCommonJS(trade_in_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyDealerMargin,
  calculateNetTradeValue,
  fetchMakes,
  fetchModels,
  generateYears,
  getNetTradeFromSubmission,
  getValuation
});
//# sourceMappingURL=index.js.map