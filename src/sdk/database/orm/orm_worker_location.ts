
import {
    collection,
    doc,
    setDoc,
    query,
    where,
    getDocs,
    limit,
    orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface WorkerLocationModel {
    id: string; // worker_id
    worker_name: string;
    company_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    status: "active" | "inactive";
}

export class WorkerLocationORM {
    private static instance: WorkerLocationORM | null = null;
    private collectionName = "worker_locations";

    private constructor() { }

    public static getInstance(): WorkerLocationORM {
        if (!WorkerLocationORM.instance) {
            WorkerLocationORM.instance = new WorkerLocationORM();
        }
        return WorkerLocationORM.instance;
    }

    /**
     * Update Worker Location (Upsert)
     */
    async updateLocation(data: WorkerLocationModel): Promise<void> {
        const docRef = doc(db, this.collectionName, data.id); // One doc per worker
        await setDoc(docRef, data);
    }

    /**
     * Get Locations for Company (Real-time usually, but snapshot here)
     */
    async getLocationsByCompany(companyId: string): Promise<WorkerLocationModel[]> {
        const q = query(
            collection(db, this.collectionName),
            where("company_id", "==", companyId),
            where("status", "==", "active")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as WorkerLocationModel);
    }
}
