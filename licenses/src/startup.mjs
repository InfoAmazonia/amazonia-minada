import { getLogger, InitLogger } from './utils/logging.mjs';
import mongoose from 'mongoose';
import { database } from './config.mjs';
import { runJob } from './utils/run-job.mjs';

export async function jobEntrypoint(cb) {
    InitLogger();
    getLogger().info('ICFG Job');
    process.on('uncaughtException', error => {
        getLogger().error(`Unhandled Exception: ${error.stack || error}`);
        process.exit(1);
    });
    process.on('unhandledRejection', error => {
        getLogger().error(`Unhandled Rejection: ${error?.stack || error}`);
        process.exit(1);
    });
    const code = await runJob(cb, {
        connect: () => mongoose.connect(database.uri, database.options),
        disconnect: () => mongoose.disconnect(),
        logger: getLogger()
    });
    process.exit(code);
}
