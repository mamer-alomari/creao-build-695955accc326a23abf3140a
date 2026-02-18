
import { useState, useEffect } from "react";

// Add Google Maps type definitions for TypeScript if not already declared globally
// In a real project with @types/google.maps, this might not be needed, but good for safety.
declare global {
    interface Window {
        google: any;
    }
}

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-script";

export function useGoogleMaps(apiKey?: string) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get API key from env or options
    const key = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        if (!key) {
            console.warn("Google Maps API key is missing.");
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
        // Ensure "places" library is loaded
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setIsLoaded(true);
        script.onerror = () => setError("Failed to load Google Maps script");

        document.head.appendChild(script);
    }, [key]);

    return { isLoaded, error };
}
