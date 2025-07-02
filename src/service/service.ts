import axios from 'axios';
import knex from '#postgres/knex.js';
import * as dotenv from 'dotenv';
import { format } from 'date-fns';
import { REQUEST_API } from "#service/request_api.js";
import { updateDataAllTables } from "#utils/update_data_all_tables.js";
import { BoxTariffData, BoxTariffItem } from "#utils/interfaces.js";
import PQueue from 'p-queue';
import { gTableIds } from "#app.js";

const queue = new PQueue({concurrency: 1});

dotenv.config();

function parseDecimal(value: string): number | null {
    if (!value || value === '-') return null;
    return parseFloat(value.replace(',', '.'));
}

// Запрос к API и сохранение данных
async function fetchAndSaveData(): Promise<void> {
    const boxTariffData: BoxTariffData[] = [];

    try {
        const response = await axios.get(`${REQUEST_API.TARIFFS_BOX}?date=${format(new Date(),'yyyy-MM-dd')}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.API_KEY}`,
            },
        });

        const jsonData = response.data.response.data;
        const boxTariffList: BoxTariffItem[] = jsonData.warehouseList;

        for(const boxTariff of boxTariffList) {
            // Ремап данных из запроса в БД
            const data: BoxTariffData = {
                dt_till_max: jsonData.dtTillMax,
                warehouse_name: boxTariff.warehouseName,
                delivery_and_storage_expr: parseDecimal(boxTariff.boxDeliveryAndStorageExpr),
                delivery_base: parseDecimal(boxTariff.boxDeliveryBase),
                delivery_liter: parseDecimal(boxTariff.boxDeliveryLiter),
                storage_base: parseDecimal(boxTariff.boxStorageBase),
                storage_liter: parseDecimal(boxTariff.boxStorageLiter),
                updated_at: null,
            };

            // Вставка для нового дня и обновление для текущего дня
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

            boxTariffData.push(data);
        }

        return queue.add(async ()=>{
            await updateDataAllTables(boxTariffData, gTableIds);
            console.log(`Saved ${boxTariffList.length} tariffs_box for ${knex.fn.now()}`);
        });

    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
    }
}

export async function startService() {
    try {
        console.log('Service started. First request will be executed immediately.');
        await fetchAndSaveData();

        setInterval(fetchAndSaveData, 2 * 60 * 1000);
    } catch (error) {
        console.error('Initialization error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

