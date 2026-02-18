
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
 * Interface for JobWorkerAssignmentModel
 */
export interface JobWorkerAssignmentModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  job_id: string;
  worker_id: string;
}

// Re-export common types
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for JobWorkerAssignment entity using Firestore.
 */
export class JobWorkerAssignmentORM {
  private static instance: JobWorkerAssignmentORM | null = null;
  private collectionName = "job_worker_assignments";

  private constructor() { }

  public static getInstance(): JobWorkerAssignmentORM {
    if (!JobWorkerAssignmentORM.instance) {
      JobWorkerAssignmentORM.instance = new JobWorkerAssignmentORM();
    }
    return JobWorkerAssignmentORM.instance;
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
   * Get job_worker_assignment by IDs
   */
  async getJobWorkerAssignmentByIDs(ids: string[]): Promise<JobWorkerAssignmentModel[]> {
    if (ids.length === 0) return [];

    const results: JobWorkerAssignmentModel[] = [];
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const q = query(collection(db, this.collectionName), where("id", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as JobWorkerAssignmentModel);
      });
    }
    return results;
  }

  /**
   * Delete job_worker_assignment by IDs
   */
  async deleteJobWorkerAssignmentByIDs(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
    await Promise.all(promises);
  }

  /**
   * Get all JobWorkerAssignment records
   */
  async getAllJobWorkerAssignment(): Promise<JobWorkerAssignmentModel[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => doc.data() as JobWorkerAssignmentModel);
  }

  /**
   * Get all JobWorkerAssignment records for a specific company
   */
  async getJobWorkerAssignmentByCompanyId(companyId: string): Promise<JobWorkerAssignmentModel[]> {
    const q = query(collection(db, this.collectionName), where("company_id", "==", companyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as JobWorkerAssignmentModel);
  }

  /**
   * Insert (create) new JobWorkerAssignment record(s)
   */
  async insertJobWorkerAssignment(data: JobWorkerAssignmentModel[]): Promise<JobWorkerAssignmentModel[]> {
    const inserted: JobWorkerAssignmentModel[] = [];

    for (const item of data) {
      const newDocRef = doc(collection(db, this.collectionName));
      const now = this.getCurrentTime();
      const userId = this.getCurrentUserId();

      const newItem: JobWorkerAssignmentModel = {
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
   * Purge all JobWorkerAssignment records
   */
  async purgeAllJobWorkerAssignment(): Promise<void> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  /**
   * List JobWorkerAssignment records with filters
   */
  async listJobWorkerAssignment(filter?: any, sort?: any, paginate?: any): Promise<[JobWorkerAssignmentModel[], any]> {
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
    const results = snapshot.docs.map(d => d.data() as JobWorkerAssignmentModel);

    return [results, { number: 1, size: results.length, total: results.length }];
  }

  /**
   * Get job_worker_assignment by Id index
   */
  async getJobWorkerAssignmentById(id: string): Promise<JobWorkerAssignmentModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return [snapshot.data() as JobWorkerAssignmentModel];
    }
    return [];
  }

  /**
   * Set (update) job_worker_assignment by Id index
   */
  async setJobWorkerAssignmentById(id: string, data: JobWorkerAssignmentModel): Promise<JobWorkerAssignmentModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const now = this.getCurrentTime();
    const userId = this.getCurrentUserId();

    const existing = await getDoc(docRef);
    let existingData = existing.exists() ? existing.data() as JobWorkerAssignmentModel : null;

    const updatedItem: JobWorkerAssignmentModel = {
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
   * Delete job_worker_assignment by Id index
   */
  async deleteJobWorkerAssignmentById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  /**
   * Get job_worker_assignment by JobId index
   */
  async getJobWorkerAssignmentByJobId(job_id: string, company_id?: string): Promise<JobWorkerAssignmentModel[]> {
    let constraints: QueryConstraint[] = [where("job_id", "==", job_id)];
    if (company_id) {
      constraints.push(where("company_id", "==", company_id));
    }

    const q = query(collection(db, this.collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobWorkerAssignmentModel);
  }

  async setJobWorkerAssignmentByJobId(job_id: string, data: JobWorkerAssignmentModel): Promise<JobWorkerAssignmentModel[]> {
    if (data.id) return this.setJobWorkerAssignmentById(data.id, data);
    const items = await this.getJobWorkerAssignmentByJobId(job_id, data.company_id);
    if (items.length > 0) return this.setJobWorkerAssignmentById(items[0].id, data);
    return this.insertJobWorkerAssignment([data]);
  }

  async deleteJobWorkerAssignmentByJobId(job_id: string, company_id?: string): Promise<void> {
    const items = await this.getJobWorkerAssignmentByJobId(job_id, company_id);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  /**
   * Get job_worker_assignment by WorkerId index
   */
  async getJobWorkerAssignmentByWorkerId(worker_id: string): Promise<JobWorkerAssignmentModel[]> {
    const q = query(collection(db, this.collectionName), where("worker_id", "==", worker_id));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobWorkerAssignmentModel);
  }

  async setJobWorkerAssignmentByWorkerId(worker_id: string, data: JobWorkerAssignmentModel): Promise<JobWorkerAssignmentModel[]> {
    if (data.id) return this.setJobWorkerAssignmentById(data.id, data);
    const items = await this.getJobWorkerAssignmentByWorkerId(worker_id);
    if (items.length > 0) return this.setJobWorkerAssignmentById(items[0].id, data);
    return this.insertJobWorkerAssignment([data]);
  }

  async deleteJobWorkerAssignmentByWorkerId(worker_id: string): Promise<void> {
    const items = await this.getJobWorkerAssignmentByWorkerId(worker_id);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getJobWorkerAssignmentByDataCreator(data_creator: string): Promise<JobWorkerAssignmentModel[]> {
    const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobWorkerAssignmentModel);
  }

  async setJobWorkerAssignmentByDataCreator(data_creator: string, data: JobWorkerAssignmentModel): Promise<JobWorkerAssignmentModel[]> {
    if (data.id) return this.setJobWorkerAssignmentById(data.id, data);
    return this.insertJobWorkerAssignment([data]);
  }

  async deleteJobWorkerAssignmentByDataCreator(data_creator: string): Promise<void> {
    const items = await this.getJobWorkerAssignmentByDataCreator(data_creator);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getJobWorkerAssignmentByDataUpdater(data_updater: string): Promise<JobWorkerAssignmentModel[]> {
    const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobWorkerAssignmentModel);
  }

  async setJobWorkerAssignmentByDataUpdater(data_updater: string, data: JobWorkerAssignmentModel): Promise<JobWorkerAssignmentModel[]> {
    if (data.id) return this.setJobWorkerAssignmentById(data.id, data);
    return this.insertJobWorkerAssignment([data]);
  }

  async deleteJobWorkerAssignmentByDataUpdater(data_updater: string): Promise<void> {
    const items = await this.getJobWorkerAssignmentByDataUpdater(data_updater);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }
}

export default JobWorkerAssignmentORM;