import { google } from "googleapis";
import { JWT } from 'google-auth-library';
import { BoxTariff } from "#utils/interfaces.js";
import { format } from "date-fns";


export class GoogleSheetsAction {
    private sheets: any;
    private jwtClient: JWT;

    constructor() {
        // Инициализация JWT клиента
        this.jwtClient = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
            ],
        });

        this.sheets = google.sheets({ version: 'v4', auth: this.jwtClient });
    }

    // Обновить данные в таблице spreadsheetId
    public async updateBoxTariffs(spreadsheetId: string, rowData: BoxTariff[]): Promise<void> {
        // Задать имена колонок в таблице
        await this.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'stocks_coefs!A1:H1',
            valueInputOption: 'RAW',
            resource: {
                values: [
                    [
                        'dt_till_max',
                        'delivery_and_storage_expr',
                        'delivery_base',
                        'delivery_liter',
                        'storage_base',
                        'storage_liter',
                        'warehouse_name',
                        'updated_at',
                    ],
                ],
            },
        });

        try {
            const values = rowData.map((item) => [
                item.dt_till_max,
                item.delivery_and_storage_expr,
                item.delivery_base,
                item.delivery_liter,
                item.storage_base,
                item.storage_liter,
                item.warehouse_name,
                format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            ]);

            // Обновление строки
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `stocks_coefs!A2`,
                valueInputOption: 'RAW',
                resource: {
                    values,
                },
            });

            console.log(`Updated stock coefficients in sheet ${spreadsheetId}`);
        } catch (error) {
            console.error('Error updating stock coefficients:', error);
            throw error;
        }
    }
}

