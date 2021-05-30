import mongoose from 'mongoose';
import slugify from 'slugify';

import { Invasion, Unity, Reserve, ReserveInvasion } from './models.mjs';
import {
   importUnities,
   importLicenses,
   importInvasions,
   importReserves,
   importReserveInvasions
} from './controllers.mjs';
import { updateTweetStatus, updateReserveInvasionTweetStatus } from './services.mjs';
import { getEntityImage, getGeralImage } from './mapbox-service.mjs';

import { tweetStatus, tweetImageMedia } from '../utils/twitter.mjs';
import { getDateArray, clipName, getThousandsMark, getAreaNames, addInternationalization } from '../utils/formatter.mjs';
import { cronTab } from '../utils/handler.mjs';
import { getCountryWithClosestArea } from '../utils/file-manager.mjs';

import linksUCsPT from '../links-ucs-pt.json';
import linksUCsEN from '../links-ucs-en.json';
import linksTIsPT from '../links-tis-pt.json';
import linksTIsEN from '../links-tis-en.json';

// UNITIES

export const scheduleUpdateInvasions = (cb) => {
   /** scheduled to work at 00:30 am - everyday */
   cronTab('30 0 * * *', async () => {
      try {
         /** check if there is any unity in database, if not import them */
         const hasUnities = await Unity.countDocuments() > 0;
         if (!hasUnities) {
            await importUnities();
         }

         /** get licenses from ANM and inserts into database */
         await importLicenses();

         /** get every license inside protected unity */
         const invasions = await importInvasions();

         /** filter out invasions from prior years */
         await updateTweetStatus({
            _id: {
               $in: invasions
                  .filter(invasion => invasion.properties.ANO !== new Date().getFullYear())
                  .map(invasion => mongoose.Types.ObjectId(invasion._id))
            }
         });

         cb(invasions);
      } catch (ex) {
         console.error(ex);
      }
   });
}

export const scheduleTweetNewInvasionsPT = async (invasions) => {
   let hour = 10;

   for await (const invasion of invasions) {
      const relatedInvasions = await Invasion.find({ 'properties.ID': invasion.properties.ID });

      const wasSomeInvasionTweeted = relatedInvasions.some(inv => inv.tweeted);
      if (wasSomeInvasionTweeted) {
         continue;
      }

      /**
      * suposelly we'll never have more than 10 tweets by day.
      * So, it's not really necessary to increment days
      */
      const dateAndTime = getDateArray({
         hour: ++hour,
         minute: 30
      });

      /** Starts at 10am, if has something... */
      cronTab(dateAndTime, async () => {
         try {
            const { AREA_K2, FASE, SUBS, UC_NOME, NOME } = invasion.properties;
            const slug = slugify(UC_NOME, { replacement: '_', lower: true });
            const link = linksUCsPT[slug];
            const areaK2 = getThousandsMark(parseFloat(AREA_K2).toFixed(2));
            const areaNamesText = getInvasionAreaNamesText(relatedInvasions, 'pt');

            let requirerName = NOME;
            let status = `⚠ ALERTA! Novo requerimento minerário de ${FASE} para ${SUBS} de ${areaK2} km² detectado na ANM dentro ${areaNamesText} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;

            if (status.length >= 280) {
               requirerName = clipName(requirerName, status.length - 280);
               status = `⚠ ALERTA! Novo requerimento minerário de ${FASE} para ${SUBS} de ${areaK2} km² detectado na ANM dentro ${areaNamesText} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;
            }

            const unity = await Unity.findOne(
               { "properties.nome": UC_NOME },
               { _id: 0, type: 1, properties: 1, geometry: 1 }
            );
            const image = await getEntityImage(unity);

            const tweet = { media: image, status: status };
            tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
         } catch (ex) {
            console.error(ex);
         }
      });
   }
}

export const scheduleTweetNewInvasionsEN = async (invasions) => {
   let hour = 10;

   for await (const invasion of invasions) {
      const relatedInvasions = await Invasion.find({ 'properties.ID': invasion.properties.ID });

      const wasSomeInvasionTweeted = relatedInvasions.some(inv => inv.tweeted);
      if (wasSomeInvasionTweeted) {
         await updateTweetStatus({ 'properties.ID': invasion.properties.ID });
         continue;
      }

      /**
      * suposelly we'll never have more than 10 tweets by day.
      * So, it's not really necessary to increment days
      */
      const dateAndTime = getDateArray({
         hour: ++hour,
         minute: 45
      });

      /** Starts at 10:30am, if has something... */
      cronTab(dateAndTime, async () => {
         try {
            const { AREA_K2, EN_FASE, EN_SUBS, UC_NOME, EN_UC_NOME, NOME } = invasion.properties;
            const slug = slugify(UC_NOME, { replacement: '_', lower: true });
            const link = linksUCsEN[slug];
            const areaK2 = getThousandsMark(parseFloat(AREA_K2).toFixed(2));
            const areaNamesText = getInvasionAreaNamesText(relatedInvasions, 'en');

            let requirerName = NOME;
            let status = `⚠ WARNING! New mining record of ${EN_FASE} for ${EN_SUBS} with ${areaK2} km² of area detected within the ${areaNamesText} of the Amazon. Request on government agency made by ${requirerName}. #MinedAmazon ${link}`;

            if (status.length >= 280) {
               requirerName = clipName(requirerName, status.length - 280);
               status = `⚠ WARNING! New mining record of ${EN_FASE} for ${EN_SUBS} with ${areaK2} km² of area detected within the ${areaNamesText} of the Amazon. Request on government agency made by ${requirerName}. #MinedAmazon ${link}`;
            }

            const unity = await Unity.findOne(
               { "properties.nome": UC_NOME },
               { _id: 0, type: 1, properties: 1, geometry: 1 }
            );
            const image = await getEntityImage(unity);

            const tweet = { media: image, status: status };
            tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));

            await updateTweetStatus({ 'properties.ID': invasion.properties.ID });
         } catch (ex) {
            console.error(ex);
         }
      });
   };
}

export const scheduleTweetTotalInvasions = () => {
   /** At 12:00 on Wednesday. */

   cronTab("0 12 * * 3", async () => {
      try {
         const total = await getUniqueInvasionsNumber(Invasion);

         const tweet = {
            media: await getGeralImage(),
            status: `⚠ MINÉRIO ILEGAL: As 49 unidades de conservação de proteção integral da Amazônia são alvo de ${total} requerimentos de mineração ativos na ANM. A lei 9.985/00 proíbe qualquer tipo de atividade mineradora nessas áreas. #AmazoniaMinada https://bit.ly/3f7rO1F`
         };

         tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
      } catch (ex) {
         console.error(ex);
      }
   });
}

const getInvasionAreaNamesText = (relatedInvasions, language = 'pt') => {
   const isPlural = relatedInvasions.length > 1;

   switch (language) {
      case 'en':
         const translatedInvasions = relatedInvasions.map(
            relatedInvasion => addInternationalization(
               relatedInvasion,
               [{ "uc": { crr: "UC_NOME", new: "EN_UC_NOME" } }]
            )
         );
         if (isPlural) {
            return `PAs ${getAreaNames(translatedInvasions, 'EN_UC_NOME')}`;
         } else {
            return `PA ${translatedInvasions[0].properties.EN_UC_NOME}`;
         }

      default:
         if (isPlural) {
            return `das UCs ${getAreaNames(relatedInvasions, 'UC_NOME')}`;
         } else {
            return `da UC ${relatedInvasions[0].properties.UC_NOME}`;
         }
   }
}

// RESERVES

export const scheduleUpdateReserveInvasions = (cb) => {
   /** scheduled to work at 01:30 am - everyday */
   cronTab('30 1 * * *', async () => {
      try {
         /** check if there is any reserve in database, if not import them */
         const hasReserves = await Reserve.countDocuments() > 0;
         if (!hasReserves) {
            await importReserves();
         }

         /** get every license inside protected unity */
         const reserveInvasions = await importReserveInvasions();

         /** filter out reserve invasions from prior years */
         await updateTweetStatus({
            _id: {
               $in: reserveInvasions
                  .filter(invasion => invasion.properties.ANO !== new Date().getFullYear())
                  .map(invasion => mongoose.Types.ObjectId(invasion._id))
            }
         });

         cb(reserveInvasions);
      } catch (ex) {
         console.error(ex);
      }
   });
}

export const scheduleTweetNewReserveInvasionsPT = async (reserveInvasions) => {
   let hour = 9;

   for await (const reserveInvasion of reserveInvasions) {
      const relatedReserveInvasions = await ReserveInvasion.find({ 'properties.ID': reserveInvasion.properties.ID });

      const wasSomeReserveInvasionTweeted = relatedInvasions.some(reserveInv => reserveInv.tweeted);
      if (wasSomeReserveInvasionTweeted) {
         continue;
      }

      /**
      * suposelly we'll never have more than 10 tweets by day.
      * So, it's not really necessary to increment days
      */
      const dateAndTime = getDateArray({
         hour: ++hour,
         minute: 0
      });

      /** Starts at 9am, if has something... */
      cronTab(dateAndTime, async () => {
         try {
            const { AREA_K2, FASE, SUBS, TI_NOME, NOME } = reserveInvasion.properties;
            const slug = slugify(TI_NOME, { replacement: '_', lower: true });
            const link = linksTIsPT[slug];
            const areaK2 = getThousandsMark(parseFloat(AREA_K2).toFixed(2));
            const areaNamesText = getReserveInvasionAreaNamesText(relatedReserveInvasions, 'pt');

            let requirerName = NOME;
            let status = `⚠ ALERTA! Novo requerimento minerário de ${FASE} para ${SUBS} de ${areaK2} km² detectado na ANM dentro ${areaNamesText} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;

            if (status.length >= 280) {
               requirerName = clipName(requirerName, status.length - 280);
               status = `⚠ ALERTA! Novo requerimento minerário de ${FASE} para ${SUBS} de ${areaK2} km² detectado na ANM dentro ${areaNamesText} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;
            }

            const reserve = await Reserve.findOne(
               { "properties.terrai_nom": TI_NOME },
               { _id: 0, type: 1, properties: 1, geometry: 1 }
            );
            const image = await getEntityImage(reserve);

            const tweet = { media: image, status: status };
            tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
         } catch (ex) {
            console.error(ex);
         }
      });
   };
}

export const scheduleTweetNewReserveInvasionsEN = async (reserveInvasions) => {
   let hour = 9;

   for await (const reserveInvasion of reserveInvasions) {
      const relatedReserveInvasions = await ReserveInvasion.find({ 'properties.ID': reserveInvasion.properties.ID });

      const wasSomeReserveInvasionTweeted = relatedInvasions.some(reserveInv => reserveInv.tweeted);
      if (wasSomeReserveInvasionTweeted) {
         await updateTweetStatus({ 'properties.ID': reserveInvasion.properties.ID });
         continue;
      }

      /**
      * suposelly we'll never have more than 10 tweets by day.
      * So, it's not really necessary to increment days
      */
      const dateAndTime = getDateArray({
         hour: ++hour,
         minute: 15
      });

      /** Starts at 9:15am, if has something... */
      cronTab(dateAndTime, async () => {
         try {
            const { AREA_K2, EN_FASE, EN_SUBS, TI_NOME, NOME } = reserveInvasion.properties;
            const slug = slugify(TI_NOME, { replacement: '_', lower: true });
            const link = linksTIsEN[slug];
            const areaK2 = getThousandsMark(parseFloat(AREA_K2).toFixed(2));
            const areaNamesText = getReserveInvasionAreaNamesText(relatedReserveInvasions, 'en');

            let requirerName = NOME;
            let status = `⚠ WARNING! New mining record of ${EN_FASE} for ${EN_SUBS} with ${areaK2} km² of area detected within indigenous ${areaNamesText} of the Amazon. Request on government agency made by ${requirerName}. #MinedAmazon ${link}`;

            if (status.length >= 280) {
               requirerName = clipName(requirerName, status.length - 280);
               status = `⚠ WARNING! New mining record of ${EN_FASE} for ${EN_SUBS} with ${areaK2} km² of area detected within indigenous ${areaNamesText} of the Amazon. Request on government agency made by ${requirerName}. #MinedAmazon ${link}`;
            }

            const reserve = await Reserve.findOne(
               { "properties.terrai_nom": TI_NOME },
               { _id: 0, type: 1, properties: 1, geometry: 1 }
            );
            const image = await getEntityImage(reserve);

            const tweet = { media: image, status: status };
            tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));

            await updateReserveInvasionTweetStatus({ 'properties.ID': reserveInvasion.properties.ID });
         } catch (ex) {
            console.error(ex);
         }
      });
   };
}

export const scheduleTweetTotalReserveInvasions = () => {
   /** At 12:00 on Monday. */

   cronTab("0 12 * * 1", async () => {
      try {
         const total = await getUniqueInvasionsNumber(ReserveInvasion);

         const tweet = {
            media: await getGeralImage(),
            status: `⚠ MINÉRIO ILEGAL: Terras indígenas da Amazônia são alvo de ${total} requerimentos para exploração mineral. A Constituição brasileira proíbe qualquer exploração nessas áreas sem autorização do Congresso e consulta aos povos afetados. #AmazoniaMinada https://bit.ly/3f7rO1F`
         };

         tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
      } catch (ex) {
         console.error(ex);
      }
   });
}

const getReserveInvasionAreaNamesText = (relatedReserveInvasions, language = 'pt') => {
   const isPlural = relatedReserveInvasions.length > 1;

   switch (language) {
      case 'en':
         if (isPlural) {
            return `lands ${getAreaNames(relatedReserveInvasions, 'TI_NOME')}`;
         } else {
            return `land ${relatedReserveInvasions[0].properties.TI_NOME}`;
         }

      default:
         if (isPlural) {
            return `das TIs ${getAreaNames(relatedReserveInvasions, 'TI_NOME')}`;
         } else {
            return `da TI ${relatedReserveInvasions[0].properties.TI_NOME}`;
         }
   }
}

// UNITIES and RESERVES

export const scheduleTweetTotalYearInvasions = () => {
   /** At 12:00 on Friday. */
   cronTab("0 12 * * 5", async () => {
      try {
         const currentYear = new Date().getFullYear();

         const totalInvasions = await getUniqueInvasionsNumber(Invasion, { 'properties.ANO': currentYear });
         const totalReserveInvasions = await getUniqueInvasionsNumber(ReserveInvasion, { 'properties.ANO': currentYear });

         const invasions = await Invasion.aggregate([
            {
               $match: {
                  'properties.ANO': { $eq: currentYear },
                  last_action: { $ne: 'delete' }
               }
            },
            {
               $group: {
                  _id: "$properties.ID",
                  invasionAreaSum: { $sum: '$properties.AREA_HA' },
                  count: { $sum: 1 }
               }
            },
            {
               $project: { invasionArea: { $divide: ["$invasionAreaSum", "$count"] } }
            },
            {
               $group: {
                  _id: null,
                  total: { $sum: '$invasionArea' }
               }
            }
         ]);
         const reserveInvasions = await ReserveInvasion.aggregate([
            {
               $match: {
                  'properties.ANO': { $eq: currentYear },
                  last_action: { $ne: 'delete' }
               }
            },
            {
               $group: {
                  _id: "$properties.ID",
                  invasionAreaSum: { $sum: '$properties.AREA_HA' },
                  count: { $sum: 1 }
               }
            },
            {
               $project: { invasionArea: { $divide: ["$invasionAreaSum", "$count"] } }
            },
            {
               $group: {
                  _id: null,
                  total: { $sum: '$invasionArea' }
               }
            }
         ]);

         const totalCampos = Math.round(invasions[0].total + reserveInvasions[0].total);

         const tweet = {
            media: await getGeralImage(),
            status: `⚠ Nosso simpático robô já detectou ${totalReserveInvasions} requerimentos minerários em terras indígenas e ${totalInvasions} em UCs de proteção integral em ${currentYear} na Amazônia. A área alvo desses pedidos ativos na ANM é equivalente a ${totalCampos} campos de futebol. #AmazoniaMinada https://bit.ly/3f7rO1F`
         };

         tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
      } catch (ex) {
         console.error(ex);
      }
   });
}

export const scheduleTweetTotalCountrySizeInvasionsPT = () => {
   /** At 12:00 on Friday. */
   cronTab("0 12 * * 5", async () => {
      try {
         const totalInvasions = await getUniqueInvasionsNumber(Invasion);
         const totalReserveInvasions = await getUniqueInvasionsNumber(ReserveInvasion);

         const invasions = await Invasion.aggregate([
            {
               $match: {
                  last_action: { $ne: 'delete' }
               }
            },
            {
               $group: {
                  _id: "$properties.ID",
                  invasionAreaSum: { $sum: '$properties.AREA_HA' },
                  count: { $sum: 1 }
               }
            },
            {
               $project: { invasionArea: { $divide: ["$invasionAreaSum", "$count"] } }
            },
            {
               $group: {
                  _id: null,
                  total: { $sum: '$invasionArea' }
               }
            },
            {
               $project: {
                  k2: { $multiply: ["$total", 0.01] }
               }
            }
         ]);
         const reserveInvasions = await ReserveInvasion.aggregate([
            {
               $match: {
                  last_action: { $ne: 'delete' }
               }
            },
            {
               $group: {
                  _id: "$properties.ID",
                  invasionAreaSum: { $sum: '$properties.AREA_HA' },
                  count: { $sum: 1 }
               }
            },
            {
               $project: { invasionArea: { $divide: ["$invasionAreaSum", "$count"] } }
            },
            {
               $group: {
                  _id: null,
                  total: { $sum: '$invasionArea' }
               }
            },
            {
               $project: {
                  k2: {
                     $multiply: ["$total", 0.01]
                  }
               }
            }
         ]);

         const totalK2 = invasions[0].k2 + reserveInvasions[0].k2
         const countryName = getCountryWithClosestArea(totalK2);

         const tweet = {
            media: await getGeralImage(),
            status: `⚠ Há atualmente ${totalReserveInvasions} requerimentos minerários em terras indígenas e ${totalInvasions} em UCs de proteção integral ativos na Amazônia. A área total desses processos minerários é aproximadamente equivalente ao tamanho do país ${countryName}. #AmazoniaMinada https://bit.ly/3f7rO1F`
         };

         tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
      } catch (ex) {
         console.error(ex);
      }
   });
}

export const scheduleTweetTotalCountrySizeInvasionsEN = () => {
   /** At 12:00 on Saturday. */
   cronTab("0 12 * * 6", async () => {
      try {
         const totalInvasions = await getUniqueInvasionsNumber(Invasion);
         const totalReserveInvasions = await getUniqueInvasionsNumber(ReserveInvasion);

         const invasions = await Invasion.aggregate([
            {
               $match: {
                  last_action: { $ne: 'delete' }
               }
            },
            {
               $group: {
                  _id: "$properties.ID",
                  invasionAreaSum: { $sum: '$properties.AREA_HA' },
                  count: { $sum: 1 }
               }
            },
            {
               $project: { invasionArea: { $divide: ["$invasionAreaSum", "$count"] } }
            },
            {
               $group: {
                  _id: null,
                  total: { $sum: '$invasionArea' }
               }
            },
            {
               $project: {
                  k2: {
                     $multiply: ["$total", 0.01]
                  }
               }
            }
         ]);
         const reserveInvasions = await ReserveInvasion.aggregate([
            {
               $match: {
                  last_action: { $ne: 'delete' }
               }
            },
            {
               $group: {
                  _id: "$properties.ID",
                  invasionAreaSum: { $sum: '$properties.AREA_HA' },
                  count: { $sum: 1 }
               }
            },
            {
               $project: { invasionArea: { $divide: ["$invasionAreaSum", "$count"] } }
            },
            {
               $group: {
                  _id: null,
                  total: { $sum: '$invasionArea' }
               }
            },
            {
               $project: {
                  k2: {
                     $multiply: ["$total", 0.01]
                  }
               }
            }
         ]);

         const totalK2 = invasions[0].k2 + reserveInvasions[0].k2;
         const countryName = getCountryWithClosestArea(totalK2, 'en');

         const tweet = {
            media: await getGeralImage(),
            status: `⚠ ILLEGAL MINING: Brazilian Government Agency has ${totalReserveInvasions} mining requests within indigenous lands and ${totalInvasions} within protected areas of the Amazon. The total area of these mining requests is approximately the size of ${countryName}. #MinedAmazon https://bit.ly/3nw3byM`
         };

         tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
      } catch (ex) {
         console.error(ex);
      }
   });
}

const getUniqueInvasionsNumber = async (schema, match = {}) => {
   return (await schema.aggregate([
      { $match: { last_action: { $ne: 'delete' }, ...match } },
      { $group: { _id: "$properties.ID" } },
      { $group: { _id: null, total: { $sum: 1 } } }
   ]))[0].total;
};
