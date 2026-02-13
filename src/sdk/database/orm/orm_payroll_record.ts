
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
 * Enumeration for PayrollRecordStatus
 */
export enum PayrollRecordStatus {
  Unspecified = 0,
  Draft = 1,
  Approved = 2,
  Paid = 3,
}

/**
 * Interface for PayrollRecordModel
 */
export interface PayrollRecordModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  worker_id: string;
  company_id: string;
  pay_period_start: string;
  pay_period_end: string;
  hourly_wage: number;
  hours_worked: number;
  total_pay: number;
  status: PayrollRecordStatus;
}

// Re-export common types
export type { Page, Filter, Sort } from "./common";

/**
 * ORM class for PayrollRecord entity using Firestore.
 */
export class PayrollRecordORM {
  private static instance: PayrollRecordORM | null = null;
  private collectionName = "payroll_records";

  private constructor() { }

  public static getInstance(): PayrollRecordORM {
    if (!PayrollRecordORM.instance) {
      PayrollRecordORM.instance = new PayrollRecordORM();
    }
    return PayrollRecordORM.instance;
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
   * Get payroll_record by IDs
   */
  async getPayrollRecordByIDs(ids: string[]): Promise<PayrollRecordModel[]> {
    if (ids.length === 0) return [];

    const results: PayrollRecordModel[] = [];
    const chunkSize = 10;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const q = query(collection(db, this.collectionName), where("id", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        results.push(doc.data() as PayrollRecordModel);
      });
    }
    return results;
  }

  /**
   * Delete payroll_record by IDs
   */
  async deletePayrollRecordByIDs(ids: string[]): Promise<void> {
    const promises = ids.map(id => deleteDoc(doc(db, this.collectionName, id)));
    await Promise.all(promises);
  }

  /**
   * Get all PayrollRecord records
   */
  async getAllPayrollRecord(): Promise<PayrollRecordModel[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName));
    return querySnapshot.docs.map(doc => doc.data() as PayrollRecordModel);
  }

  /**
   * Insert (create) new PayrollRecord record(s)
   */
  async insertPayrollRecord(data: PayrollRecordModel[]): Promise<PayrollRecordModel[]> {
    const inserted: PayrollRecordModel[] = [];

    for (const item of data) {
      const newDocRef = doc(collection(db, this.collectionName));
      const now = this.getCurrentTime();
      const userId = this.getCurrentUserId();

      const newItem: PayrollRecordModel = {
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
   * Purge all PayrollRecord records
   */
  async purgeAllPayrollRecord(): Promise<void> {
    const snapshot = await getDocs(collection(db, this.collectionName));
    const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(promises);
  }

  /**
   * List PayrollRecord records with filters
   */
  async listPayrollRecord(filter?: any, sort?: any, paginate?: any): Promise<[PayrollRecordModel[], any]> {
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
    const results = snapshot.docs.map(d => d.data() as PayrollRecordModel);

    return [results, { number: 1, size: results.length, total: results.length }];
  }

  /**
   * Get payroll_record by Id index
   */
  async getPayrollRecordById(id: string): Promise<PayrollRecordModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return [snapshot.data() as PayrollRecordModel];
    }
    return [];
  }

  /**
   * Set (update) payroll_record by Id index
   */
  async setPayrollRecordById(id: string, data: PayrollRecordModel): Promise<PayrollRecordModel[]> {
    const docRef = doc(db, this.collectionName, id);
    const now = this.getCurrentTime();
    const userId = this.getCurrentUserId();

    const existing = await getDoc(docRef);
    let existingData = existing.exists() ? existing.data() as PayrollRecordModel : null;

    const updatedItem: PayrollRecordModel = {
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
   * Delete payroll_record by Id index
   */
  async deletePayrollRecordById(id: string): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }

  /**
   * Get payroll_record by CompanyIdWorkerId index
   */
  async getPayrollRecordByCompanyIdWorkerId(company_id: string, worker_id: string): Promise<PayrollRecordModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("company_id", "==", company_id),
      where("worker_id", "==", worker_id)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as PayrollRecordModel);
  }

  async setPayrollRecordByCompanyIdWorkerId(company_id: string, worker_id: string, data: PayrollRecordModel): Promise<PayrollRecordModel[]> {
    if (data.id) return this.setPayrollRecordById(data.id, data);
    const items = await this.getPayrollRecordByCompanyIdWorkerId(company_id, worker_id);
    if (items.length > 0) return this.setPayrollRecordById(items[0].id, data);
    return this.insertPayrollRecord([data]);
  }

  async deletePayrollRecordByCompanyIdWorkerId(company_id: string, worker_id: string): Promise<void> {
    const items = await this.getPayrollRecordByCompanyIdWorkerId(company_id, worker_id);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  /**
   * Get payroll_record by CompanyIdPayPeriodStart index
   */
  async getPayrollRecordByCompanyIdPayPeriodStart(company_id: string, pay_period_start: string): Promise<PayrollRecordModel[]> {
    const q = query(
      collection(db, this.collectionName),
      where("company_id", "==", company_id),
      where("pay_period_start", "==", pay_period_start)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as PayrollRecordModel);
  }

  async setPayrollRecordByCompanyIdPayPeriodStart(company_id: string, pay_period_start: string, data: PayrollRecordModel): Promise<PayrollRecordModel[]> {
    if (data.id) return this.setPayrollRecordById(data.id, data);
    const items = await this.getPayrollRecordByCompanyIdPayPeriodStart(company_id, pay_period_start);
    if (items.length > 0) return this.setPayrollRecordById(items[0].id, data);
    return this.insertPayrollRecord([data]);
  }

  async deletePayrollRecordByCompanyIdPayPeriodStart(company_id: string, pay_period_start: string): Promise<void> {
    const items = await this.getPayrollRecordByCompanyIdPayPeriodStart(company_id, pay_period_start);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getPayrollRecordByDataCreator(data_creator: string): Promise<PayrollRecordModel[]> {
    const q = query(collection(db, this.collectionName), where("data_creator", "==", data_creator));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as PayrollRecordModel);
  }

  async setPayrollRecordByDataCreator(data_creator: string, data: PayrollRecordModel): Promise<PayrollRecordModel[]> {
    if (data.id) return this.setPayrollRecordById(data.id, data);
    return this.insertPayrollRecord([data]);
  }

  async deletePayrollRecordByDataCreator(data_creator: string): Promise<void> {
    const items = await this.getPayrollRecordByDataCreator(data_creator);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }

  async getPayrollRecordByDataUpdater(data_updater: string): Promise<PayrollRecordModel[]> {
    const q = query(collection(db, this.collectionName), where("data_updater", "==", data_updater));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as PayrollRecordModel);
  }

  async setPayrollRecordByDataUpdater(data_updater: string, data: PayrollRecordModel): Promise<PayrollRecordModel[]> {
    if (data.id) return this.setPayrollRecordById(data.id, data);
    return this.insertPayrollRecord([data]);
  }

  async deletePayrollRecordByDataUpdater(data_updater: string): Promise<void> {
    const items = await this.getPayrollRecordByDataUpdater(data_updater);
    const promises = items.map(i => deleteDoc(doc(db, this.collectionName, i.id)));
    await Promise.all(promises);
  }
}

export default PayrollRecordORM;