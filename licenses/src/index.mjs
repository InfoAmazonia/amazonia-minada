import mongoose from 'mongoose';

import { database } from './config.mjs';

import { 
    scheduleUpdateInvasions, 
    scheduleTweetNewInvasionsPT,
    scheduleTweetNewInvasionsEN,
    scheduleTweetTotalInvasions,
    scheduleTweetTotalYearInvasions,
    scheduleTweetTotalAreaInvasions,
    scheduleTweetAvgInvasions,
    scheduleTweetWarnEngInvasions
} from './core/jobs.mjs';

process.env.TZ = 'America/Sao_Paulo';

mongoose.connect(database.uri, database.options)
   .then(async () => {
      console.log('ICFJ application running...');
      
      scheduleUpdateInvasions(invasions => {
         scheduleTweetNewInvasionsPT(invasions);
         scheduleTweetNewInvasionsEN(invasions);
      });
      scheduleTweetTotalInvasions();
      scheduleTweetTotalYearInvasions();
      scheduleTweetTotalAreaInvasions();
      scheduleTweetAvgInvasions();
      scheduleTweetWarnEngInvasions();
   })
   .catch(ex => {
      throw ex
   });