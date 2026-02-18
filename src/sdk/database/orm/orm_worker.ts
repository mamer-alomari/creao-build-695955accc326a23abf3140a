
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
 * Enumeration for WorkerRole
 */
export enum WorkerRole {
  Unspecified = 0,
  Mover = 1,
  Driver = 2,
  Supervisor = 3,
}
/**
 * Enumeration for WorkerStatus
 */
export enum WorkerStatus {
  Unspecified = 0,
  Active = 1,
  Inactive = 2,
}

/**
 * Interface for WorkerModel
 */
export interface WorkerModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  full_name: string;
  role: WorkerRole;
  status: WorkerStatus;
  company_id: string;
  hourly_rate?: number;
  email?: string;
  phone_number?: string;
  can_self_schedule?: boolean;
}

// Re-export common types for compatibility
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for Worker entity using Firestore.
 */
export class WorkerORM {
  private static instance: WorkerORM | null = null;
  private collectionName = "workers";

  private constructor() { }

  public static getInstance(): WorkerORM {
    if (!WorkerORM.instance) {
      WorkerORM.instance = new WorkerORM();
    }
    return WorkerORM.instance;
  }

  /* Helper to get current user ID */
  private getCurrentUserId(): string {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error(
        'Authentication required: Cannot perform database operation without authenticated user'
      );
    }
    return userId;
  }

  /* Helper to get current timestamp ISO string */
  private getCurrentTime(): string {
    return new Date().toISOString();
  }

  /**
   * Get worker by IDs
   */
  async getWorkerByIDs(ids: string[]): Promise<WorkerModel[]> {
    if (ids.length === 0) return [];

    const results: WorkerModel[] = [];
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const q = query(collection(db, this.collectionName), where("id", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as WorkerModel);
      });
    }
    return results;
  }

  /**
   * Delete worker by IDs
   */
  async deleteWorkerByIDs(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
    await Promise.all(promises);
  }

  /**
   * Get all Worker records
   */
  async getAllWorker(): Promise<WorkerModel[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => doc.data() as WorkerModel);
  }

  /**
   * Get all Worker records for a specific company
   */
  async getWorkersByCompanyId(companyId: string): Promise<WorkerModel[]> {
    const q = query(collection(db, this.collectionName), where("company_id", "==", companyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as WorkerModel);
  }

  /**
   * Insert (create) new Worker record(s)
   */
  async insertWorker(data: WorkerModel[]): Promise<WorkerModel[]> {
    const inserted: WorkerModel[] = [];

    for (const item of data) {
      const newDocRef = doc(collection(db, this.collectionName));
      const now = this.getCurrentTime();
      const userId = this.getCurrentUserId();

      const newItem: WorkerModel = {
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
   * Purge all Worker records
   */
  async purgeAllWorker(): Promise<void> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  /**
   * List Worker records with filters
   */
  async listWorker(filter?: any, sort?: any, paginate?: any): Promise<[WorkerModel[], any]> {
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
    const results = snapshot.docs.map(d => d.data() as WorkerModel);

    return [results, { number: 1, size: results.length, total: results.length }];
  }

  /**
   * Get worker by Id index
   */
  async getWorkerById(id: string): Promise<WorkerModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return [snapshot.data() as WorkerModel];
    }
    return [];
  }

  /**
   * Set (update) worker by Id index
   */
  async setWorkerById(id: string, data: WorkerModel): Promise<WorkerModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const now = this.getCurrentTime();
    const userId = this.getCurrentUserId();

    const existing = await getDoc(docRef);
    let existingData = existing.exists() ? existing.data() as WorkerModel : null;

    const updatedItem: WorkerModel = {
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
   * Delete worker by Id index
   */
  async deleteWorkerById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  /**
   * Get worker by CompanyIdStatus index
   */
  async getWorkerByCompanyIdStatus(company_id: string, status: WorkerStatus): Promise<WorkerModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("company_id", "==", company_id),
      where("status", "==", status)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as WorkerModel);
  }

  async setWorkerByCompanyIdStatus(company_id: string, status: WorkerStatus, data: WorkerModel): Promise<WorkerModel[]> {
    if (data.id) return this.setWorkerById(data.id, data);

    const workers = await this.getWorkerByCompanyIdStatus(company_id, status);
    if (workers.length > 0) return this.setWorkerById(workers[0].id, data);

    return this.insertWorker([data]);
  }

  async deleteWorkerByCompanyIdStatus(company_id: string, status: WorkerStatus): Promise<void> {
    const workers = await this.getWorkerByCompanyIdStatus(company_id, status);
    const promises = workers.map(w => deleteDoc(doc(db, this.collectionName, w.id)));
    await Promise.all(promises);
  }

  async getWorkerByCompanyIdRole(company_id: string, role: WorkerRole): Promise<WorkerModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("company_id", "==", company_id),
      where("role", "==", role)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as WorkerModel);
  }

  async setWorkerByCompanyIdRole(company_id: string, role: WorkerRole, data: WorkerModel): Promise<WorkerModel[]> {
    if (data.id) return this.setWorkerById(data.id, data);
    const workers = await this.getWorkerByCompanyIdRole(company_id, role);
    if (workers.length > 0) return this.setWorkerById(workers[0].id, data);
    return this.insertWorker([data]);
  }

  async deleteWorkerByCompanyIdRole(company_id: string, role: WorkerRole): Promise<void> {
    const workers = await this.getWorkerByCompanyIdRole(company_id, role);
    const promises = workers.map(w => deleteDoc(doc(db, this.collectionName, w.id)));
    await Promise.all(promises);
  }

  // DataCreator and DataUpdater methods follow the same pattern
  async getWorkerByDataCreator(data_creator: string): Promise<WorkerModel[]> {
    const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as WorkerModel);
  }

  async setWorkerByDataCreator(data_creator: string, data: WorkerModel): Promise<WorkerModel[]> {
    if (data.id) return this.setWorkerById(data.id, data);
    return this.insertWorker([data]);
  }

  async deleteWorkerByDataCreator(data_creator: string): Promise<void> {
    const workers = await this.getWorkerByDataCreator(data_creator);
    const promises = workers.map(w => deleteDoc(doc(db, this.collectionName, w.id)));
    await Promise.all(promises);
  }

  async getWorkerByDataUpdater(data_updater: string): Promise<WorkerModel[]> {
    const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as WorkerModel);
  }

  async setWorkerByDataUpdater(data_updater: string, data: WorkerModel): Promise<WorkerModel[]> {
    if (data.id) return this.setWorkerById(data.id, data);
    return this.insertWorker([data]);
  }

  async deleteWorkerByDataUpdater(data_updater: string): Promise<void> {
    const workers = await this.getWorkerByDataUpdater(data_updater);
    const promises = workers.map(w => deleteDoc(doc(db, this.collectionName, w.id)));
    await Promise.all(promises);
  }
}

export const workerORM = WorkerORM.getInstance();