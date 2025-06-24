/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    await knex.schema.createTable("tariffs_box", (table) => {
        table.increments('id').primary();
        table.date('dt_till_max'); // Дата окончания последнего установленного тарифа
        table.string('warehouse_name');
        table.decimal('delivery_and_storage_expr', 10, 2);
        table.decimal('delivery_base', 10, 2);
        table.decimal('delivery_liter', 10, 2);
        table.decimal('storage_base', 10, 2);
        table.decimal('storage_liter', 10, 2);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(null)
    });

    await knex.schema.createTable("google_tables", (table) => {
        table.increments('id').primary();
        table.string('spreadsheetId');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    return knex.schema.dropTable("tariffs_box");
}
