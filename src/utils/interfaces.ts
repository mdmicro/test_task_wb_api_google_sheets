
export interface BoxTariffItem {
    dtTillMax: string;
    boxDeliveryAndStorageExpr: string;
    boxDeliveryBase: string;
    boxDeliveryLiter: string;
    boxStorageBase: string;
    boxStorageLiter: string;
    warehouseName: string;
}

export interface BoxTariff {
    dt_till_max: string;
    delivery_and_storage_expr: number | null;
    delivery_base: number | null;
    delivery_liter: number | null;
    storage_base: number | null;
    storage_liter: number | null;
    warehouse_name: string;
}

export interface BoxTariffData extends BoxTariff {
    id?: number;
    created_at?: number;
    updated_at?: unknown | null;
}

export interface GoogleSheetList {
    default: {
        id: string[];
    };
}
