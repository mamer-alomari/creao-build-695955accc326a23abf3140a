
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface IncidentModel {
    id: string;
    create_time: string;
    type: "injury" | "damage" | "vehicle_issue" | "other";
    description: string;
    job_id?: string;
    reported_by: string; // User ID
    company_id: string;
    status: "open" | "investigating" | "resolved";
    photos?: string[];
}

export class IncidentORM {
    private static instance: IncidentORM | null = null;
    private collectionName = "incidents";

    private constructor() { }

    public static getInstance(): IncidentORM {
        if (!IncidentORM.instance) {
            IncidentORM.instance = new IncidentORM();
        }
        return IncidentORM.instance;
    }

    async createIncident(data: Omit<IncidentModel, "id" | "create_time" | "status">): Promise<IncidentModel> {
        const newDocRef = doc(collection(db, this.collectionName));
        const now = new Date().toISOString();

        const newItem: IncidentModel = {
            ...data,
            id: newDocRef.id,
            create_time: now,
            status: "open"
        };

        await setDoc(newDocRef, newItem);
        return newItem;
    }

    async getIncidentsByCompany(companyId: string): Promise<IncidentModel[]> {
        const q = query(collection(db, this.collectionName), where("company_id", "==", companyId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as IncidentModel);
    }
}
