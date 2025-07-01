import { migrate } from "#postgres/knex.js";
import { startService } from "#service/service.js";
import { GoogleSheetsAction } from "#utils/google_sheets_action.js";

export const googleSheetsAction = new GoogleSheetsAction();

await migrate.latest();
console.log("\nAll migrations have been run");

await startService();
