import axios from 'axios';
import knex from '#postgres/knex.js';
import * as dotenv from 'dotenv';
import { format } from 'date-fns';
import { REQUEST_API } from "#service/request_api.js";
import { updateDataAllTables } from "#utils/update_data_all_tables.js";
import { BoxTariffData, BoxTariffItem } from "#utils/interfaces.js";

dotenv.config();

function parseDecimal(value: string): number | null {
    if (!value || value === '-') return null;
    return parseFloat(value.replace(',', '.'));
}

// Запрос к API и сохранение данных
async function fetchAndSaveData() {
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
            // Подготавливаем данные для вставки
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
            boxTariffData.push(data);

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

        await updateDataAllTables(boxTariffData);

        console.log(`Saved ${boxTariffList.length} tariffs_box for ${knex.fn.now()}`);

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

