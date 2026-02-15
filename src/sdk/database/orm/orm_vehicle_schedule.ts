
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
 * Enumeration for VehicleScheduleMaintenanceType
 */
export enum VehicleScheduleMaintenanceType {
  Unspecified = 0,
  Preventive = 1,
  Repair = 2,
  Inspection = 3,
}
/**
 * Enumeration for VehicleScheduleStatus
 */
export enum VehicleScheduleStatus {
  Unspecified = 0,
  Available = 1,
  InUse = 2,
  Maintenance = 3,
}

/**
 * Interface for VehicleScheduleModel
 */
export interface VehicleScheduleModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  vehicle_id: string;
  company_id: string;
  schedule_date: string;
  status: VehicleScheduleStatus;
  maintenance_type?: VehicleScheduleMaintenanceType | null;
}

// Re-export common types
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for VehicleSchedule entity using Firestore.
 */
export class VehicleScheduleORM {
  private static instance: VehicleScheduleORM | null = null;
  private collectionName = "vehicle_schedules";

  private constructor() { }

  public static getInstance(): VehicleScheduleORM {
    if (!VehicleScheduleORM.instance) {
      VehicleScheduleORM.instance = new VehicleScheduleORM();
    }
    return VehicleScheduleORM.instance;
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
   * Get vehicle_schedule by IDs
   */
  async getVehicleScheduleByIDs(ids: string[]): Promise<VehicleScheduleModel[]> {
    if (ids.length === 0) return [];

    const results: VehicleScheduleModel[] = [];
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const q = query(collection(db, this.collectionName), where("id", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as VehicleScheduleModel);
      });
    }
    return results;
  }

  /**
   * Delete vehicle_schedule by IDs
   */
  async deleteVehicleScheduleByIDs(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
    await Promise.all(promises);
  }

  /**
   * Get all VehicleSchedule records
   */
  async getAllVehicleSchedule(): Promise<VehicleScheduleModel[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => doc.data() as VehicleScheduleModel);
  }

  /**
   * Insert (create) new VehicleSchedule record(s)
   */
  async insertVehicleSchedule(data: VehicleScheduleModel[]): Promise<VehicleScheduleModel[]> {
    const inserted: VehicleScheduleModel[] = [];

    for (const item of data) {
      const newDocRef = doc(collection(db, this.collectionName));
      const now = this.getCurrentTime();
      const userId = this.getCurrentUserId();

      const newItem: VehicleScheduleModel = {
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
   * Purge all VehicleSchedule records
   */
  async purgeAllVehicleSchedule(): Promise<void> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  /**
   * List VehicleSchedule records with filters
   */
  async listVehicleSchedule(filter?: any, sort?: any, paginate?: any): Promise<[VehicleScheduleModel[], any]> {
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
    const results = snapshot.docs.map(d => d.data() as VehicleScheduleModel);

    return [results, { number: 1, size: results.length, total: results.length }];
  }

  /**
   * Get vehicle_schedule by Id index
   */
  async getVehicleScheduleById(id: string): Promise<VehicleScheduleModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return [snapshot.data() as VehicleScheduleModel];
    }
    return [];
  }

  /**
   * Set (update) vehicle_schedule by Id index
   */
  async setVehicleScheduleById(id: string, data: VehicleScheduleModel): Promise<VehicleScheduleModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const now = this.getCurrentTime();
    const userId = this.getCurrentUserId();

    const existing = await getDoc(docRef);
    let existingData = existing.exists() ? existing.data() as VehicleScheduleModel : null;

    const updatedItem: VehicleScheduleModel = {
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
   * Delete vehicle_schedule by Id index
   */
  async deleteVehicleScheduleById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  /**
   * Get vehicle_schedule by ScheduleDateVehicleId index
   */
  async getVehicleScheduleByScheduleDateVehicleId(schedule_date: string, vehicle_id: string): Promise<VehicleScheduleModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("schedule_date", "==", schedule_date),
      where("vehicle_id", "==", vehicle_id)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as VehicleScheduleModel);
  }

  async setVehicleScheduleByScheduleDateVehicleId(schedule_date: string, vehicle_id: string, data: VehicleScheduleModel): Promise<VehicleScheduleModel[]> {
    if (data.id) return this.setVehicleScheduleById(data.id, data);
    const items = await this.getVehicleScheduleByScheduleDateVehicleId(schedule_date, vehicle_id);
    if (items.length > 0) return this.setVehicleScheduleById(items[0].id, data);
    return this.insertVehicleSchedule([data]);
  }

  async deleteVehicleScheduleByScheduleDateVehicleId(schedule_date: string, vehicle_id: string): Promise<void> {
    const items = await this.getVehicleScheduleByScheduleDateVehicleId(schedule_date, vehicle_id);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  /**
   * Get vehicle_schedule by CompanyIdScheduleDate index
   */
  async getVehicleScheduleByCompanyIdScheduleDate(company_id: string, schedule_date: string): Promise<VehicleScheduleModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("company_id", "==", company_id),
      where("schedule_date", "==", schedule_date)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as VehicleScheduleModel);
  }

  async setVehicleScheduleByCompanyIdScheduleDate(company_id: string, schedule_date: string, data: VehicleScheduleModel): Promise<VehicleScheduleModel[]> {
    if (data.id) return this.setVehicleScheduleById(data.id, data);
    const items = await this.getVehicleScheduleByCompanyIdScheduleDate(company_id, schedule_date);
    if (items.length > 0) return this.setVehicleScheduleById(items[0].id, data);
    return this.insertVehicleSchedule([data]);
  }

  async deleteVehicleScheduleByCompanyIdScheduleDate(company_id: string, schedule_date: string): Promise<void> {
    const items = await this.getVehicleScheduleByCompanyIdScheduleDate(company_id, schedule_date);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getVehicleScheduleByDataCreator(data_creator: string): Promise<VehicleScheduleModel[]> {
    const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as VehicleScheduleModel);
  }

  async setVehicleScheduleByDataCreator(data_creator: string, data: VehicleScheduleModel): Promise<VehicleScheduleModel[]> {
    if (data.id) return this.setVehicleScheduleById(data.id, data);
    return this.insertVehicleSchedule([data]);
  }

  async deleteVehicleScheduleByDataCreator(data_creator: string): Promise<void> {
    const items = await this.getVehicleScheduleByDataCreator(data_creator);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getVehicleScheduleByDataUpdater(data_updater: string): Promise<VehicleScheduleModel[]> {
    const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as VehicleScheduleModel);
  }

  async setVehicleScheduleByDataUpdater(data_updater: string, data: VehicleScheduleModel): Promise<VehicleScheduleModel[]> {
    if (data.id) return this.setVehicleScheduleById(data.id, data);
    return this.insertVehicleSchedule([data]);
  }

  async deleteVehicleScheduleByDataUpdater(data_updater: string): Promise<void> {
    const items = await this.getVehicleScheduleByDataUpdater(data_updater);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }
}

export default VehicleScheduleORM;