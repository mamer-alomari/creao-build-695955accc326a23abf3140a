
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
import { UserRole } from "@/sdk/core/auth"; // Assuming this is where it's exported

/**
 * Enumeration for JobStatus
 */
export enum JobStatus {
  Unspecified = 0,
  Quote = 1,
  Booked = 2,
  InProgress = 3,
  Completed = 4,
  Canceled = 5,
}

/**
 * Interface for JobModel
 */
export interface JobModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  customer_name: string;
  status: JobStatus;
  scheduled_date: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_cost?: number | null;
  inventory_data?: string;
}

// Re-export common types for compatibility if needed, though we won't use them internally
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for Job entity using Firestore.
 */
export class JobORM {
  private static instance: JobORM | null = null;
  private collectionName = "jobs";

  private constructor() { }

  public static getInstance(): JobORM {
    if (!JobORM.instance) {
      JobORM.instance = new JobORM();
    }
    return JobORM.instance;
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
   * Get job by IDs
   */
  async getJobByIDs(ids: string[]): Promise<JobModel[]> {
    if (ids.length === 0) return [];

    // Firestore "in" query allows up to 10 values. For safety, we fetch individually if needed
    // or batch them. For simplicity in this migration, let's fetch individually for now or use 'in' if small.
    // To match the original "batch operation" intent, let's try to use 'in' chunks.

    const results: JobModel[] = [];
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const q = query(collection(db, this.collectionName), where("id", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as JobModel);
      });
    }
    return results;
  }

  /**
   * Delete job by IDs
   */
  async deleteJobByIDs(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
    await Promise.all(promises);
  }

  /**
   * Get all Job records
   */
  async getAllJob(): Promise<JobModel[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => doc.data() as JobModel);
  }

  /**
   * Get all Job records for a specific company
   */
  async getJobsByCompanyId(companyId: string): Promise<JobModel[]> {
    const q = query(collection(db, this.collectionName), where("company_id", "==", companyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as JobModel);
  }

  /**
   * Insert (create) new Job record(s)
   */
  async insertJob(data: JobModel[]): Promise<JobModel[]> {
    const inserted: JobModel[] = [];

    for (const item of data) {
      // Create a specific ID if not present, or let Firestore generate one
      // The interface implies we might get partial data and should fill system fields.
      // However, we need to return the FULL object with ID.

      const newDocRef = doc(collection(db, this.collectionName)); // Auto-gen ID referenced immediately
      const now = this.getCurrentTime();
      const userId = this.getCurrentUserId();

      const newItem: JobModel = {
        ...item,
        id: item.id || newDocRef.id,
        data_creator: userId,
        data_updater: userId,
        create_time: now,
        update_time: now,
      };

      // Ensure we use the referenced ID
      await setDoc(newDocRef, newItem);
      inserted.push(newItem);
    }

    return inserted;
  }

  /**
   * Purge all Job records
   * WARNING: Expensive operation in Firestore
   */
  async purgeAllJob(): Promise<void> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  /**
   * List Job records with filters
   * Simplified implementation of complex filtering
   */
  async listJob(filter?: any, sort?: any, paginate?: any): Promise<[JobModel[], any]> {
    let constraints: QueryConstraint[] = [];

    // Basic support for common filters if passed in a way we can parse
    // Since the original used a complex Filter object, we might need to adapt.
    // For now, valid common usage in the app seems to be what we need to support.
    // If the app uses `listJob({simples: [{field: 'company_id', value: ...}]})`, we need to handle it.

    if (filter?.simples) {
      for (const f of filter.simples) {
        // Check if value structure matches existing common.ts Value
        // f.value might have { string: "..." } or similar
        let val = undefined;
        if (f.value?.string) val = f.value.string;
        else if (f.value?.number !== undefined) val = f.value.number;
        else if (f.value?.enumeration !== undefined) val = f.value.enumeration;
        else if (f.value?.boolean !== undefined) val = f.value.boolean;

        if (val !== undefined) {
          // Map SimpleSelector (1=equal, etc)
          // Assuming 1 is equal based on common.ts
          if (f.symbol === 1) constraints.push(where(f.field, "==", val));
          // Add others if needed
        }
      }
    }

    if (sort?.orders) {
      for (const order of sort.orders) {
        constraints.push(orderBy(order.field, order.symbol === 1 ? "asc" : "desc"));
      }
    }

    // Pagination support is complex with Firestore cursors. 
    // For strict migration without rewriting the calling code's logic, 
    // we might just return result and dummy page info if dataset is small.

    // Applying constraints
    const q = query(collection(db, this.collectionName), ...constraints);
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(d => d.data() as JobModel);

    return [results, { number: 1, size: results.length, total: results.length }];
  }

  /**
   * Get job by Id index
   */
  async getJobById(id: string): Promise<JobModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return [snapshot.data() as JobModel];
    }
    return [];
  }

  /**
   * Set (update) job by Id index
   */
  async setJobById(id: string, data: JobModel): Promise<JobModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const now = this.getCurrentTime();
    const userId = this.getCurrentUserId();

    // We need to fetch existing to keep creator info if not provided?
    // The spec says "Must keep id, data_creator, create_time unchanged".
    const existing = await getDoc(docRef);
    let existingData = existing.exists() ? existing.data() as JobModel : null;

    const updatedItem: JobModel = {
      ...data,
      id: id,
      data_updater: userId,
      update_time: now,
      // Preserve original creation info if it exists
      data_creator: existingData?.data_creator || data.data_creator || userId,
      create_time: existingData?.create_time || data.create_time || now,
    };

    await setDoc(docRef, updatedItem);
    return [updatedItem];
  }

  /**
   * Delete job by Id index
   */
  async deleteJobById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  /**
   * Get job by CompanyIdStatus index
   */
  async getJobByCompanyIdStatus(company_id: string, status: JobStatus): Promise<JobModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("company_id", "==", company_id),
      where("status", "==", status)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobModel);
  }

  /**
   * Set (update) job by CompanyIdStatus index
   * NOTE: This is weird in Firestore because multiple docs might match. 
   * The original ORM likely assumed uniqueness or updated all?
   * "index" usually accepts unique keys. 
   * If this returns multiple, we update WHICH one? 
   * Usually 'set' implies replacing a specific resource. 
   * We will assume for now we shouldn't use this for batch updates unless necessary.
   * But following the signature:
   */
  async setJobByCompanyIdStatus(company_id: string, status: JobStatus, data: JobModel): Promise<JobModel[]> {
    // This seems to imply finding a job with these properties and updating it?
    // Or creating it if not exists but we need an ID. 
    // For migration safety, I'll assume we query and update the first match or throw if ambiguous.
    // OR, this method is used when we KNOW the ID from the data object?

    if (data.id) {
      return this.setJobById(data.id, data);
    }

    // Fallback: Query
    const jobs = await this.getJobByCompanyIdStatus(company_id, status);
    if (jobs.length > 0) {
      return this.setJobById(jobs[0].id, data);
    }

    // Create new if not found?
    return this.insertJob([data]);
  }

  async deleteJobByCompanyIdStatus(company_id: string, status: JobStatus): Promise<void> {
    const jobs = await this.getJobByCompanyIdStatus(company_id, status);
    const promises = jobs.map(j => deleteDoc(doc(db, this.collectionName, j.id)));
    await Promise.all(promises);
  }

  async getJobByCompanyIdScheduledDate(company_id: string, scheduled_date: string): Promise<JobModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("company_id", "==", company_id),
      where("scheduled_date", "==", scheduled_date)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobModel);
  }

  async setJobByCompanyIdScheduledDate(company_id: string, scheduled_date: string, data: JobModel): Promise<JobModel[]> {
    if (data.id) return this.setJobById(data.id, data);
    // Fallback
    const jobs = await this.getJobByCompanyIdScheduledDate(company_id, scheduled_date);
    if (jobs.length > 0) return this.setJobById(jobs[0].id, data);
    return this.insertJob([data]);
  }

  async deleteJobByCompanyIdScheduledDate(company_id: string, scheduled_date: string): Promise<void> {
    const jobs = await this.getJobByCompanyIdScheduledDate(company_id, scheduled_date);
    const promises = jobs.map(j => deleteDoc(doc(db, this.collectionName, j.id)));
    await Promise.all(promises);
  }

  async getJobByDataCreator(data_creator: string): Promise<JobModel[]> {
    const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobModel);
  }

  async setJobByDataCreator(data_creator: string, data: JobModel): Promise<JobModel[]> {
    if (data.id) return this.setJobById(data.id, data);
    return this.insertJob([data]);
  }

  async deleteJobByDataCreator(data_creator: string): Promise<void> {
    const jobs = await this.getJobByDataCreator(data_creator);
    const promises = jobs.map(j => deleteDoc(doc(db, this.collectionName, j.id)));
    await Promise.all(promises);
  }

  // .. DataUpdater similar ...
  async getJobByDataUpdater(data_updater: string): Promise<JobModel[]> {
    const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobModel);
  }

  async setJobByDataUpdater(data_updater: string, data: JobModel): Promise<JobModel[]> {
    if (data.id) return this.setJobById(data.id, data);
    return this.insertJob([data]);
  }

  async deleteJobByDataUpdater(data_updater: string): Promise<void> {
    const jobs = await this.getJobByDataUpdater(data_updater);
    const promises = jobs.map(j => deleteDoc(doc(db, this.collectionName, j.id)));
    await Promise.all(promises);
  }

}

// Convenience export for testing compatibility
export const jobORM = JobORM.getInstance();