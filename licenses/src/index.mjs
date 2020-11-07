import mongoose from 'mongoose';

import { database } from './config.mjs';

import { 
    scheduleUpdateInvasions,
    scheduleTweetNewInvasionsPT,
    scheduleTweetNewInvasionsEN,
    scheduleTweetTotalInvasions,
    scheduleTweetTotalYearInvasions,
    scheduleUpdateReserveInvasions
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
      scheduleTweetTotalYearInvasions();
      // RESERVES
      scheduleUpdateReserveInvasions(reserveInvasions => {
         // TODO: adicionar jobs para tuitar
         // TODO: descobrir como fazer com links (links-ucs-{}.json) e com imagens (../images/*.jpg)
         // TODO: verificar alerta de segurança
      });
   })
   .catch(ex => {
      throw ex
   });
