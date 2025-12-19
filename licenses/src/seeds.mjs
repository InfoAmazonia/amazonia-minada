import mongoose from 'mongoose';

import { database } from './config.mjs';
import { getLogger } from './utils/logging.mjs';

import { importLicenses, importInvasions, importUnities, importReserves } from './core/controllers.mjs';
import { updateTweetStatus, updateReserveInvasionTweetStatus } from './core/services.mjs';
import { importReserveInvasions } from './core/controllers.mjs';

process.env.TZ = 'America/Sao_Paulo';

mongoose.connect(database.uri, database.options)
   .then(async () => {
      getLogger().info('ICFJ seeds running...');

      try {
         /** get unities from ICMBio and inserts into database */
         await importUnities();

         /** get reserves from FUNAI and inserts into database */
         await importReserves();

         /** get licenses from ANM and inserts into database */
         await importLicenses();

         /** get every license inside indiginous reserve */
         const reserveInvasions = await importReserveInvasions();
         
         /** prevent tweeting all invasions found by once on application bootstrap. */
         await updateReserveInvasionTweetStatus({ _id: { $in: reserveInvasions.map(invasion => invasion._id) }});

         /** get every license inside protected unity */
         const invasions = await importInvasions();

         /** prevent tweeting all invasions found by once on application bootstrap. */
         await updateTweetStatus({ _id: { $in: invasions.map(invasion => invasion._id) }});

         process.exit(0);
      }
      catch(ex) {
         throw ex;
      }
   })
   .catch(ex => {
      throw ex
   });