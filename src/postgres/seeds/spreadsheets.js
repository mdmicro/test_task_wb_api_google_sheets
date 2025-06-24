/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
import { GoogleSheetsInit } from "#utils/google_sheets_init.js";

export async function seed() {
    console.log(`Seed `);

    const googleSheetsInit = new GoogleSheetsInit();
    googleSheetsInit.createSheets(10);
}
