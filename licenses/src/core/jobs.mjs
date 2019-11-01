import mongoose from 'mongoose';
import slugify from 'slugify';

import { Invasion } from './models.mjs';
import { importLicenses, importInvasions } from './controllers.mjs';
import { updateTweetStatus } from './services.mjs';

import { tweetMedia, tweetStatus } from '../utils/twitter.mjs';
import { getDateArray } from '../utils/formatter.mjs';
import { cronTab } from '../utils/handler.mjs';

import linksUCs from '../links_ucs.json';

export const scheduleUpdateInvasions = (cb) => {
   /** scheduled to work at 01:00 am - everyday */
   cronTab('30 0 * * *', async () => {
      /** get licenses from ANM and inserts into database */
      await importLicenses();

      /** get every license inside protected unity */
      const invasions = await importInvasions();
      
      cb(invasions);
   });
}

export const scheduleTweetNewInvasionsPT = (invasions) => {   
   let hour = 9;

   invasions.forEach(invasion => {
      /**
      * suposelly we'll never have more than 10 tweets by day.
      * So, it's not really necessary to increment days
      */         
      const dateAndTime = getDateArray({ 
         hour: ++hour,
         minute: 0
      });
      
      /** Starts at 10am, if has something... */
      cronTab(dateAndTime, async () => {
         const { AREA_K2, FASE, SUBS, UC_NOME, NOME } = invasion.properties;
         const slug = slugify(UC_NOME, { replacement: '_', lower: true });
         const link = linksUCs[slug];
         
         let requirerName = NOME;
         let status = `ALERTA! Nova licença de ${Math.round(AREA_K2)} km² de ${FASE} para ${SUBS} detectada no sistema da @ANM dentro da UC ${UC_NOME} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;

         if(status.length >= 280){
            requirerName = clipName(requirerName, status.length - 280);
            status = `ALERTA! Nova licença de ${Math.round(AREA_K2)} km² de ${FASE} para ${SUBS} detectada no sistema da @ANM dentro da UC ${UC_NOME} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;
         }
         
         const tweet = { media: `${process.cwd()}/images/${slug}.png`, status: status };
         
         tweetMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
      });
   });
}

export const scheduleTweetNewInvasionsEN = (invasions) => {   
   let hour = 9;

   invasions.forEach(invasion => {
      /**
      * suposelly we'll never have more than 10 tweets by day.
      * So, it's not really necessary to increment days
      */         
      const dateAndTime = getDateArray({ 
         hour: ++hour,
         minute: 30
      });
      
      /** Starts at 10:30am, if has something... */
      cronTab(dateAndTime, async () => {
         const { AREA_K2, EN_FASE, EN_SUBS, UC_NOME, EN_UC_NOME, NOME } = invasion.properties;
         const slug = slugify(UC_NOME, { replacement: '_', lower: true });
         const link = linksUCs[slug];
         
         let requirerName = NOME;
         let status = `ALERT! New record of ${EN_FASE} for ${EN_SUBS} with ${Math.round(AREA_K2)} km² of area detected on @ANM system within the PA ${EN_UC_NOME} of the Amazon. Request made by ${requirerName}.  #MinedAmazon ${link}`;
         
         if(status.length >= 280){
            requirerName = clipName(requirerName, status.length - 280);
            let status = `ALERT! New record of ${EN_FASE} for ${EN_SUBS} with ${Math.round(AREA_K2)} km² of area detected on @ANM system within the PA ${EN_UC_NOME} of the Amazon. Request made by ${requirerName}.  #MinedAmazon ${link}`;            
         }
         
         const tweet = { media: `${process.cwd()}/images/${slug}.png`, status: status };
         
         tweetMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));

         await updateTweetStatus({ _id: mongoose.Types.ObjectId(invasion._id) });
      });
   });
}

export const scheduleTweetTotalInvasions = () => {
   /** At 09:00 on Monday. */
   cronTab("0 9 * * 1", async () => {
      const total = await Invasion.count();

      tweetStatus(`MINÉRIO ILEGAL: Há ${total} registros de licenças de mineração dentro das 41 UCs de proteção integral da Amazônia tramitando na @ANM. A lei federal 9.985/00 (SNUC) proíbe qualquer tipo de atividade mineradora nessas áreas. #AmazoniaMinada https://bit.ly/2BQvYs1`);
   });
}

export const scheduleTweetTotalYearInvasions = () => {
   /** At 09:00 on Wednesday. */
   cronTab("0 9 * * 3", async () => {      
      const currentYear = new Date().getFullYear();
      const total = await Invasion.count({'properties.ANO': currentYear});

      tweetStatus(`MINÉRIO ILEGAL: Em ${currentYear} a @ANM recebeu ${total} registros de mineração dentro das 41 UCs de proteção integral da Amazônia. A lei federal 9.985/00 (SNUC) proíbe qualquer tipo de atividade mineradora nessas áreas. #AmazoniaMinada https://bit.ly/2BQvYs1`);
   });
}

export const scheduleTweetTotalAreaInvasions = () => {
   /** At 09:00 on Friday. */
   cronTab("0 9 * * 5", async () => {
      const invasions = await Invasion.aggregate([{ 
         $group: {
             _id: null,
             total: {
                 $sum: '$properties.AREA_HA'
             }
         }
      }, {
         $project: {
            campos: "$total",
            k2: {
               $multiply: ["$total", 0.01]
            }
         }
      }]);
      
      tweetStatus(`MINÉRIO ILEGAL: As áreas dos registros de mineração dentro de UCs de proteção integral da Amazônia somam ${Math.round(invasions[0].k2)} km², o equivalente a ${Math.round(invasions[0].campos)} campos de futebol. #AmazoniaMinada https://bit.ly/2BQvYs1`);
   });
}

export const scheduleTweetAvgInvasions = () => {
   /** At 12:00 on Sunday. */
   cronTab("0 12 * * 0", async () => {
      tweetStatus(`MINÉRIO ILEGAL: A lei do SNUC (n° 9.985/2000) proíbe atividades mineradoras em unidades de proteção integral. Mesmo assim, a @ANM registra em média 40 procedimentos por ano apenas em UCs da Amazônia. Acompanhe o #AmazoniaMinada https://bit.ly/2BQvYs1`);
   });
}

export const scheduleTweetWarnEngInvasions = () => {
   /** At 09:00 on Tuesday. */
   cronTab("0 9 * * 2", async () => {
      const currentYear = new Date().getFullYear();
      const total = await Promise.all([
         Invasion.count(),
         Invasion.count({'properties.ANO': currentYear})
      ]);

      const status = `ILLEGAL MINING: Brazilian Government Agency have ${total[0]} applications of mining licenses within integral protected areas of the Amazon. ${total[1]} records are from ${currentYear}. A federal law prohibits mining activity in these areas. #MinedAmazon https://bit.ly/2BQvYs1`;
      
      tweetStatus(status);
   });
}