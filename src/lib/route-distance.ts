interface DistanceResult {
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
}

/**
 * Calculates total route distance across multiple stops by summing consecutive leg distances.
 * Takes the calculateDistance function from useDistanceMatrix as a callback.
 */
export async function calculateRouteDistance(
  stops: string[],
  calculateDistance: (origin: string, dest: string) => Promise<DistanceResult | null>
): Promise<{ totalMiles: number; legDistances: number[] }> {
  if (stops.length < 2) {
    return { totalMiles: 0, legDistances: [] };
  }

  const legDistances: number[] = [];
  let totalMeters = 0;

  for (let i = 0; i < stops.length - 1; i++) {
    const result = await calculateDistance(stops[i], stops[i + 1]);
    if (result) {
      const miles = result.distance.value / 1609.34;
      legDistances.push(Math.round(miles * 10) / 10);
      totalMeters += result.distance.value;
    } else {
      legDistances.push(0);
    }
  }

  const totalMiles = Math.round((totalMeters / 1609.34) * 10) / 10;
  return { totalMiles, legDistances };
}
