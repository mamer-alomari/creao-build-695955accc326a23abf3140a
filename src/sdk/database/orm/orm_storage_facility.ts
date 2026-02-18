
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    QueryConstraint
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export interface StorageFacilityModel {
    id: string;
    create_time: string;
    update_time: string;
    data_creator: string;
    data_updater: string;

    company_id: string; // The moving company that saved this facility

    name: string;
    address: string;
    phone?: string;
    website?: string;
    rating?: number;
    user_ratings_total?: number;
    google_place_id?: string;
    notes?: string;

    // Geometry for map display
    location?: {
        lat: number;
        lng: number;
    };
}

export class StorageFacilityORM {
    private static instance: StorageFacilityORM | null = null;
    private collectionName = "storage_facilities";

    private constructor() { }

    public static getInstance(): StorageFacilityORM {
        if (!StorageFacilityORM.instance) {
            StorageFacilityORM.instance = new StorageFacilityORM();
        }
        return StorageFacilityORM.instance;
    }

    private getCurrentUserId(): string {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            throw new Error('Authentication required');
        }
        return userId;
    }

    private getCurrentTime(): string {
        return new Date().toISOString();
    }

    async insertFacility(data: Omit<StorageFacilityModel, "id" | "create_time" | "update_time" | "data_creator" | "data_updater">): Promise<StorageFacilityModel> {
        const newDocRef = doc(collection(db, this.collectionName));
        const now = this.getCurrentTime();
        const userId = this.getCurrentUserId();

        const newItem: StorageFacilityModel = {
            ...data,
            id: newDocRef.id,
            create_time: now,
            update_time: now,
            data_creator: userId,
            data_updater: userId,
        };

        // Deep sanitize using JSON methods to remove all undefined values
        const sanitizedItem = JSON.parse(JSON.stringify(newItem));

        await setDoc(newDocRef, sanitizedItem);
        return sanitizedItem;
    }

    async getFacilitiesByCompanyId(companyId: string): Promise<StorageFacilityModel[]> {
        const q = query(collection(db, this.collectionName), where("company_id", "==", companyId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as StorageFacilityModel);
    }

    async deleteFacility(id: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, id));
    }

    async updateFacility(id: string, data: Partial<StorageFacilityModel>): Promise<void> {
        const docRef = doc(db, this.collectionName, id);
        const now = this.getCurrentTime();
        const userId = this.getCurrentUserId();

        await setDoc(docRef, {
            ...data,
            update_time: now,
            data_updater: userId
        }, { merge: true });
    }
}
