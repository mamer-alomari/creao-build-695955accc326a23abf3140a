
import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { Loader2 } from "lucide-react";

interface MapRouteViewProps {
    origin?: string | google.maps.LatLngLiteral | null;
    destination: string | google.maps.LatLngLiteral;
    className?: string;
}

export function MapRouteView({ origin, destination, className }: MapRouteViewProps) {
    const { isLoaded, error } = useGoogleMaps();
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
    const [routeError, setRouteError] = useState<string | null>(null);

    // Initialize Map
    useEffect(() => {
        if (isLoaded && mapRef.current && !mapInstance) {
            const map = new window.google.maps.Map(mapRef.current, {
                zoom: 10,
                center: { lat: 39.8283, lng: -98.5795 }, // Center of US roughly
                mapTypeControl: false,
                streetViewControl: false,
            });
            setMapInstance(map);

            const renderer = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: false, // Let Google draw A/B markers
            });
            setDirectionsRenderer(renderer);
        }
    }, [isLoaded]);

    // Calculate Route or Show Destination
    useEffect(() => {
        console.log("MapRouteView: Checking dependencies", { isLoaded, hasMap: !!mapInstance, hasRenderer: !!directionsRenderer, origin, destination });

        if (isLoaded && mapInstance && directionsRenderer && destination) {
            // If we have an origin, calculate route
            if (origin) {
                console.log("MapRouteView: Calculating route...", { origin, destination });
                const directionsService = new window.google.maps.DirectionsService();

                directionsService.route(
                    {
                        origin: origin,
                        destination: destination,
                        travelMode: window.google.maps.TravelMode.DRIVING,
                    },
                    (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
                        console.log("MapRouteView: Route result", { status, result });
                        if (status === window.google.maps.DirectionsStatus.OK && result) {
                            directionsRenderer.setDirections(result);
                            setRouteError(null);
                        } else {
                            console.error("Directions request failed due to " + status);
                            setRouteError("Could not calculate route. Showing destination.");
                            // Fallback: Geocode destination and center map (if possible via PlacesService or just leave it)
                            // Since we might not have Geocoding API, we'll rely on the renderer or just existing center if this fails.
                        }
                    }
                );
            } else {
                // No origin yet - just try to show the map. 
                // We could try to geocode the destination here to center the map, but we don't have a configured Geocoder in this component.
                // For now, we will just clear the directions.
                console.log("MapRouteView: No origin provided yet. Waiting for location.");
                directionsRenderer.setDirections({ routes: [] } as any); // Clear
            }
        }
    }, [isLoaded, mapInstance, directionsRenderer, origin, destination]);

    if (error) {
        return <div className="h-64 flex items-center justify-center bg-muted text-destructive">Map Error: {error}</div>;
    }

    if (!isLoaded) {
        return (
            <div className={`h-64 flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading Maps...
            </div>
        );
    }

    return (
        <div className={`relative rounded-md overflow-hidden border shadow-sm ${className}`}>
            <div ref={mapRef} className="w-full h-full min-h-[300px]" />
            {routeError && (
                <div className="absolute top-2 left-2 right-2 bg-destructive/90 text-destructive-foreground p-2 text-sm rounded z-10 text-center">
                    {routeError}
                </div>
            )}
        </div>
    );
}
