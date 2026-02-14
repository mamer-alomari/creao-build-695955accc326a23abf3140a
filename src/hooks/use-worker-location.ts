
import { useEffect } from "react";
import { useCreaoAuth } from "@/sdk/core/auth";
import { WorkerLocationORM } from "@/sdk/database/orm/orm_worker_location";

export function useWorkerLocationTracker() {
    const { user, companyId, role } = useCreaoAuth();

    useEffect(() => {
        if (!user || !companyId || role !== "worker") return;

        // Check permission
        if (!("geolocation" in navigator)) return;

        let watchId: number;

        const success = async (pos: GeolocationPosition) => {
            try {
                await WorkerLocationORM.getInstance().updateLocation({
                    id: user.uid,
                    worker_name: user.displayName || user.email || "Unknown",
                    company_id: companyId,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    timestamp: new Date().toISOString(),
                    status: "active"
                });
            } catch (err) {
                console.error("Failed to update location", err);
            }
        };

        const error = (err: GeolocationPositionError) => {
            console.warn("Location error", err);
        };

        // Start watching
        watchId = navigator.geolocation.watchPosition(success, error, {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 10000
        });

        // Cleanup: Mark inactive? Or just stop watching. 
        // For now just stop watching to save battery.
        return () => {
            navigator.geolocation.clearWatch(watchId);
        };

    }, [user, companyId, role]);
}
