
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    QueryConstraint,
    Timestamp
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

/**
 * Enumeration for MaintenanceType
 */
export enum MaintenanceType {
    Unspecified = 0,
    Routine = 1,
    Repair = 2,
    Inspection = 3,
    Upgrade = 4,
}

/**
 * Interface for MaintenanceRecordModel
 */
export interface MaintenanceRecordModel {
    id: string;
    data_creator: string;
    data_updater: string;
    create_time: string;
    update_time: string;
    company_id: string;
    vehicle_id: string;
    service_date: string;
    description: string;
    cost: number;
    performed_by: string;
    odometer_reading?: number | null;
    type: MaintenanceType;
    notes?: string | null;
}

// Re-export common types
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for MaintenanceRecord entity using Firestore.
 */
export class MaintenanceRecordORM {
    private static instance: MaintenanceRecordORM | null = null;
    private collectionName = "maintenance_records";

    private constructor() { }

    public static getInstance(): MaintenanceRecordORM {
        if (!MaintenanceRecordORM.instance) {
            MaintenanceRecordORM.instance = new MaintenanceRecordORM();
        }
        return MaintenanceRecordORM.instance;
    }

    /* Helper to get current user ID */
    private getCurrentUserId(): string {
        return auth.currentUser?.uid || "system";
    }

    /* Helper to get current timestamp ISO string */
    private getCurrentTime(): string {
        return new Date().toISOString();
    }

    /**
     * Get maintenance_record by IDs
     */
    async getMaintenanceRecordByIDs(ids: string[]): Promise<MaintenanceRecordModel[]> {
        if (ids.length === 0) return [];

        const results: MaintenanceRecordModel[] = [];
        const chunkSize = 10;
        for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize);
            const q = query(collection(db, this.collectionName), where("id", "in", chunk));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                results.push(doc.data() as MaintenanceRecordModel);
            });
        }
        return results;
    }

    /**
     * Delete maintenance_record by IDs
     */
    async deleteMaintenanceRecordByIDs(ids: string[]): Promise<void> {
        const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
        await Promise.all(promises);
    }

    /**
     * Get all MaintenanceRecord records
     */
    async getAllMaintenanceRecord(): Promise<MaintenanceRecordModel[]> {
        const querySnapshot = await getDocs(collection(db, this.collectionName));
        return querySnapshot.docs.map(doc => doc.data() as MaintenanceRecordModel);
    }

    /**
     * Insert (create) new MaintenanceRecord record(s)
     */
    async insertMaintenanceRecord(data: MaintenanceRecordModel[]): Promise<MaintenanceRecordModel[]> {
        const inserted: MaintenanceRecordModel[] = [];

        for (const item of data) {
            const newDocRef = doc(collection(db, this.collectionName));
            const now = this.getCurrentTime();
            const userId = this.getCurrentUserId();

            const newItem: MaintenanceRecordModel = {
                ...item,
                id: item.id || newDocRef.id,
                data_creator: userId,
                data_updater: userId,
                create_time: now,
                update_time: now,
            };

            await setDoc(newDocRef, newItem);
            inserted.push(newItem);
        }

        return inserted;
    }

    /**
     * Purge all MaintenanceRecord records
     */
    async purgeAllMaintenanceRecord(): Promise<void> {
        const snapshot = await getDocs(collection(db, this.collectionName));
        const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(promises);
    }

    /**
     * List MaintenanceRecord records with filters
     */
    async listMaintenanceRecord(filter?: any, sort?: any, paginate?: any): Promise<[MaintenanceRecordModel[], any]> {
        let constraints: QueryConstraint[] = [];

        if (filter?.simples) {
            for (const f of filter.simples) {
                let val = undefined;
                if (f.value?.string) val = f.value.string;
                else if (f.value?.number !== undefined) val = f.value.number;
                else if (f.value?.enumeration !== undefined) val = f.value.enumeration;
                else if (f.value?.boolean !== undefined) val = f.value.boolean;

                if (val !== undefined) {
                    if (f.symbol === 1) constraints.push(where(f.field, "==", val));
                }
            }
        }

        if (sort?.orders) {
            for (const order of sort.orders) {
                constraints.push(orderBy(order.field, order.symbol === 1 ? "asc" : "desc"));
            }
        }

        const q = query(collection(db, this.collectionName), ...constraints);
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(d => d.data() as MaintenanceRecordModel);

        return [results, { number: 1, size: results.length, total: results.length }];
    }

    /**
     * Get maintenance_record by Id index
     */
    async getMaintenanceRecordById(id: string): Promise<MaintenanceRecordModel[]> {
        const docRef = doc(db, this.collectionName, id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return [snapshot.data() as MaintenanceRecordModel];
        }
        return [];
    }

    /**
     * Set (update) maintenance_record by Id index
     */
    async setMaintenanceRecordById(id: string, data: MaintenanceRecordModel): Promise<MaintenanceRecordModel[]> {
        const docRef = doc(db, this.collectionName, id);
        const now = this.getCurrentTime();
        const userId = this.getCurrentUserId();

        const existing = await getDoc(docRef);
        let existingData = existing.exists() ? existing.data() as MaintenanceRecordModel : null;

        const updatedItem: MaintenanceRecordModel = {
            ...data,
            id: id,
            data_updater: userId,
            update_time: now,
            data_creator: existingData?.data_creator || data.data_creator || userId,
            create_time: existingData?.create_time || data.create_time || now,
        };

        await setDoc(docRef, updatedItem);
        return [updatedItem];
    }

    /**
     * Delete maintenance_record by Id index
     */
    async deleteMaintenanceRecordById(id: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, id));
    }

    /**
     * Get maintenance_record by CompanyId index
     */
    async getMaintenanceRecordByCompanyId(company_id: string): Promise<MaintenanceRecordModel[]> {
        const q = query(collection(db, this.collectionName), where("company_id", "==", company_id));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as MaintenanceRecordModel);
    }

    async setMaintenanceRecordByCompanyId(company_id: string, data: MaintenanceRecordModel): Promise<MaintenanceRecordModel[]> {
        if (data.id) return this.setMaintenanceRecordById(data.id, data);
        const items = await this.getMaintenanceRecordByCompanyId(company_id);
        if (items.length > 0) return this.setMaintenanceRecordById(items[0].id, data);
        return this.insertMaintenanceRecord([data]);
    }

    async deleteMaintenanceRecordByCompanyId(company_id: string): Promise<void> {
        const items = await this.getMaintenanceRecordByCompanyId(company_id);
        const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
        await Promise.all(promises);
    }

    /**
     * Get maintenance_record by VehicleId index
     */
    async getMaintenanceRecordByVehicleId(vehicle_id: string): Promise<MaintenanceRecordModel[]> {
        const q = query(collection(db, this.collectionName), where("vehicle_id", "==", vehicle_id));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as MaintenanceRecordModel);
    }

    async setMaintenanceRecordByVehicleId(vehicle_id: string, data: MaintenanceRecordModel): Promise<MaintenanceRecordModel[]> {
        if (data.id) return this.setMaintenanceRecordById(data.id, data);
        const items = await this.getMaintenanceRecordByVehicleId(vehicle_id);
        if (items.length > 0) return this.setMaintenanceRecordById(items[0].id, data);
        return this.insertMaintenanceRecord([data]);
    }

    async deleteMaintenanceRecordByVehicleId(vehicle_id: string): Promise<void> {
        const items = await this.getMaintenanceRecordByVehicleId(vehicle_id);
        const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
        await Promise.all(promises);
    }

    /**
     * Get maintenance_record by ServiceDate index
     */
    async getMaintenanceRecordByServiceDate(service_date: string): Promise<MaintenanceRecordModel[]> {
        const q = query(collection(db, this.collectionName), where("service_date", "==", service_date));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as MaintenanceRecordModel);
    }

    async setMaintenanceRecordByServiceDate(service_date: string, data: MaintenanceRecordModel): Promise<MaintenanceRecordModel[]> {
        if (data.id) return this.setMaintenanceRecordById(data.id, data);
        // Not suitable for unique index logic usually, but maintaining pattern
        return this.insertMaintenanceRecord([data]);
    }

    async deleteMaintenanceRecordByServiceDate(service_date: string): Promise<void> {
        const items = await this.getMaintenanceRecordByServiceDate(service_date);
        const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
        await Promise.all(promises);
    }

    async getMaintenanceRecordByDataCreator(data_creator: string): Promise<MaintenanceRecordModel[]> {
        const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as MaintenanceRecordModel);
    }

    async setMaintenanceRecordByDataCreator(data_creator: string, data: MaintenanceRecordModel): Promise<MaintenanceRecordModel[]> {
        if (data.id) return this.setMaintenanceRecordById(data.id, data);
        return this.insertMaintenanceRecord([data]);
    }

    async deleteMaintenanceRecordByDataCreator(data_creator: string): Promise<void> {
        const items = await this.getMaintenanceRecordByDataCreator(data_creator);
        const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
        await Promise.all(promises);
    }

    async getMaintenanceRecordByDataUpdater(data_updater: string): Promise<MaintenanceRecordModel[]> {
        const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as MaintenanceRecordModel);
    }

    async setMaintenanceRecordByDataUpdater(data_updater: string, data: MaintenanceRecordModel): Promise<MaintenanceRecordModel[]> {
        if (data.id) return this.setMaintenanceRecordById(data.id, data);
        return this.insertMaintenanceRecord([data]);
    }

    async deleteMaintenanceRecordByDataUpdater(data_updater: string): Promise<void> {
        const items = await this.getMaintenanceRecordByDataUpdater(data_updater);
        const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
        await Promise.all(promises);
    }
}

export default MaintenanceRecordORM;
