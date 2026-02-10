import { DataType } from "./common";
import type { Value, Page, Index, Filter, Sort, Data } from "./common";
import { DataStoreClient, CreateData, CreateValue, ParseValue } from "./client";

/**
 * Enumeration for MaintenanceType
 */
export enum MaintenanceType {
    Unspecified = 0,
    Routine = 1,
    Repair = 2,
    Inspection = 3,
    Upgrade = 4,
}

/**
 * Interface for MaintenanceRecordModel
 */
export interface MaintenanceRecordModel {
    id: string;
    data_creator: string;
    data_updater: string;
    create_time: string;
    update_time: string;
    company_id: string;
    vehicle_id: string;
    service_date: string;
    description: string;
    cost: number;
    performed_by: string;
    odometer_reading?: number | null;
    type: MaintenanceType;
    notes?: string | null;
}

/**
 * ORM class for MaintenanceRecord entity.
 */
export class MaintenanceRecordORM {
    private static instance: MaintenanceRecordORM | null = null;
    protected client: DataStoreClient;
    protected namespace: string;
    protected entityId: string;
    protected entityName: string;
    protected entityVersion: string;
    protected taskId: string;

    private constructor() {
        this.client = DataStoreClient.getInstance();
        // Using same namespace/task info as other ORMs for consistency in this demo
        this.namespace = '01987547fc6c72ecb453bd2736bd4ea0';
        this.entityId = 'maintenance_record_entity_id'; // Placeholder ID
        this.entityName = 'maintenance_record';
        this.entityVersion = 'v1';
        this.taskId = '694964e9424ce9326ca7b3ba';
    }

    public static getInstance(): MaintenanceRecordORM {
        if (!MaintenanceRecordORM.instance) {
            MaintenanceRecordORM.instance = new MaintenanceRecordORM();
        }
        return MaintenanceRecordORM.instance;
    }

    async getMaintenanceRecordByIDs(ids: string[]): Promise<MaintenanceRecordModel[]> {
        const response = await this.client.get({
            id: this.entityId,
            namespace: this.namespace,
            name: this.entityName,
            version: this.entityVersion,
            task: this.taskId,
            ids: ids,
            format: { structured: true }
        });
        return this.resultToData(response.data?.values || []);
    }

    async deleteMaintenanceRecordByIDs(ids: string[]): Promise<void> {
        await this.client.delete({
            id: this.entityId,
            namespace: this.namespace,
            name: this.entityName,
            version: this.entityVersion,
            task: this.taskId,
            ids: ids,
            format: { structured: true }
        });
    }

    async getAllMaintenanceRecord(): Promise<MaintenanceRecordModel[]> {
        const response = await this.client.all({
            id: this.entityId,
            namespace: this.namespace,
            name: this.entityName,
            version: this.entityVersion,
            task: this.taskId,
            format: { structured: true }
        });
        return this.resultToData(response.data?.values || []);
    }

    async insertMaintenanceRecord(data: MaintenanceRecordModel[]): Promise<MaintenanceRecordModel[]> {
        const structured = data.map((item) => CreateData(MaintenanceRecordModelToValues(item)));
        const response = await this.client.insert({
            id: this.entityId,
            namespace: this.namespace,
            name: this.entityName,
            version: this.entityVersion,
            task: this.taskId,
            batch: structured,
            format: { structured: true }
        });
        return this.resultToData(response.data?.values || []);
    }

    async listMaintenanceRecord(filter?: Filter, sort?: Sort, paginate?: Page): Promise<[MaintenanceRecordModel[], Page]> {
        const response = await this.client.list({
            id: this.entityId,
            namespace: this.namespace,
            name: this.entityName,
            version: this.entityVersion,
            task: this.taskId,
            filter: filter,
            sort: sort,
            paginate: paginate,
            format: { structured: true }
        });
        return [this.resultToData(response.data?.values || []), response.data?.page || { number: 0, size: 0 }];
    }

    private resultToData(values: Data[]): MaintenanceRecordModel[] {
        return values.map((item: Data) => {
            if (item.structured && item.structured.length > 0) {
                return MaintenanceRecordModelFromValues(item.structured);
            }
            return null;
        }).filter((item): item is MaintenanceRecordModel => item !== null);
    }
}

function MaintenanceRecordModelToValues(data: MaintenanceRecordModel): Value[] {
    const fieldMappings = [
        { key: 'id', type: DataType.string, defaultValue: '' },
        { key: 'data_creator', type: DataType.string, defaultValue: '' },
        { key: 'data_updater', type: DataType.string, defaultValue: '' },
        { key: 'create_time', type: DataType.string, defaultValue: '' },
        { key: 'update_time', type: DataType.string, defaultValue: '' },
        { key: 'company_id', type: DataType.string, defaultValue: '' },
        { key: 'vehicle_id', type: DataType.string, defaultValue: '' },
        { key: 'service_date', type: DataType.string, defaultValue: '' },
        { key: 'description', type: DataType.string, defaultValue: '' },
        { key: 'cost', type: DataType.number, defaultValue: 0 },
        { key: 'performed_by', type: DataType.string, defaultValue: '' },
        { key: 'odometer_reading', type: DataType.number, defaultValue: null },
        { key: 'type', type: DataType.enumeration, defaultValue: 0 },
        { key: 'notes', type: DataType.string, defaultValue: null },
    ];

    return fieldMappings.map(({ key, type, defaultValue }) => {
        const value = data[key as keyof MaintenanceRecordModel] ?? defaultValue;
        return CreateValue(type, value, key);
    });
}

function MaintenanceRecordModelFromValues(values: Value[]): MaintenanceRecordModel {
    const data: Partial<MaintenanceRecordModel> = {};

    for (const value of values) {
        if (!value.name) continue;

        switch (value.name) {
            case 'id': data.id = ParseValue(value, DataType.string) as string; break;
            case 'data_creator': data.data_creator = ParseValue(value, DataType.string) as string; break;
            case 'data_updater': data.data_updater = ParseValue(value, DataType.string) as string; break;
            case 'create_time': data.create_time = ParseValue(value, DataType.string) as string; break;
            case 'update_time': data.update_time = ParseValue(value, DataType.string) as string; break;
            case 'company_id': data.company_id = ParseValue(value, DataType.string) as string; break;
            case 'vehicle_id': data.vehicle_id = ParseValue(value, DataType.string) as string; break;
            case 'service_date': data.service_date = ParseValue(value, DataType.string) as string; break;
            case 'description': data.description = ParseValue(value, DataType.string) as string; break;
            case 'cost': data.cost = ParseValue(value, DataType.number) as number; break;
            case 'performed_by': data.performed_by = ParseValue(value, DataType.string) as string; break;
            case 'odometer_reading': data.odometer_reading = ParseValue(value, DataType.number) as number | null; break;
            case 'type': data.type = ParseValue(value, DataType.enumeration) as MaintenanceType; break;
            case 'notes': data.notes = ParseValue(value, DataType.string) as string | null; break;
        }
    }

    return data as MaintenanceRecordModel;
}
