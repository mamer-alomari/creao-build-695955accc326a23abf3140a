
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
 * Enumeration for EquipmentScheduleStatus
 */
export enum EquipmentScheduleStatus {
  Unspecified = 0,
  Available = 1,
  Reserved = 2,
  InMaintenance = 3,
}

/**
 * Interface for EquipmentScheduleModel
 */
export interface EquipmentScheduleModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  equipment_id: string;
  company_id: string;
  schedule_date: string;
  status: EquipmentScheduleStatus;
  reason?: string | null;
}

// Re-export common types
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for EquipmentSchedule entity using Firestore.
 */
export class EquipmentScheduleORM {
  private static instance: EquipmentScheduleORM | null = null;
  private collectionName = "equipment_schedules";

  private constructor() { }

  public static getInstance(): EquipmentScheduleORM {
    if (!EquipmentScheduleORM.instance) {
      EquipmentScheduleORM.instance = new EquipmentScheduleORM();
    }
    return EquipmentScheduleORM.instance;
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
   * Get equipment_schedule by IDs
   */
  async getEquipmentScheduleByIDs(ids: string[]): Promise<EquipmentScheduleModel[]> {
    if (ids.length === 0) return [];

    const results: EquipmentScheduleModel[] = [];
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const q = query(collection(db, this.collectionName), where("id", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as EquipmentScheduleModel);
      });
    }
    return results;
  }

  /**
   * Delete equipment_schedule by IDs
   */
  async deleteEquipmentScheduleByIDs(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
    await Promise.all(promises);
  }

  /**
   * Get all EquipmentSchedule records
   */
  async getAllEquipmentSchedule(): Promise<EquipmentScheduleModel[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => doc.data() as EquipmentScheduleModel);
  }

  /**
   * Insert (create) new EquipmentSchedule record(s)
   */
  async insertEquipmentSchedule(data: EquipmentScheduleModel[]): Promise<EquipmentScheduleModel[]> {
    const inserted: EquipmentScheduleModel[] = [];

    for (const item of data) {
      const newDocRef = doc(collection(db, this.collectionName));
      const now = this.getCurrentTime();
      const userId = this.getCurrentUserId();

      const newItem: EquipmentScheduleModel = {
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
   * Purge all EquipmentSchedule records
   */
  async purgeAllEquipmentSchedule(): Promise<void> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  /**
   * List EquipmentSchedule records with filters
   */
  async listEquipmentSchedule(filter?: any, sort?: any, paginate?: any): Promise<[EquipmentScheduleModel[], any]> {
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
    const results = snapshot.docs.map(d => d.data() as EquipmentScheduleModel);

    return [results, { number: 1, size: results.length, total: results.length }];
  }

  /**
   * Get equipment_schedule by Id index
   */
  async getEquipmentScheduleById(id: string): Promise<EquipmentScheduleModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return [snapshot.data() as EquipmentScheduleModel];
    }
    return [];
  }

  /**
   * Set (update) equipment_schedule by Id index
   */
  async setEquipmentScheduleById(id: string, data: EquipmentScheduleModel): Promise<EquipmentScheduleModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const now = this.getCurrentTime();
    const userId = this.getCurrentUserId();

    const existing = await getDoc(docRef);
    let existingData = existing.exists() ? existing.data() as EquipmentScheduleModel : null;

    const updatedItem: EquipmentScheduleModel = {
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
   * Delete equipment_schedule by Id index
   */
  async deleteEquipmentScheduleById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  /**
   * Get equipment_schedule by EquipmentIdScheduleDate index
   */
  async getEquipmentScheduleByEquipmentIdScheduleDate(equipment_id: string, schedule_date: string): Promise<EquipmentScheduleModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("equipment_id", "==", equipment_id),
      where("schedule_date", "==", schedule_date)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as EquipmentScheduleModel);
  }

  async setEquipmentScheduleByEquipmentIdScheduleDate(equipment_id: string, schedule_date: string, data: EquipmentScheduleModel): Promise<EquipmentScheduleModel[]> {
    if (data.id) return this.setEquipmentScheduleById(data.id, data);
    const items = await this.getEquipmentScheduleByEquipmentIdScheduleDate(equipment_id, schedule_date);
    if (items.length > 0) return this.setEquipmentScheduleById(items[0].id, data);
    return this.insertEquipmentSchedule([data]);
  }

  async deleteEquipmentScheduleByEquipmentIdScheduleDate(equipment_id: string, schedule_date: string): Promise<void> {
    const items = await this.getEquipmentScheduleByEquipmentIdScheduleDate(equipment_id, schedule_date);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  /**
   * Get equipment_schedule by CompanyIdScheduleDate index
   */
  async getEquipmentScheduleByCompanyIdScheduleDate(company_id: string, schedule_date: string): Promise<EquipmentScheduleModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("company_id", "==", company_id),
      where("schedule_date", "==", schedule_date)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as EquipmentScheduleModel);
  }

  async setEquipmentScheduleByCompanyIdScheduleDate(company_id: string, schedule_date: string, data: EquipmentScheduleModel): Promise<EquipmentScheduleModel[]> {
    if (data.id) return this.setEquipmentScheduleById(data.id, data);
    const items = await this.getEquipmentScheduleByCompanyIdScheduleDate(company_id, schedule_date);
    if (items.length > 0) return this.setEquipmentScheduleById(items[0].id, data);
    return this.insertEquipmentSchedule([data]);
  }

  async deleteEquipmentScheduleByCompanyIdScheduleDate(company_id: string, schedule_date: string): Promise<void> {
    const items = await this.getEquipmentScheduleByCompanyIdScheduleDate(company_id, schedule_date);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getEquipmentScheduleByDataCreator(data_creator: string): Promise<EquipmentScheduleModel[]> {
    const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as EquipmentScheduleModel);
  }

  async setEquipmentScheduleByDataCreator(data_creator: string, data: EquipmentScheduleModel): Promise<EquipmentScheduleModel[]> {
    if (data.id) return this.setEquipmentScheduleById(data.id, data);
    return this.insertEquipmentSchedule([data]);
  }

  async deleteEquipmentScheduleByDataCreator(data_creator: string): Promise<void> {
    const items = await this.getEquipmentScheduleByDataCreator(data_creator);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getEquipmentScheduleByDataUpdater(data_updater: string): Promise<EquipmentScheduleModel[]> {
    const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as EquipmentScheduleModel);
  }

  async setEquipmentScheduleByDataUpdater(data_updater: string, data: EquipmentScheduleModel): Promise<EquipmentScheduleModel[]> {
    if (data.id) return this.setEquipmentScheduleById(data.id, data);
    return this.insertEquipmentSchedule([data]);
  }

  async deleteEquipmentScheduleByDataUpdater(data_updater: string): Promise<void> {
    const items = await this.getEquipmentScheduleByDataUpdater(data_updater);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }
}

export default EquipmentScheduleORM;