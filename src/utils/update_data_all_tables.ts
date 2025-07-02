import { BoxTariffData, GoogleSheetList } from "#utils/interfaces.js";
import { googleSheetsAction } from "#app.js";

export const updateDataAllTables = async (data: BoxTariffData[], gTableIds: GoogleSheetList) => {

    for (const spreadSheetId of gTableIds?.default.id) {
        await googleSheetsAction.updateBoxTariffs(spreadSheetId, data);
    }
}
