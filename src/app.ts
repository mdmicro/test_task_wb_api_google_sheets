import knex, { migrate, seed } from "#postgres/knex.js";
import { startService } from "#service/service.js";

await migrate.latest();
await seed.run();
await startService();

console.log("All migrations and seeds have been run");
