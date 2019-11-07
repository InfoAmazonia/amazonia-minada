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

import { getInvasions } from './core/services.mjs';

mongoose.connect(database.uri, database.options)
   .then(async () => {
      console.log('ICFJ application running...');
      // const invasions = await getInvasions({ tweeted: false });
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
