import { drive_v3, google } from "googleapis";
import { JWT } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import knex from '#postgres/knex.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BoxTariff } from "#utils/interfaces.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к JSON-ключу сервисного аккаунта
const SERVICE_ACCOUNT_KEY = path.join(__dirname, '../../src/credential/service-directed-hour-463609-j6-163f14589641.json');

enum UserRole {
    READER = 'reader',
    WRITER = 'writer',
    OWNER = 'owner',
}

export class GoogleSheetsAction {
    private sheets: any;
    private jwtClient: JWT;

    constructor() {
        // Инициализация JWT клиента
        this.jwtClient = new JWT({
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        this.sheets = google.sheets({ version: 'v4', auth: this.jwtClient });
    }

    // Создание N Google таблиц, до 1000
    public async createSheets(n: number): Promise<string[]> {
        const sheetIds: string[] = [];
        if (n > 1000) {
            throw new Error('Ограничение на кол-во таблиц!')
        }

        for (let i = 0; i < n; i++) {
            const title = `Stocks_${uuidv4()}`;
            const spreadsheetId = await this.createSingleSheet(title);
            sheetIds.push(spreadsheetId);

            await knex('google_tables').insert({spread_sheet_id: spreadsheetId});

            await this.shareGoogleSheet(spreadsheetId, UserRole.WRITER, process.env.USER_EMAIL);
        }

        return sheetIds;
    }

    // Создание одиночной таблицы Google с заданной структурой
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

            // Задать имена колонок в таблице
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

    // Предоставить доступ к файлу отдельному пользователю с указанным E-Mail
    public async shareGoogleSheet(spreadsheetId: string, userRole: UserRole, userEmail: string | undefined): Promise<void> {
        let drive: drive_v3.Drive | undefined;

        if (!userEmail) {
            console.error('Не задан e-mail пользователя google таблиц в системных переменных. Доступ к таблице не предоставлен');
            return;
        }

        try {
            // Аутентификация через сервисный аккаунт
            const auth = new google.auth.GoogleAuth({
                keyFile: SERVICE_ACCOUNT_KEY,
                scopes: [
                    'https://www.googleapis.com/auth/drive'
                ],
            });

            drive = google.drive({ version: 'v3', auth });

        } catch (e) {
            console.error(`Ошибка аутентификации к google drive - ${(e as Error).message}`);
            return;
        }

        try {
            // Предоставляем доступ через Google Drive API
            await drive.permissions.create({
                fileId: spreadsheetId,
                requestBody: {
                    role: userRole,
                    type: 'user',
                    emailAddress: userEmail,
                },
            });

            console.log(`Доступ для ${process.env.USER_EMAIL} успешно предоставлен!`);
        } catch (error) {
            console.error('Ошибка:', (error as Error).message);
        }
    }

    // Добавить данные в таблицу spreadsheetId
    public async updateBoxTariffs(spreadsheetId: string, rowData: BoxTariff[]): Promise<void> {
        try {
            const values = rowData.map((item) => [
                item.dt_till_max,
                item.delivery_and_storage_expr,
                item.delivery_base,
                item.delivery_liter,
                item.storage_base,
                item.storage_liter,
                item.warehouse_name,
            ]);

            // Обновление строки
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                // range: `stocks_coefs!A${rowNumber}:G${rowNumber}`,
                range: `stocks_coefs`,
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

