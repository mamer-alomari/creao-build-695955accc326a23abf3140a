/**
 * Address parsing utilities — server-side port, pure functions.
 */

export function extractState(address: string): string | null {
  if (!address) return null;
  const stateRegex = /,\s+([A-Z]{2})\b/i;
  const match = address.match(stateRegex);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  return null;
}

export function classifyJobType(
  pickup: string,
  dropoff: string
): "intrastate" | "interstate" | undefined {
  const pickupState = extractState(pickup);
  const dropoffState = extractState(dropoff);
  if (!pickupState || !dropoffState) return undefined;
  return pickupState === dropoffState ? "intrastate" : "interstate";
}
