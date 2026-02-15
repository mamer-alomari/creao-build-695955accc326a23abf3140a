
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
 * Interface for JobVehicleAssignmentModel
 */
export interface JobVehicleAssignmentModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  job_id: string;
  vehicle_id: string;
}

// Re-export common types
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for JobVehicleAssignment entity using Firestore.
 */
export class JobVehicleAssignmentORM {
  private static instance: JobVehicleAssignmentORM | null = null;
  private collectionName = "job_vehicle_assignments";

  private constructor() { }

  public static getInstance(): JobVehicleAssignmentORM {
    if (!JobVehicleAssignmentORM.instance) {
      JobVehicleAssignmentORM.instance = new JobVehicleAssignmentORM();
    }
    return JobVehicleAssignmentORM.instance;
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
   * Get job_vehicle_assignment by IDs
   */
  async getJobVehicleAssignmentByIDs(ids: string[]): Promise<JobVehicleAssignmentModel[]> {
    if (ids.length === 0) return [];

    const results: JobVehicleAssignmentModel[] = [];
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const q = query(collection(db, this.collectionName), where("id", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as JobVehicleAssignmentModel);
      });
    }
    return results;
  }

  /**
   * Delete job_vehicle_assignment by IDs
   */
  async deleteJobVehicleAssignmentByIDs(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
    await Promise.all(promises);
  }

  /**
   * Get all JobVehicleAssignment records
   */
  async getAllJobVehicleAssignment(): Promise<JobVehicleAssignmentModel[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => doc.data() as JobVehicleAssignmentModel);
  }

  /**
   * Get all JobVehicleAssignment records for a specific company
   */
  async getJobVehicleAssignmentByCompanyId(companyId: string): Promise<JobVehicleAssignmentModel[]> {
    const q = query(collection(db, this.collectionName), where("company_id", "==", companyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as JobVehicleAssignmentModel);
  }

  /**
   * Insert (create) new JobVehicleAssignment record(s)
   */
  async insertJobVehicleAssignment(data: JobVehicleAssignmentModel[]): Promise<JobVehicleAssignmentModel[]> {
    const inserted: JobVehicleAssignmentModel[] = [];

    for (const item of data) {
      const newDocRef = doc(collection(db, this.collectionName));
      const now = this.getCurrentTime();
      const userId = this.getCurrentUserId();

      const newItem: JobVehicleAssignmentModel = {
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
   * Purge all JobVehicleAssignment records
   */
  async purgeAllJobVehicleAssignment(): Promise<void> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  /**
   * List JobVehicleAssignment records with filters
   */
  async listJobVehicleAssignment(filter?: any, sort?: any, paginate?: any): Promise<[JobVehicleAssignmentModel[], any]> {
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
    const results = snapshot.docs.map(d => d.data() as JobVehicleAssignmentModel);

    return [results, { number: 1, size: results.length, total: results.length }];
  }

  /**
   * Get job_vehicle_assignment by Id index
   */
  async getJobVehicleAssignmentById(id: string): Promise<JobVehicleAssignmentModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return [snapshot.data() as JobVehicleAssignmentModel];
    }
    return [];
  }

  /**
   * Set (update) job_vehicle_assignment by Id index
   */
  async setJobVehicleAssignmentById(id: string, data: JobVehicleAssignmentModel): Promise<JobVehicleAssignmentModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const now = this.getCurrentTime();
    const userId = this.getCurrentUserId();

    const existing = await getDoc(docRef);
    let existingData = existing.exists() ? existing.data() as JobVehicleAssignmentModel : null;

    const updatedItem: JobVehicleAssignmentModel = {
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
   * Delete job_vehicle_assignment by Id index
   */
  async deleteJobVehicleAssignmentById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  /**
   * Get job_vehicle_assignment by JobId index
   */
  async getJobVehicleAssignmentByJobId(job_id: string): Promise<JobVehicleAssignmentModel[]> {
    const q = query(collection(db, this.collectionName), where("job_id", "==", job_id));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobVehicleAssignmentModel);
  }

  async setJobVehicleAssignmentByJobId(job_id: string, data: JobVehicleAssignmentModel): Promise<JobVehicleAssignmentModel[]> {
    if (data.id) return this.setJobVehicleAssignmentById(data.id, data);
    const items = await this.getJobVehicleAssignmentByJobId(job_id);
    if (items.length > 0) return this.setJobVehicleAssignmentById(items[0].id, data);
    return this.insertJobVehicleAssignment([data]);
  }

  async deleteJobVehicleAssignmentByJobId(job_id: string): Promise<void> {
    const items = await this.getJobVehicleAssignmentByJobId(job_id);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  /**
   * Get job_vehicle_assignment by VehicleId index
   */
  async getJobVehicleAssignmentByVehicleId(vehicle_id: string): Promise<JobVehicleAssignmentModel[]> {
    const q = query(collection(db, this.collectionName), where("vehicle_id", "==", vehicle_id));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobVehicleAssignmentModel);
  }

  async setJobVehicleAssignmentByVehicleId(vehicle_id: string, data: JobVehicleAssignmentModel): Promise<JobVehicleAssignmentModel[]> {
    if (data.id) return this.setJobVehicleAssignmentById(data.id, data);
    const items = await this.getJobVehicleAssignmentByVehicleId(vehicle_id);
    if (items.length > 0) return this.setJobVehicleAssignmentById(items[0].id, data);
    return this.insertJobVehicleAssignment([data]);
  }

  async deleteJobVehicleAssignmentByVehicleId(vehicle_id: string): Promise<void> {
    const items = await this.getJobVehicleAssignmentByVehicleId(vehicle_id);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getJobVehicleAssignmentByDataCreator(data_creator: string): Promise<JobVehicleAssignmentModel[]> {
    const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobVehicleAssignmentModel);
  }

  async setJobVehicleAssignmentByDataCreator(data_creator: string, data: JobVehicleAssignmentModel): Promise<JobVehicleAssignmentModel[]> {
    if (data.id) return this.setJobVehicleAssignmentById(data.id, data);
    return this.insertJobVehicleAssignment([data]);
  }

  async deleteJobVehicleAssignmentByDataCreator(data_creator: string): Promise<void> {
    const items = await this.getJobVehicleAssignmentByDataCreator(data_creator);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getJobVehicleAssignmentByDataUpdater(data_updater: string): Promise<JobVehicleAssignmentModel[]> {
    const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as JobVehicleAssignmentModel);
  }

  async setJobVehicleAssignmentByDataUpdater(data_updater: string, data: JobVehicleAssignmentModel): Promise<JobVehicleAssignmentModel[]> {
    if (data.id) return this.setJobVehicleAssignmentById(data.id, data);
    return this.insertJobVehicleAssignment([data]);
  }

  async deleteJobVehicleAssignmentByDataUpdater(data_updater: string): Promise<void> {
    const items = await this.getJobVehicleAssignmentByDataUpdater(data_updater);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }
}

export default JobVehicleAssignmentORM;