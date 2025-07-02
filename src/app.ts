import { migrate } from "#postgres/knex.js";
import { startService } from "#service/service.js";
import { GoogleSheetsAction } from "#utils/google_sheets_action.js";
import { GoogleSheetList } from "#utils/interfaces.js";

export const googleSheetsAction = new GoogleSheetsAction();
export const gTableIds: GoogleSheetList = await import("../google_sheets_list.json", { assert: { type: "json" } });

await migrate.latest();
await startService();
