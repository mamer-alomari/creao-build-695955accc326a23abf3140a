
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
 * Enumeration for VehicleType
 */
export enum VehicleType {
  Unspecified = 0,
  BoxTruck16ft = 1,
  BoxTruck26ft = 2,
  CargoVan = 3,
  Flatbed = 4,
}

/**
 * Interface for VehicleModel
 */
export interface VehicleModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  vehicle_name: string;
  license_plate: string;
  type: VehicleType;
  capacity_cft?: number | null;
}

// Re-export common types
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for Vehicle entity using Firestore.
 */
export class VehicleORM {
  private static instance: VehicleORM | null = null;
  private collectionName = "vehicles";

  private constructor() { }

  public static getInstance(): VehicleORM {
    if (!VehicleORM.instance) {
      VehicleORM.instance = new VehicleORM();
    }
    return VehicleORM.instance;
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
   * Get vehicle by IDs
   */
  async getVehicleByIDs(ids: string[]): Promise<VehicleModel[]> {
    if (ids.length === 0) return [];

    const results: VehicleModel[] = [];
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const q = query(collection(db, this.collectionName), where("id", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as VehicleModel);
      });
    }
    return results;
  }

  /**
   * Delete vehicle by IDs
   */
  async deleteVehicleByIDs(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
    await Promise.all(promises);
  }

  /**
   * Get all Vehicle records
   */
  async getAllVehicle(): Promise<VehicleModel[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => doc.data() as VehicleModel);
  }

  /**
   * Get all Vehicle records for a specific company
   */
  async getVehiclesByCompanyId(companyId: string): Promise<VehicleModel[]> {
    const q = query(collection(db, this.collectionName), where("company_id", "==", companyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as VehicleModel);
  }

  /**
   * Insert (create) new Vehicle record(s)
   */
  async insertVehicle(data: VehicleModel[]): Promise<VehicleModel[]> {
    const inserted: VehicleModel[] = [];

    for (const item of data) {
      const newDocRef = doc(collection(db, this.collectionName));
      const now = this.getCurrentTime();
      const userId = this.getCurrentUserId();

      const newItem: VehicleModel = {
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
   * Purge all Vehicle records
   */
  async purgeAllVehicle(): Promise<void> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  /**
   * List Vehicle records with filters
   */
  async listVehicle(filter?: any, sort?: any, paginate?: any): Promise<[VehicleModel[], any]> {
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
    const results = snapshot.docs.map(d => d.data() as VehicleModel);

    return [results, { number: 1, size: results.length, total: results.length }];
  }

  /**
   * Get vehicle by Id index
   */
  async getVehicleById(id: string): Promise<VehicleModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return [snapshot.data() as VehicleModel];
    }
    return [];
  }

  /**
   * Set (update) vehicle by Id index
   */
  async setVehicleById(id: string, data: VehicleModel): Promise<VehicleModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const now = this.getCurrentTime();
    const userId = this.getCurrentUserId();

    const existing = await getDoc(docRef);
    let existingData = existing.exists() ? existing.data() as VehicleModel : null;

    const updatedItem: VehicleModel = {
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
   * Delete vehicle by Id index
   */
  async deleteVehicleById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  /**
   * Get vehicle by CompanyIdVehicleName index
   */
  async getVehicleByCompanyIdVehicleName(company_id: string, vehicle_name: string): Promise<VehicleModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("company_id", "==", company_id),
      where("vehicle_name", "==", vehicle_name)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as VehicleModel);
  }

  async setVehicleByCompanyIdVehicleName(company_id: string, vehicle_name: string, data: VehicleModel): Promise<VehicleModel[]> {
    if (data.id) return this.setVehicleById(data.id, data);
    const vehicles = await this.getVehicleByCompanyIdVehicleName(company_id, vehicle_name);
    if (vehicles.length > 0) return this.setVehicleById(vehicles[0].id, data);
    return this.insertVehicle([data]);
  }

  async deleteVehicleByCompanyIdVehicleName(company_id: string, vehicle_name: string): Promise<void> {
    const vehicles = await this.getVehicleByCompanyIdVehicleName(company_id, vehicle_name);
    const promises = vehicles.map(v => deleteDoc(doc(db, this.collectionName, v.id)));
    await Promise.all(promises);
  }

  async getVehicleByDataCreator(data_creator: string): Promise<VehicleModel[]> {
    const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as VehicleModel);
  }

  async setVehicleByDataCreator(data_creator: string, data: VehicleModel): Promise<VehicleModel[]> {
    if (data.id) return this.setVehicleById(data.id, data);
    return this.insertVehicle([data]);
  }

  async deleteVehicleByDataCreator(data_creator: string): Promise<void> {
    const vehicles = await this.getVehicleByDataCreator(data_creator);
    const promises = vehicles.map(v => deleteDoc(doc(db, this.collectionName, v.id)));
    await Promise.all(promises);
  }

  async getVehicleByDataUpdater(data_updater: string): Promise<VehicleModel[]> {
    const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as VehicleModel);
  }

  async setVehicleByDataUpdater(data_updater: string, data: VehicleModel): Promise<VehicleModel[]> {
    if (data.id) return this.setVehicleById(data.id, data);
    return this.insertVehicle([data]);
  }

  async deleteVehicleByDataUpdater(data_updater: string): Promise<void> {
    const vehicles = await this.getVehicleByDataUpdater(data_updater);
    const promises = vehicles.map(v => deleteDoc(doc(db, this.collectionName, v.id)));
    await Promise.all(promises);
  }
}

export default VehicleORM;