import mongoose from 'mongoose';
import { database } from './config.mjs';
import { getLogger, InitLogger, InitRequestLogger } from './utils/logging.mjs';
import cors from 'cors'
import express from 'express'
import { router } from './core/controlapi.mjs';
import Bree from 'bree';
import { jobs } from './job.config.mjs';

process.env.TZ = 'America/Sao_Paulo';

// Rest Control API 
const app = express();
globalThis.Scheduler = new Bree({
   jobs: jobs,
   defaultExtension: 'mjs'
})

(async () => {
   InitLogger();
   getLogger().info("ICFG Init");

   try {
     getLogger().info("ICFG Connection to the Database");
     await mongoose.connect(database.uri, database.options);
     getLogger().info("ICFG Starting up the Control API");

     app.use(cors());
     app.use(express.json());
     app.use(InitRequestLogger());
     app.use(router);
     
     app.listen(5100, () => getLogger().info("ControlAPI is running!"));

     getLogger().info("ICFG Starting up the Scheduler...");
     await globalThis.Scheduler.start();
   }
   catch(err) {
      getLogger().error(err);
   }
})();