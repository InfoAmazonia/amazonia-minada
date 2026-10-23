import { jobEntrypoint } from '../startup.mjs';
import { runUpdateInvasions } from '../core/UpdateInvasions.mjs';

await jobEntrypoint(runUpdateInvasions);
