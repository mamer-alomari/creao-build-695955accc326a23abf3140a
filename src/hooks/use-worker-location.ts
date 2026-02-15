
import { useEffect, useRef } from "react";
import { useCreaoAuth } from "@/sdk/core/auth";
import { WorkerLocationORM } from "@/sdk/database/orm/orm_worker_location";

export function useWorkerLocationTracker() {
    const { user, companyId, role } = useCreaoAuth();
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        if (!user || !companyId || role !== "worker") return;

        // Check permission
        if (!("geolocation" in navigator)) return;

        let watchId: number | null = null;

        const success = async (pos: GeolocationPosition) => {
            // Guard against updates after unmount
            if (!isMountedRef.current) return;

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
            // Guard against updates after unmount
            if (!isMountedRef.current) return;
            console.warn("Location error", err);
        };

        // Start watching position
        watchId = navigator.geolocation.watchPosition(success, error, {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 10000
        });

        // Cleanup function
        return () => {
            isMountedRef.current = false;
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
        };

    }, [user, companyId, role]);
}
