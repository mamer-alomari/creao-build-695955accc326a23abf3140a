
/**
 * Extracts the state (short code or full name) from an address string.
 * This is a basic implementation assuming standard US address formats like "City, State Zip" or "City, State, Country".
 * It looks for a 2-letter state code or matches against a list of full state names if needed.
 * For robustness with Google Places, we often get "City, State, USA" or "City, State Zip, USA".
 */
export function extractState(address: string): string | null {
    if (!address) return null;

    // Simple regex to find 2-letter state code before zip or country
    // Pattern: comma, space, 2 uppercase letters, then space/comma/end
    const stateRegex = /,\s+([A-Z]{2})\b/i;
    const match = address.match(stateRegex);

    if (match && match[1]) {
        return match[1].toUpperCase();
    }

    return null;
}

/**
 * Classifies a move as "intrastate" or "interstate" based on pickup and dropoff addresses.
 */
export function classifyJobType(pickup: string, dropoff: string): "intrastate" | "interstate" | undefined {
    const pickupState = extractState(pickup);
    const dropoffState = extractState(dropoff);

    if (!pickupState || !dropoffState) {
        return undefined;
    }

    return pickupState === dropoffState ? "intrastate" : "interstate";
}
