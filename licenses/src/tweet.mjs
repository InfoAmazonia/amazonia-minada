import mongoose from 'mongoose';
import slugify from 'slugify';

import { database } from './config.mjs';

import { getInvasions } from './core/services.mjs';

import { tweetMedia, tweetStatus } from './utils/twitter.mjs';
import { clipName } from './utils/formatter.mjs';

import linksUCs from './links_ucs.json';

process.env.TZ = 'America/Sao_Paulo';

mongoose.connect(database.uri, database.options)
   .then(async () => {
      console.log('ICFJ tweet invasions running...');

      try {
         const invasions = await getInvasions({ tweeted: false });

         invasions.forEach(invasion => {            
            const { AREA_K2, FASE, SUBS, UC_NOME, NOME } = invasion.properties;
            const slug = slugify(UC_NOME, { replacement: '_', lower: true });
            const link = linksUCs[slug];
            
            let requirerName = NOME;
            let status = `⚠ ALERTA! Nova licença de ${Math.round(AREA_K2)} km² de ${FASE} para ${SUBS} detectada no sistema da @ANM dentro da UC ${UC_NOME} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;

            if(status.length > 280){
               requirerName = clipName(requirerName, status.length - 280);
               status = `⚠ ALERTA! Nova licença de ${Math.round(AREA_K2)} km² de ${FASE} para ${SUBS} detectada no sistema da @ANM dentro da UC ${UC_NOME} da Amazônia. Pedido feito por ${requirerName} #AmazoniaMinada ${link}`;               
            }            

            const tweet = { media: `${process.cwd()}/images/${slug}.jpg`, status: status };
            
            tweetMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
         });

         process.exit(0);
      }
      catch(ex) {
         throw ex;         
      }
   })
   .catch(ex => {
      throw ex
   });