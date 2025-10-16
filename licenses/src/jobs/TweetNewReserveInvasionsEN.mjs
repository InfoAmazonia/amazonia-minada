import slugify from 'slugify';

import { Reserve, ReserveInvasion } from './models.mjs';
import { updateReserveInvasionTweetStatus } from './services.mjs';
import { getEntityImage } from './mapbox-service.mjs';

import { tweetStatus, tweetImageMedia } from '../utils/twitter.mjs';
import { clipName, getThousandsMark } from '../utils/formatter.mjs';
import { getInvasionsData, storeInvasionsData } from '../utils/file-manager.mjs';
import { dashboardLink } from '../config.mjs';

(async () => {
    // Get the first Invasion to Tweet in the List
    // Do only 1 per job run.

    const invasions = getInvasionsData("reserve_EN");
    const reserveInvasion = invasions.shift();

    try {

        const relatedReserveInvasions = await ReserveInvasion.find({ 'properties.ID': reserveInvasion.properties.ID });

        const wasSomeReserveInvasionTweeted = relatedReserveInvasions.some(reserveInv => reserveInv.tweeted);
        if (wasSomeReserveInvasionTweeted) {
            return;
        }
        const { AREA_K2, EN_FASE, EN_SUBS, TI_NOME, NOME } = reserveInvasion.properties;
        const slug = slugify(TI_NOME, { replacement: '_', lower: true });
        const link = dashboardLink;
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
    finally {
        storeInvasionsData("reserve_EN", invasions);
    }
})();