"use strict";
/**
 * AI-powered quote calculation engine for moving jobs.
 * Server-side port — pure functions, no browser dependencies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAIQuote = calculateAIQuote;
const VOLUME_BY_SIZE = {
    small: 2,
    medium: 8,
    large: 20,
    "extra-large": 40,
};
const WEIGHT_BY_SIZE = {
    small: 10,
    medium: 40,
    large: 100,
    "extra-large": 200,
};
const LABOR_RATE_PER_HOUR = 75;
const FUEL_COST_PER_MILE = 0.8;
const MATERIALS_COST_PER_ITEM = 0.5;
const INSURANCE_RATE = 0.02;
const INTERSTATE_SURCHARGE = 0.15;
function parseDistance(distanceStr) {
    if (!distanceStr)
        return 0;
    const match = distanceStr.match(/([\d,.]+)\s*(mi|km)?/i);
    if (!match)
        return 0;
    const value = parseFloat(match[1].replace(",", ""));
    const unit = (match[2] || "mi").toLowerCase();
    return unit === "km" ? value * 0.621371 : value;
}
function calculateAIQuote(rooms, distanceOrStr, classification) {
    var _a, _b, _c, _d;
    let totalVolumeCuFt = 0;
    let totalWeightLbs = 0;
    let itemCount = 0;
    for (const room of rooms) {
        for (const item of room.items) {
            const qty = item.quantity || 1;
            itemCount += qty;
            const size = item.estimatedSize || "medium";
            const vol = (_a = item.volumeCuFt) !== null && _a !== void 0 ? _a : ((_b = VOLUME_BY_SIZE[size]) !== null && _b !== void 0 ? _b : 8);
            const wt = (_c = item.weightLbs) !== null && _c !== void 0 ? _c : ((_d = WEIGHT_BY_SIZE[size]) !== null && _d !== void 0 ? _d : 40);
            totalVolumeCuFt += vol * qty;
            totalWeightLbs += wt * qty;
        }
    }
    const estimatedHours = Math.max(2, Math.round(2 + totalVolumeCuFt / 50 + totalWeightLbs / 200));
    const distanceMiles = typeof distanceOrStr === "number"
        ? distanceOrStr
        : parseDistance(distanceOrStr);
    const laborCost = Math.round(estimatedHours * LABOR_RATE_PER_HOUR);
    const fuelCost = Math.round(distanceMiles * FUEL_COST_PER_MILE);
    const materialsCost = Math.round(itemCount * MATERIALS_COST_PER_ITEM);
    const baseCost = laborCost + fuelCost + materialsCost;
    const insuranceCost = Math.round(baseCost * INSURANCE_RATE);
    let totalEstimate = baseCost + insuranceCost;
    if (classification === "interstate") {
        totalEstimate = Math.round(totalEstimate * (1 + INTERSTATE_SURCHARGE));
    }
    return {
        laborCost,
        fuelCost,
        materialsCost,
        insuranceCost,
        totalEstimate,
        details: {
            estimatedHours,
            distanceMiles: Math.round(distanceMiles),
            itemCount,
            totalVolumeCuFt: Math.round(totalVolumeCuFt),
            totalWeightLbs: Math.round(totalWeightLbs),
        },
    };
}
//# sourceMappingURL=quote-engine.js.map