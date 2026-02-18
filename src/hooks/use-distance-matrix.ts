import { useState, useCallback } from "react";
import { useGoogleMaps } from "./use-google-maps";

interface DistanceMatrixResult {
    distance: {
        text: string;
        value: number; // in meters
    };
    duration: {
        text: string;
        value: number; // in seconds
    };
}

interface UseDistanceMatrixOptions {
    apiKey?: string;
}

export function useDistanceMatrix(options: UseDistanceMatrixOptions = {}) {
    // Determine API key
    const apiKey = options.apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    // Use shared hook to load script
    const { isLoaded, error: loadError } = useGoogleMaps(apiKey);

    // Local state for calculation
    const [isLoading, setIsLoading] = useState(false);
    const [calcError, setCalcError] = useState<string | null>(null);

    const calculateDistance = useCallback(async (origin: string, destination: string): Promise<DistanceMatrixResult | null> => {
        if (!isLoaded || !window.google) {
            setCalcError(loadError || "Google Maps not loaded yet");
            return null;
        }

        setIsLoading(true);
        setCalcError(null);

        return new Promise((resolve, reject) => {
            const service = new window.google.maps.DistanceMatrixService();

            service.getDistanceMatrix(
                {
                    origins: [origin],
                    destinations: [destination],
                    travelMode: window.google.maps.TravelMode.DRIVING,
                    unitSystem: window.google.maps.UnitSystem.IMPERIAL,
                },
                (response: any, status: string) => {
                    setIsLoading(false);

                    if (status !== "OK") {
                        const errorMsg = `Distance Matrix failed: ${status}`;
                        setCalcError(errorMsg);
                        reject(new Error(errorMsg));
                        return;
                    }

                    const element = response.rows[0].elements[0];

                    if (element.status !== "OK") {
                        const errorMsg = `Could not calculate distance: ${element.status}`;
                        // Don't error hard on "ZERO_RESULTS" or "NOT_FOUND", just return null
                        console.warn(errorMsg);
                        resolve(null);
                        return;
                    }

                    resolve({
                        distance: element.distance,
                        duration: element.duration,
                    });
                }
            );
        });
    }, [isLoaded, loadError]);

    return {
        isLoaded,
        error: calcError || loadError,
        isLoading,
        calculateDistance,
        apiKey,
    };
}
