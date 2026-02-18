
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    query,
    where,
    deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface InvitationModel {
    id: string; // The token itself or a UUID
    email: string;
    name?: string;
    phone_number?: string;
    role: "worker" | "manager";
    company_id: string;
    status: "pending" | "accepted";
    create_time: string;
    expires_at: string; // ISO string
    created_by: string; // Manager UID
}

export class InvitationORM {
    private static instance: InvitationORM | null = null;
    private collectionName = "invitations";

    private constructor() { }

    public static getInstance(): InvitationORM {
        if (!InvitationORM.instance) {
            InvitationORM.instance = new InvitationORM();
        }
        return InvitationORM.instance;
    }

    /**
     * Create a new invitation
     */
    async createInvitation(data: Omit<InvitationModel, "id" | "create_time" | "status">): Promise<InvitationModel> {
        // Use a random ID as the token for simplicity, or generate a separate token field.
        // For this implementation, the document ID IS the token.
        const newDocRef = doc(collection(db, this.collectionName));
        const now = new Date().toISOString();

        const newItem: InvitationModel = {
            ...data,
            id: newDocRef.id,
            create_time: now,
            status: "pending"
        };

        await setDoc(newDocRef, newItem);
        return newItem;
    }

    /**
     * Get Invitation by Token (ID)
     */
    async getInvitationByToken(token: string): Promise<InvitationModel | null> {
        const docRef = doc(db, this.collectionName, token);
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? (snapshot.data() as InvitationModel) : null;
    }

    /**
     * Mark invitation as accepted
     */
    async acceptInvitation(token: string): Promise<void> {
        const docRef = doc(db, this.collectionName, token);
        await setDoc(docRef, { status: "accepted" }, { merge: true });
    }

    /**
     * Get Pending Invitations for a Company
     */
    async getPendingInvitationsByCompany(companyId: string): Promise<InvitationModel[]> {
        const q = query(
            collection(db, this.collectionName),
            where("company_id", "==", companyId),
            where("status", "==", "pending")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as InvitationModel);
    }

    /**
     * Delete/Revoke Invitation
     */
    async deleteInvitation(token: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, token));
    }
}
