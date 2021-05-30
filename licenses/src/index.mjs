import mongoose from 'mongoose';

import { database } from './config.mjs';

import {
   scheduleUpdateInvasions,
   scheduleTweetNewInvasionsPT,
   scheduleTweetNewInvasionsEN,
   scheduleTweetTotalInvasions,
   scheduleUpdateReserveInvasions,
   scheduleTweetNewReserveInvasionsPT,
   scheduleTweetNewReserveInvasionsEN,
   scheduleTweetTotalReserveInvasions,
   scheduleTweetTotalYearInvasions,
   scheduleTweetTotalCountrySizeInvasionsPT,
   scheduleTweetTotalCountrySizeInvasionsEN
} from './core/jobs.mjs';

process.env.TZ = 'America/Sao_Paulo';

mongoose.connect(database.uri, database.options)
   .then(async () => {
      console.log('ICFJ application running...');
      // UNITIES
      scheduleUpdateInvasions(invasions => {
         scheduleTweetNewInvasionsPT(invasions);
         scheduleTweetNewInvasionsEN(invasions);
      });
      scheduleTweetTotalInvasions();
      // RESERVES
      scheduleUpdateReserveInvasions(reserveInvasions => {
         scheduleTweetNewReserveInvasionsPT(reserveInvasions);
         scheduleTweetNewReserveInvasionsEN(reserveInvasions);
      });
      scheduleTweetTotalReserveInvasions();
      // UNITIES and RESERVES
      scheduleTweetTotalYearInvasions();
      scheduleTweetTotalCountrySizeInvasionsPT();
      scheduleTweetTotalCountrySizeInvasionsEN();
   })
   .catch(ex => {
      console.trace();
      throw ex
   });
