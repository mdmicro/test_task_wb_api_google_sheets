import knex, { migrate } from "#postgres/knex.js";
import { startService } from "#service/service.js";
import { GoogleSheetsAction } from "#utils/google_sheets_action.js";

export const googleSheetsAction = new GoogleSheetsAction();

await migrate.latest();

const hasMigrationRun = await knex('migrations')
    .where('name', '20250227184908_spreadsheets.js')
    .first();
if (hasMigrationRun) {
    await googleSheetsAction.createSheets(10);
}
console.log("\nAll migrations have been run");

await startService();
