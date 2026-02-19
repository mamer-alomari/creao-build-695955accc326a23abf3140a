/**
 * AI-powered quote calculation engine for moving jobs.
 * Estimates cost based on inventory items, distance, and job classification.
 */

export interface InventoryItem {
    id?: string;
    name: string;
    quantity: number;
    category?: string;
    estimatedSize?: "small" | "medium" | "large" | "extra-large" | string;
    weightLbs?: number;
    volumeCuFt?: number;
}

export interface RoomInventory {
    roomName: string;
    roomType?: string;
    items: InventoryItem[];
    totalItems?: number;
}

export interface QuoteBreakdown {
    laborCost: number;
    fuelCost: number;
    materialsCost: number;
    insuranceCost: number;
    totalEstimate: number;
    details: {
        estimatedHours: number;
        distanceMiles: number;
        itemCount: number;
        totalVolumeCuFt: number;
        totalWeightLbs: number;
    };
}

// Estimated volume (cubic feet) per item size
const VOLUME_BY_SIZE: Record<string, number> = {
    small: 2,
    medium: 8,
    large: 20,
    "extra-large": 40,
};

// Estimated weight (lbs) per item size
const WEIGHT_BY_SIZE: Record<string, number> = {
    small: 10,
    medium: 40,
    large: 100,
    "extra-large": 200,
};

const LABOR_RATE_PER_HOUR = 75; // $ per mover-hour (2 movers default)
const FUEL_COST_PER_MILE = 0.8;
const MATERIALS_COST_PER_ITEM = 0.5;
const INSURANCE_RATE = 0.02; // 2% of base cost
const INTERSTATE_SURCHARGE = 0.15; // +15% for interstate

function parseDistance(distanceStr?: string): number {
    if (!distanceStr) return 0;
    const match = distanceStr.match(/([\d,.]+)\s*(mi|km)?/i);
    if (!match) return 0;
    const value = parseFloat(match[1].replace(",", ""));
    const unit = (match[2] || "mi").toLowerCase();
    return unit === "km" ? value * 0.621371 : value;
}

/**
 * Calculate an AI-generated quote estimate based on inventory and job details.
 */
export function calculateAIQuote(
    rooms: RoomInventory[],
    distanceStr?: string,
    classification?: string
): QuoteBreakdown {
    let totalVolumeCuFt = 0;
    let totalWeightLbs = 0;
    let itemCount = 0;

    for (const room of rooms) {
        for (const item of room.items) {
            const qty = item.quantity || 1;
            itemCount += qty;
            const size = item.estimatedSize || "medium";
            const vol = item.volumeCuFt ?? (VOLUME_BY_SIZE[size] ?? 8);
            const wt = item.weightLbs ?? (WEIGHT_BY_SIZE[size] ?? 40);
            totalVolumeCuFt += vol * qty;
            totalWeightLbs += wt * qty;
        }
    }

    // Estimate hours: base 2h + 1h per 50 cu ft + 30min per 100 lbs
    const estimatedHours = Math.max(
        2,
        Math.round(2 + totalVolumeCuFt / 50 + totalWeightLbs / 200)
    );

    const distanceMiles = parseDistance(distanceStr);

    const laborCost = Math.round(estimatedHours * LABOR_RATE_PER_HOUR);
    const fuelCost = Math.round(distanceMiles * FUEL_COST_PER_MILE);
    const materialsCost = Math.round(itemCount * MATERIALS_COST_PER_ITEM);
    const baseCost = laborCost + fuelCost + materialsCost;
    const insuranceCost = Math.round(baseCost * INSURANCE_RATE);

    let totalEstimate = baseCost + insuranceCost;

    // Apply interstate surcharge
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
