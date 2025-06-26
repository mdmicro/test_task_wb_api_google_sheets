import { migrate } from "#postgres/knex.js";
import { startService } from "#service/service.js";

await migrate.latest();
console.log("All migrations and seeds have been run");

await startService();
