import { getLogger, InitLogger } from './utils/logging.mjs';
import mongoose from 'mongoose';
import { process } from 'node:process';
import { database } from './config.mjs';

process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception:', err);
  getLogger()?.error(`Unhandled Exception: ${err}`);

  process.exit(-1000); 
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  getLogger()?.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
  process.exit(-1001);
});

export async function jobEntrypoint(cb) {
    try {
        InitLogger();
        getLogger().info("ICFG Job");

        getLogger().info("ICFG Connection to the Database");
        await mongoose.connect(database.uri, database.options);

        await cb();
    }
    catch (err) {
        console.error(err);
        getLogger().error(err);
    }
}