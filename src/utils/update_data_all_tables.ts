import knex from '#postgres/knex.js';
import { BoxTariffData } from "#utils/interfaces.js";
import { googleSheetsAction } from "#app.js";


export const updateDataAllTables = async (data: BoxTariffData[]) => {

    const spreadSheetIds = await knex('google_tables').pluck('spread_sheet_id');

    for (const spreadSheetId of spreadSheetIds) {
        await googleSheetsAction.updateBoxTariffs(spreadSheetId, data);
    }


}
