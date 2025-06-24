import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import knex from '#postgres/knex.js';
import { shareGoogleSheet } from "#utils/share_google_sheet.js";

export interface StockCoefficient {
    dt_till_max: string;
    delivery_and_storage_expr: number | null;
    delivery_base: number | null;
    delivery_liter: number | null;
    storage_base: number | null;
    storage_liter: number | null;
    warehouse_name: string;
}

export class GoogleSheetsInit {
    private sheets: any;
    private jwtClient: JWT;

    constructor() {
        // Initialize JWT client
        this.jwtClient = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        this.sheets = google.sheets({ version: 'v4', auth: this.jwtClient });
    }

    /**
     * Creates N Google Sheets, to 1000
     */
    public async createSheets(n: number): Promise<string[]> {
        const sheetIds: string[] = [];
        if (n > 1000) {
            throw new Error('Ограничение на кол-во таблиц!')
        }

        for (let i = 0; i < n; i++) {
            const title = `Stocks_${uuidv4()}`;
            const spreadsheetId = await this.createSingleSheet(title);
            sheetIds.push(spreadsheetId);
            await knex('google_tables').insert({spreadsheetId});

            await shareGoogleSheet(spreadsheetId);
        }

        return sheetIds;
    }

    /**
     * Creates a single Google Sheet with the required structure
     */
    private async createSingleSheet(title: string): Promise<string> {
        try {
            const response = await this.sheets.spreadsheets.create({
                resource: {
                    properties: {
                        title,
                    },
                    sheets: [
                        {
                            properties: {
                                title: 'stocks_coefs',
                                gridProperties: {
                                    rowCount: 1000,
                                    columnCount: 7,
                                },
                            },
                        },
                    ],
                },
            });

            const spreadsheetId = response.data.spreadsheetId;

            // Set headers
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'stocks_coefs!A1:G1',
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
                        ],
                    ],
                },
            });

            console.log(`Created sheet ${title} with ID: ${spreadsheetId}`);
            return spreadsheetId;
        } catch (error) {
            console.error('Error creating sheet:', error);
            throw error;
        }
    }

    /**
     * Updates stock coefficients in a specific sheet
     */
    public async updateStockCoefficients(
        spreadsheetId: string,
        data: StockCoefficient[]
    ): Promise<void> {
        try {
            // Convert data to 2D array
            const values = data.map((item) => [
                item.dt_till_max,
                item.delivery_and_storage_expr,
                item.delivery_base,
                item.delivery_liter,
                item.storage_base,
                item.storage_liter,
                item.warehouse_name,
            ]);

            await this.sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'stocks_coefs',
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
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

    // /**
    //  * Updates stock coefficients in all N sheets
    //  */
    // public async updateAllSheets(data: StockCoefficient[]): Promise<void> {
    //     const sheetIds = await this.createSheets();
    //
    //     for (const sheetId of sheetIds) {
    //         try {
    //             await this.updateStockCoefficients(sheetId, data);
    //         } catch (error) {
    //             console.error(`Failed to update sheet ${sheetId}:`, error);
    //         }
    //     }
    // }
}

// Example usage
// (async () => {
//     const service = new GoogleSheetsInit();
//
//     const sampleData: StockCoefficient[] = [
//         {
//             dt_till_max: '2023-12-31',
//             delivery_and_storage_expr: 1.5,
//             delivery_base: 100,
//             delivery_liter: 0.5,
//             storage_base: 50,
//             storage_liter: 0.3,
//             warehouse_name: 'Main Warehouse',
//         },
//         // Add more items as needed
//     ];
//
//     try {
        // Option 1: Create and update all 10 sheets
        // await service.updateAllSheets(sampleData);

        // Option 2: Work with individual sheets
        // const sheetIds = await service.createSheets();
        // await service.updateStockCoefficients(sheetIds[0], sampleData);
    // } catch (error) {
    //     console.error('Error in main execution:', error);
    // }
// })();
