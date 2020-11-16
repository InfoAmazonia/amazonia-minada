import mongoose from 'mongoose';
import slugify from 'slugify';

import { database } from './config.mjs';

import { Unity } from './core/models.mjs';
import { getInvasions } from './core/services.mjs';
import { getEntityImage } from './core/mapbox-service.mjs';

import { tweetImageMedia, tweetStatus } from './utils/twitter.mjs';
import { clipName, getThousandsMark } from './utils/formatter.mjs';

import linksUCsPT from './links-ucs-pt.json';

process.env.TZ = 'America/Sao_Paulo';

mongoose.connect(database.uri, database.options)
   .then(async () => {
      console.log('ICFJ tweet invasions running...');

      try {
         const invasions = await getInvasions({ tweeted: false });

         invasions.forEach(async invasion => {
            const { AREA_K2, FASE, SUBS, UC_NOME, NOME } = invasion.properties;
            const slug = slugify(UC_NOME, { replacement: '_', lower: true });
            const link = linksUCsPT[slug];
            const areaK2 = getThousandsMark(parseFloat(AREA_K2).toFixed(2));
   
            let requirerName = NOME;
            let status = `⚠ ALERTA! Novo requerimento minerário de ${FASE} para ${SUBS} de ${areaK2} km² detectado na ANM dentro da UC ${UC_NOME} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;
   
            if (status.length >= 280) {
               requirerName = clipName(requirerName, status.length - 280);
               status = `⚠ ALERTA! Novo requerimento minerário de ${FASE} para ${SUBS} de ${areaK2} km² detectado na ANM dentro da UC ${UC_NOME} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;
            }
   
            const unity = await Unity.findOne(
               { "properties.nome": UC_NOME },
               { _id: 0, type: 1, properties: 1, geometry: 1 }
            );
            const image = await getEntityImage(unity);
   
            const tweet = { media: image, status: status };
            tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
         });

         // process.exit(0);
      }
      catch (ex) {
         throw ex;
      }
   })
   .catch(ex => {
      throw ex
   });