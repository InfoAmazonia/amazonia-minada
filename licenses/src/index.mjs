import mongoose from 'mongoose';
import { getLogger, InitLogger, InitRequestLogger } from './utils/logging.mjs';
import express from 'express';
import { router } fro   m './core/controlapi.mjs';
import Bree from 'bree';
import { jobs } from './job.config.mjs';
import path from 'path';
import { ScheduleData } from 'later';

InitLogger();

import { database } from './config.mjs';
process.env.TZ = 'America/Sao_Paulo';

// Rest Control API 
const app = express();
globalThis.Scheduler = new Bree({
   jobs: jobs,
   defaultExtension: 'mjs',
   root: path.resolve('src/jobs'),
   logger: getLogger()
})

globalThis.Scheduler.on('worker created', (worker) => {
   getLogger().info(`Worker created: ${worker.name} with pid ${worker.pid}`);
});

globalThis.Scheduler.on('worker deleted', (worker) => {
   getLogger().info(`Worker deleted: ${worker.name}`);
});


async function main() {
   getLogger().info("ICFG Init");

   try {
     getLogger().info("ICFG Connection to the Database");
     await mongoose.connect(database.uri, database.options);
     getLogger().info("ICFG Starting up the Control API");

     app.use(express.json());
     app.use(InitRequestLogger());
     app.use(router);
     
     app.listen(5100, () => getLogger().info("ControlAPI is running!"));

     getLogger().info("ICFG Starting up the Scheduler...");

     globalThis.Scheduler.config.jobs.forEach(job => {         
        getLogger().info(`Job scheduled: ${job.name} - Interval: ${JSON.stringify(job.interval.schedules) || 'N/A'}`);
     });
          
     await globalThis.Scheduler.start();
   }
   catch(err) {
      getLogger().error(`Error: ${err} => Stack: ${err.stack}`);
   }
};

main();