
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    Timestamp
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export interface WorkerScheduleModel {
    id: string;
    worker_id: string;
    company_id: string;
    date: string; // YYYY-MM-DD
    is_available: boolean;
    start_time?: string; // HH:mm
    end_time?: string; // HH:mm
    notes?: string;
    create_time: string;
    update_time: string;
}

export class WorkerScheduleORM {
    private static instance: WorkerScheduleORM | null = null;
    private collectionName = "worker_schedules";

    private constructor() { }

    public static getInstance(): WorkerScheduleORM {
        if (!WorkerScheduleORM.instance) {
            WorkerScheduleORM.instance = new WorkerScheduleORM();
        }
        return WorkerScheduleORM.instance;
    }

    private getCurrentTime(): string {
        return new Date().toISOString();
    }

    async getSchedulesByWorker(workerId: string): Promise<WorkerScheduleModel[]> {
        const q = query(collection(db, this.collectionName), where("worker_id", "==", workerId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as WorkerScheduleModel);
    }

    async getSchedulesByWorkerAndDateRange(workerId: string, startDate: string, endDate: string): Promise<WorkerScheduleModel[]> {
        const q = query(
            collection(db, this.collectionName),
            where("worker_id", "==", workerId),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as WorkerScheduleModel);
    }

    async setSchedule(data: WorkerScheduleModel): Promise<WorkerScheduleModel> {
        const docRef = data.id ? doc(db, this.collectionName, data.id) : doc(collection(db, this.collectionName));
        const now = this.getCurrentTime();

        const newItem: WorkerScheduleModel = {
            ...data,
            id: docRef.id,
            update_time: now,
            create_time: data.create_time || now,
        };

        await setDoc(docRef, newItem);
        return newItem;
    }

    async deleteSchedule(id: string): Promise<void> {
        await deleteDoc(doc(db, this.collectionName, id));
    }
}
