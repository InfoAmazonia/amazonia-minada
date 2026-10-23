import { jobEntrypoint } from '../startup.mjs';
import { runUpdateReserveInvasions } from '../core/UpdateReserveInvasions.mjs';

await jobEntrypoint(runUpdateReserveInvasions);
