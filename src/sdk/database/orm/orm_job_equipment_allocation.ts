
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
 * Interface for JobEquipmentAllocationModel
 */
export interface JobEquipmentAllocationModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  job_id: string;
  equipment_id: string;
  quantity_assigned: number;
}

// Re-export common types
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for JobEquipmentAllocation entity using Firestore.
 */
export class JobEquipmentAllocationORM {
  private static instance: JobEquipmentAllocationORM | null = null;
  private collectionName = "job_equipment_allocations";

  private constructor() { }

  public static getInstance(): JobEquipmentAllocationORM {
    if (!JobEquipmentAllocationORM.instance) {
      JobEquipmentAllocationORM.instance = new JobEquipmentAllocationORM();
    }
    return JobEquipmentAllocationORM.instance;
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
   * Get job_equipment_allocation by IDs
   */
  async getJobEquipmentAllocationByIDs(ids: string[]): Promise<JobEquipmentAllocationModel[]> {
    if (ids.length === 0) return [];

    const results: JobEquipmentAllocationModel[] = [];
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const q = query(collection(db, this.collectionName), where("id", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as JobEquipmentAllocationModel);
      });
    }
    return results;
  }

  /**
   * Delete job_equipment_allocation by IDs
   */
  async deleteJobEquipmentAllocationByIDs(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
    await Promise.all(promises);
  }

  /**
   * Get all JobEquipmentAllocation records
   */
  async getAllJobEquipmentAllocation(): Promise<JobEquipmentAllocationModel[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => doc.data() as JobEquipmentAllocationModel);
  }

  /**
   * Insert (create) new JobEquipmentAllocation record(s)
   */
  async insertJobEquipmentAllocation(data: JobEquipmentAllocationModel[]): Promise<JobEquipmentAllocationModel[]> {
    const inserted: JobEquipmentAllocationModel[] = [];

    for (const item of data) {
      const newDocRef = doc(collection(db, this.collectionName));
      const now = this.getCurrentTime();
      const userId = this.getCurrentUserId();

      const newItem: JobEquipmentAllocationModel = {
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
   * Purge all JobEquipmentAllocation records
   */
  async purgeAllJobEquipmentAllocation(): Promise<void> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  /**
   * List JobEquipmentAllocation records with filters
   */
  async listJobEquipmentAllocation(filter?: any, sort?: any, paginate?: any): Promise<[JobEquipmentAllocationModel[], any]> {
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
    const results = snapshot.docs.map(d => d.data() as JobEquipmentAllocationModel);

    return [results, { number: 1, size: results.length, total: results.length }];
  }

  /**
   * Get job_equipment_allocation by Id index
   */
  async getJobEquipmentAllocationById(id: string): Promise<JobEquipmentAllocationModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return [snapshot.data() as JobEquipmentAllocationModel];
    }
    return [];
  }

  /**
   * Set (update) job_equipment_allocation by Id index
   */
  async setJobEquipmentAllocationById(id: string, data: JobEquipmentAllocationModel): Promise<JobEquipmentAllocationModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const now = this.getCurrentTime();
    const userId = this.getCurrentUserId();

    const existing = await getDoc(docRef);
    let existingData = existing.exists() ? existing.data() as JobEquipmentAllocationModel : null;

    const updatedItem: JobEquipmentAllocationModel = {
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
   * Delete job_equipment_allocation by Id index
   */
  async deleteJobEquipmentAllocationById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  /**
   * Get job_equipment_allocation by JobId index
   */
  async getJobEquipmentAllocationByJobId(job_id: string): Promise<JobEquipmentAllocationModel[]> {
    const q = query(collection(db, this.collectionName), where("job_id", "==", job_id));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobEquipmentAllocationModel);
  }

  async setJobEquipmentAllocationByJobId(job_id: string, data: JobEquipmentAllocationModel): Promise<JobEquipmentAllocationModel[]> {
    if (data.id) return this.setJobEquipmentAllocationById(data.id, data);
    const items = await this.getJobEquipmentAllocationByJobId(job_id);
    if (items.length > 0) return this.setJobEquipmentAllocationById(items[0].id, data);
    return this.insertJobEquipmentAllocation([data]);
  }

  async deleteJobEquipmentAllocationByJobId(job_id: string): Promise<void> {
    const items = await this.getJobEquipmentAllocationByJobId(job_id);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  /**
   * Get job_equipment_allocation by EquipmentId index
   */
  async getJobEquipmentAllocationByEquipmentId(equipment_id: string): Promise<JobEquipmentAllocationModel[]> {
    const q = query(collection(db, this.collectionName), where("equipment_id", "==", equipment_id));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobEquipmentAllocationModel);
  }

  async setJobEquipmentAllocationByEquipmentId(equipment_id: string, data: JobEquipmentAllocationModel): Promise<JobEquipmentAllocationModel[]> {
    if (data.id) return this.setJobEquipmentAllocationById(data.id, data);
    const items = await this.getJobEquipmentAllocationByEquipmentId(equipment_id);
    if (items.length > 0) return this.setJobEquipmentAllocationById(items[0].id, data);
    return this.insertJobEquipmentAllocation([data]);
  }

  async deleteJobEquipmentAllocationByEquipmentId(equipment_id: string): Promise<void> {
    const items = await this.getJobEquipmentAllocationByEquipmentId(equipment_id);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getJobEquipmentAllocationByDataCreator(data_creator: string): Promise<JobEquipmentAllocationModel[]> {
    const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobEquipmentAllocationModel);
  }

  async setJobEquipmentAllocationByDataCreator(data_creator: string, data: JobEquipmentAllocationModel): Promise<JobEquipmentAllocationModel[]> {
    if (data.id) return this.setJobEquipmentAllocationById(data.id, data);
    return this.insertJobEquipmentAllocation([data]);
  }

  async deleteJobEquipmentAllocationByDataCreator(data_creator: string): Promise<void> {
    const items = await this.getJobEquipmentAllocationByDataCreator(data_creator);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getJobEquipmentAllocationByDataUpdater(data_updater: string): Promise<JobEquipmentAllocationModel[]> {
    const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobEquipmentAllocationModel);
  }

  async setJobEquipmentAllocationByDataUpdater(data_updater: string, data: JobEquipmentAllocationModel): Promise<JobEquipmentAllocationModel[]> {
    if (data.id) return this.setJobEquipmentAllocationById(data.id, data);
    return this.insertJobEquipmentAllocation([data]);
  }

  async deleteJobEquipmentAllocationByDataUpdater(data_updater: string): Promise<void> {
    const items = await this.getJobEquipmentAllocationByDataUpdater(data_updater);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }
}

export default JobEquipmentAllocationORM;