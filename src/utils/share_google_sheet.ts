import { google } from 'googleapis';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройки
const SERVICE_ACCOUNT_KEY = path.join(__dirname, '../../src/credential/service-directed-hour-463609-j6-163f14589641.json'); // Путь к JSON-ключу
const USER_EMAIL = 'test.task.mdm@gmail.com'; // Email пользователя, которому даем доступ

// spreadsheetId из URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
export async function shareGoogleSheet(spreadsheetId: string) {
    // Аутентификация через сервисный аккаунт
    const auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_KEY,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ],
    });

    // const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    try {
        // Даем доступ через Google Drive API
        await drive.permissions.create({
            fileId: spreadsheetId,
            requestBody: {
                role: 'writer', // 'reader', 'writer', 'owner'
                type: 'user',
                emailAddress: USER_EMAIL,
            },
        });

        console.log(`Доступ для ${USER_EMAIL} успешно предоставлен!`);
    } catch (error) {
        console.error('Ошибка:', (error as Error).message);
    }
}

