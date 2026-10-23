import path from 'node:path';
import { fileManager } from '../config.mjs';
import { jobEntrypoint } from '../startup.mjs';
import { runUpdateInvasions } from '../core/UpdateInvasions.mjs';
import { runUpdateReserveInvasions } from '../core/UpdateReserveInvasions.mjs';
import { runANMPipeline } from '../utils/anm-pipeline.mjs';

await jobEntrypoint(() => runANMPipeline({
    updateUC: runUpdateInvasions,
    updateTI: runUpdateReserveInvasions,
    lockPath: path.resolve(fileManager.storagePath(), 'files/.anm-pipeline.lock')
}));
