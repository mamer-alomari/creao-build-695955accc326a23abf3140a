
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
 * Interface for CompanyModel
 */
export interface CompanyModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  name: string;
  license_number?: string | null;
  contact_email: string;
}

// Re-export common types
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for Company entity using Firestore.
 */
export class CompanyORM {
  private static instance: CompanyORM | null = null;
  private collectionName = "companies";

  private constructor() { }

  public static getInstance(): CompanyORM {
    if (!CompanyORM.instance) {
      CompanyORM.instance = new CompanyORM();
    }
    return CompanyORM.instance;
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
   * Get company by IDs
   */
  async getCompanyByIDs(ids: string[]): Promise<CompanyModel[]> {
    if (ids.length === 0) return [];

    const results: CompanyModel[] = [];
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const q = query(collection(db, this.collectionName), where("id", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as CompanyModel);
      });
    }
    return results;
  }

  /**
   * Delete company by IDs
   */
  async deleteCompanyByIDs(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
    await Promise.all(promises);
  }

  /**
   * Get all Company records
   */
  async getAllCompany(): Promise<CompanyModel[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => doc.data() as CompanyModel);
  }

  /**
   * Insert (create) new Company record(s)
   */
  async insertCompany(data: CompanyModel[]): Promise<CompanyModel[]> {
    const inserted: CompanyModel[] = [];

    for (const item of data) {
      const newDocRef = doc(collection(db, this.collectionName));
      const now = this.getCurrentTime();
      const userId = this.getCurrentUserId();

      const newItem: CompanyModel = {
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
   * Purge all Company records
   */
  async purgeAllCompany(): Promise<void> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  /**
   * List Company records with filters
   */
  async listCompany(filter?: any, sort?: any, paginate?: any): Promise<[CompanyModel[], any]> {
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
    const results = snapshot.docs.map(d => d.data() as CompanyModel);

    return [results, { number: 1, size: results.length, total: results.length }];
  }

  /**
   * Get company by Id index
   */
  async getCompanyById(id: string): Promise<CompanyModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return [snapshot.data() as CompanyModel];
    }
    return [];
  }

  /**
   * Set (update) company by Id index
   */
  async setCompanyById(id: string, data: CompanyModel): Promise<CompanyModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const now = this.getCurrentTime();
    const userId = this.getCurrentUserId();

    const existing = await getDoc(docRef);
    let existingData = existing.exists() ? existing.data() as CompanyModel : null;

    const updatedItem: CompanyModel = {
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
   * Delete company by Id index
   */
  async deleteCompanyById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  /**
   * Get company by Name index
   */
  async getCompanyByName(name: string): Promise<CompanyModel[]> {
    const q = query(collection(db, this.collectionName), where("name", "==", name));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as CompanyModel);
  }

  async setCompanyByName(name: string, data: CompanyModel): Promise<CompanyModel[]> {
    if (data.id) return this.setCompanyById(data.id, data);
    const items = await this.getCompanyByName(name);
    if (items.length > 0) return this.setCompanyById(items[0].id, data);
    return this.insertCompany([data]);
  }

  async deleteCompanyByName(name: string): Promise<void> {
    const items = await this.getCompanyByName(name);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getCompanyByDataCreator(data_creator: string): Promise<CompanyModel[]> {
    const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as CompanyModel);
  }

  async setCompanyByDataCreator(data_creator: string, data: CompanyModel): Promise<CompanyModel[]> {
    if (data.id) return this.setCompanyById(data.id, data);
    return this.insertCompany([data]);
  }

  async deleteCompanyByDataCreator(data_creator: string): Promise<void> {
    const items = await this.getCompanyByDataCreator(data_creator);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getCompanyByDataUpdater(data_updater: string): Promise<CompanyModel[]> {
    const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as CompanyModel);
  }

  async setCompanyByDataUpdater(data_updater: string, data: CompanyModel): Promise<CompanyModel[]> {
    if (data.id) return this.setCompanyById(data.id, data);
    return this.insertCompany([data]);
  }

  async deleteCompanyByDataUpdater(data_updater: string): Promise<void> {
    const items = await this.getCompanyByDataUpdater(data_updater);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }
}

export default CompanyORM;