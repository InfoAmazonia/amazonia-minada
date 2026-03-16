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
import { getLogger } from '../utils/logging.mjs';

export const getInvasionAreaNamesText = (relatedInvasions, language = 'pt') => {
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

export const getReserveInvasionAreaNamesText = (relatedReserveInvasions, language = 'pt') => {
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

export const getUniqueInvasionsNumber = async (schema, match = {}) => {
   return (await schema.aggregate([
      { $match: { last_action: { $ne: 'delete' }, ...match } },
      { $group: { _id: "$properties.ID" } },
      { $group: { _id: null, total: { $sum: 1 } } }
   ]))[0].total;
};
