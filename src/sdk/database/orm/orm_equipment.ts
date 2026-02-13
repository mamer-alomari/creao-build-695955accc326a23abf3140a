
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
 * Interface for EquipmentModel
 */
export interface EquipmentModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  name: string;
  total_quantity: number;
  description?: string | null;
}

// Re-export common types
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for Equipment entity using Firestore.
 */
export class EquipmentORM {
  private static instance: EquipmentORM | null = null;
  private collectionName = "equipment";

  private constructor() { }

  public static getInstance(): EquipmentORM {
    if (!EquipmentORM.instance) {
      EquipmentORM.instance = new EquipmentORM();
    }
    return EquipmentORM.instance;
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
   * Get equipment by IDs
   */
  async getEquipmentByIDs(ids: string[]): Promise<EquipmentModel[]> {
    if (ids.length === 0) return [];

    const results: EquipmentModel[] = [];
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const q = query(collection(db, this.collectionName), where("id", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as EquipmentModel);
      });
    }
    return results;
  }

  /**
   * Delete equipment by IDs
   */
  async deleteEquipmentByIDs(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
    await Promise.all(promises);
  }

  /**
   * Get all Equipment records
   */
  async getAllEquipment(): Promise<EquipmentModel[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => doc.data() as EquipmentModel);
  }

  /**
   * Insert (create) new Equipment record(s)
   */
  async insertEquipment(data: EquipmentModel[]): Promise<EquipmentModel[]> {
    const inserted: EquipmentModel[] = [];

    for (const item of data) {
      const newDocRef = doc(collection(db, this.collectionName));
      const now = this.getCurrentTime();
      const userId = this.getCurrentUserId();

      const newItem: EquipmentModel = {
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
   * Purge all Equipment records
   */
  async purgeAllEquipment(): Promise<void> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  /**
   * List Equipment records with filters
   */
  async listEquipment(filter?: any, sort?: any, paginate?: any): Promise<[EquipmentModel[], any]> {
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
    const results = snapshot.docs.map(d => d.data() as EquipmentModel);

    return [results, { number: 1, size: results.length, total: results.length }];
  }

  /**
   * Get equipment by Id index
   */
  async getEquipmentById(id: string): Promise<EquipmentModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return [snapshot.data() as EquipmentModel];
    }
    return [];
  }

  /**
   * Set (update) equipment by Id index
   */
  async setEquipmentById(id: string, data: EquipmentModel): Promise<EquipmentModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const now = this.getCurrentTime();
    const userId = this.getCurrentUserId();

    const existing = await getDoc(docRef);
    let existingData = existing.exists() ? existing.data() as EquipmentModel : null;

    const updatedItem: EquipmentModel = {
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
   * Delete equipment by Id index
   */
  async deleteEquipmentById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  /**
   * Get equipment by CompanyIdName index
   */
  async getEquipmentByCompanyIdName(company_id: string, name: string): Promise<EquipmentModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("company_id", "==", company_id),
      where("name", "==", name)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as EquipmentModel);
  }

  async setEquipmentByCompanyIdName(company_id: string, name: string, data: EquipmentModel): Promise<EquipmentModel[]> {
    if (data.id) return this.setEquipmentById(data.id, data);
    const items = await this.getEquipmentByCompanyIdName(company_id, name);
    if (items.length > 0) return this.setEquipmentById(items[0].id, data);
    return this.insertEquipment([data]);
  }

  async deleteEquipmentByCompanyIdName(company_id: string, name: string): Promise<void> {
    const items = await this.getEquipmentByCompanyIdName(company_id, name);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getEquipmentByDataCreator(data_creator: string): Promise<EquipmentModel[]> {
    const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as EquipmentModel);
  }

  async setEquipmentByDataCreator(data_creator: string, data: EquipmentModel): Promise<EquipmentModel[]> {
    if (data.id) return this.setEquipmentById(data.id, data);
    return this.insertEquipment([data]);
  }

  async deleteEquipmentByDataCreator(data_creator: string): Promise<void> {
    const items = await this.getEquipmentByDataCreator(data_creator);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getEquipmentByDataUpdater(data_updater: string): Promise<EquipmentModel[]> {
    const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as EquipmentModel);
  }

  async setEquipmentByDataUpdater(data_updater: string, data: EquipmentModel): Promise<EquipmentModel[]> {
    if (data.id) return this.setEquipmentById(data.id, data);
    return this.insertEquipment([data]);
  }

  async deleteEquipmentByDataUpdater(data_updater: string): Promise<void> {
    const items = await this.getEquipmentByDataUpdater(data_updater);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }
}

export default EquipmentORM;