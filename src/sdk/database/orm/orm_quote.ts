
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
import { db, auth } from "@/lib/firebase"; // Ensure this import path is correct

export interface QuoteModel {
    id: string;
    create_time: string;
    update_time: string;

    // Logistics
    pickup_address: string;
    dropoff_address: string;
    move_date: string; // ISO string

    // Inventory
    inventory_items: any[]; // JSON data of rooms/items
    estimated_volume: number;
    estimated_price_min: number;
    estimated_price_max: number;

    // Contact
    customer_name: string;
    customer_email: string;
    customer_phone: string;

    // Status
    status: "PENDING" | "BOOKED" | "ARCHIVED";
    company_id: string;
    customer_id?: string; // Optional, linked after signup
}

export class QuoteORM {
    private static instance: QuoteORM | null = null;
    private collectionName = "quotes";

    private constructor() { }

    public static getInstance(): QuoteORM {
        if (!QuoteORM.instance) {
            QuoteORM.instance = new QuoteORM();
        }
        return QuoteORM.instance;
    }

    private getCurrentTime(): string {
        return new Date().toISOString();
    }

    /**
     * Insert a new Quote (Public access allowed via Rules)
     */
    async insertQuote(data: Omit<QuoteModel, "id" | "create_time" | "update_time">): Promise<QuoteModel> {
        const newDocRef = doc(collection(db, this.collectionName));
        const now = this.getCurrentTime();

        const newItem: QuoteModel = {
            ...data,
            id: newDocRef.id,
            create_time: now,
            update_time: now,
            status: "PENDING", // Force status to PENDING on creation
        };

        await setDoc(newDocRef, newItem);
        return newItem;
    }

    /**
     * Get Quotes by Company (Authenticated)
     */
    async getQuotesByCompanyId(companyId: string): Promise<QuoteModel[]> {
        const q = query(collection(db, this.collectionName), where("company_id", "==", companyId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as QuoteModel);
    }

    /**
     * Get Quotes by Customer ID
     */
    async getQuotesByCustomerId(customerId: string): Promise<QuoteModel[]> {
        const q = query(collection(db, this.collectionName), where("customer_id", "==", customerId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as QuoteModel);
    }

    /**
     * Get Quote by ID
     */
    async getQuoteById(id: string): Promise<QuoteModel | null> {
        const docRef = doc(db, this.collectionName, id);
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? (snapshot.data() as QuoteModel) : null;
    }

    /**
     * Update Quote Status
     */
    async updateStatus(id: string, status: "PENDING" | "BOOKED" | "ARCHIVED"): Promise<void> {
        const docRef = doc(db, this.collectionName, id);
        await setDoc(docRef, { status, update_time: this.getCurrentTime() }, { merge: true });
    }
}
