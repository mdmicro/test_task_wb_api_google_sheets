import axios from 'axios';
import knex from '#postgres/knex.js';
import * as dotenv from 'dotenv';
import { format } from 'date-fns';
import { REQUEST_API } from "#service/request_api.js";

dotenv.config();

interface WareHouseListItem {
    dtTillMax: string;
    boxDeliveryAndStorageExpr: string;
    boxDeliveryBase: string;
    boxDeliveryLiter: string;
    boxStorageBase: string;
    boxStorageLiter: string;
    warehouseName: string;
}

interface WareHouseData {
    id?: number;

    dt_till_max: string;
    delivery_and_storage_expr: number | null;
    delivery_base: number | null;
    delivery_liter: number | null;
    storage_base: number | null;
    storage_liter: number | null;
    warehouse_name: string;

    created_at?: number;
    updated_at?: unknown | null;
}

// Преобразует строку с запятой в число (например "47,5" → 47.5)
function parseDecimal(value: string): number | null {
    if (!value || value === '-') return null;
    return parseFloat(value.replace(',', '.'));
}

// Запрос к API и сохранение данных
async function fetchAndSaveData() {
    try {
        const response = await axios.get(`${REQUEST_API.TARIFFS_BOX}?date=${format(new Date(),'yyyy-MM-dd')}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.API_KEY}`,
            },
        });

        const jsonData = response.data.response.data;
        const warehouseList: WareHouseListItem[] = jsonData.warehouseList;

        for(const warehouse of warehouseList) {
            // Подготавливаем данные для вставки
            const data: WareHouseData = {
                dt_till_max: jsonData.dtTillMax,
                warehouse_name: warehouse.warehouseName,
                delivery_and_storage_expr: parseDecimal(warehouse.boxDeliveryAndStorageExpr),
                delivery_base: parseDecimal(warehouse.boxDeliveryBase),
                delivery_liter: parseDecimal(warehouse.boxDeliveryLiter),
                storage_base: parseDecimal(warehouse.boxStorageBase),
                storage_liter: parseDecimal(warehouse.boxStorageLiter),
                updated_at: null,
            };

            await knex.transaction(async trx => {
                const existing = await trx('tariffs_box')
                    .where({
                        dt_till_max: jsonData.dtTillMax,
                        warehouse_name: data.warehouse_name,
                    })
                    .first();

                if (existing) {
                    await trx('tariffs_box')
                        .where({
                            dt_till_max: jsonData.dtTillMax,
                            warehouse_name: data.warehouse_name,
                        })
                        .update({
                            ...data,
                            updated_at: trx.fn.now()
                        });
                } else {
                    await trx('tariffs_box').insert(data);
                    }
            });
        }

        console.log(`Saved ${warehouseList.length} tariffs_box for ${knex.fn.now()}`);

    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
    }
}

// Запуск сервиса
export async function startService() {
    try {
        console.log('Service started. First request will be executed immediately.');

        // Первый запрос сразу при старте
        await fetchAndSaveData();

        // Периодический запрос (каждый час)
        setInterval(fetchAndSaveData, 60 * 60 * 1000);

    } catch (error) {
        console.error('Initialization error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

