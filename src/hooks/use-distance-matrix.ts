import { useState, useEffect, useCallback } from "react";

// Add Google Maps type definitions for TypeScript
declare global {
    interface Window {
        google: any;
        initGoogleMaps?: () => void;
    }
}

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

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";

export function useDistanceMatrix(options: UseDistanceMatrixOptions = {}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Get API key from env or options
    const apiKey = options.apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        if (!apiKey) {
            console.warn("Google Maps API key is missing. Distance calculation will not work.");
            setError("API Key missing");
            return;
        }

        // Check if script is already loaded
        if (window.google && window.google.maps) {
            setIsLoaded(true);
            return;
        }

        // Check if script is already being loaded
        const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
        if (existingScript) {
            existingScript.addEventListener("load", () => setIsLoaded(true));
            existingScript.addEventListener("error", () => setError("Failed to load Google Maps script"));
            return;
        }

        // Load script
        const script = document.createElement("script");
        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsLoaded(true);
        script.onerror = () => setError("Failed to load Google Maps script");

        document.head.appendChild(script);

        return () => {
            // Cleanup if needed, though usually we keep the script
        };
    }, [apiKey]);

    const calculateDistance = useCallback(async (origin: string, destination: string): Promise<DistanceMatrixResult | null> => {
        if (!isLoaded || !window.google) {
            setError("Google Maps not loaded yet");
            return null;
        }

        setIsLoading(true);
        setError(null);

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
                        setError(errorMsg);
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
    }, [isLoaded]);

    return {
        isLoaded,
        error,
        isLoading,
        calculateDistance,
        apiKey, // Return checking purposes
    };
}
