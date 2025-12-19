import { getLogger, InitLogger } from './utils/logging.mjs';
import mongoose from 'mongoose';
import { database } from './config.mjs';

export async function jobEntrypoint(cb) {
    try {
        InitLogger();
        getLogger().info("ICFG Job");

        process.on('uncaughtException', (err) => {
            getLogger()?.error(`Unhandled Exception: ${err}`);

            process.exit(-1000);
        });

        process.on('unhandledRejection', (reason, promise) => {
            getLogger()?.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
            process.exit(-1001);
        });

        getLogger().info("ICFG Connection to the Database");
        await mongoose.connect(database.uri, database.options);

        await cb();
    }
    catch (err) {
        getLogger().error(err);
    }
}