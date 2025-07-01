import { BoxTariffData } from "#utils/interfaces.js";
import { googleSheetsAction } from "#app.js";

export const updateDataAllTables = async (data: BoxTariffData[]) => {
    const list: { default: { id: string[] } } = await import("../../google_sheets_list.json", { assert: { type: "json" } });

    for (const spreadSheetId of list?.default.id) {
        await googleSheetsAction.updateBoxTariffs(spreadSheetId, data);
    }


}
