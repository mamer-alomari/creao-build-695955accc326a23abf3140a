"use strict";
/**
 * Address parsing utilities — server-side port, pure functions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractState = extractState;
exports.classifyJobType = classifyJobType;
function extractState(address) {
    if (!address)
        return null;
    const stateRegex = /,\s+([A-Z]{2})\b/i;
    const match = address.match(stateRegex);
    if (match && match[1]) {
        return match[1].toUpperCase();
    }
    return null;
}
function classifyJobType(pickup, dropoff) {
    const pickupState = extractState(pickup);
    const dropoffState = extractState(dropoff);
    if (!pickupState || !dropoffState)
        return undefined;
    return pickupState === dropoffState ? "intrastate" : "interstate";
}
//# sourceMappingURL=address-utils.js.map