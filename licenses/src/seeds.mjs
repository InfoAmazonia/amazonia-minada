import mongoose from 'mongoose';

import { database } from './config.mjs';

import { importLicenses, importInvasions, importUnities } from './core/controllers.mjs';
import { updateTweetStatus } from './core/services.mjs';

process.env.TZ = 'America/Sao_Paulo';

mongoose.connect(database.uri, database.options)
   .then(async () => {
      console.log('ICFJ seeds running...');

      try {
         /** get unities from ICMBio and inserts into database */
         await importUnities();            

         /** get licenses from ANM and inserts into database */
         await importLicenses();

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