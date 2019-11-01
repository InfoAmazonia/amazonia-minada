import mongoose from 'mongoose';

import { database, license, unity } from './config.mjs';
import { writeGeoJson, writeCSV } from './utils/file-manager.mjs';

import { getInvasions, getUnitiesInsideAmazon } from './core/services.mjs';

process.env.TZ = 'America/Sao_Paulo';

mongoose.connect(database.uri, database.options)
   .then(async () => {
      console.log('ICFJ make files running...');

      try {
         const invasions = await getInvasions();
         const unities = await getUnitiesInsideAmazon(false);

         await writeGeoJson(unities, unity.id);
         await writeCSV(unities, unity.id, unity.properties);

         await writeGeoJson(invasions, license.id);
         await writeCSV(invasions, license.id, license.properties);

         process.exit(0);
      }
      catch(ex) {
         throw ex;         
      }
   })
   .catch(ex => {
      throw ex
   });