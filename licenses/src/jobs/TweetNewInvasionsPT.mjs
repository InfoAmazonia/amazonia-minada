import mongoose from 'mongoose';
import slugify from 'slugify';

import { Unity } from './models.mjs';
import { getEntityImage } from './mapbox-service.mjs';

import { tweetStatus, tweetImageMedia } from '../utils/twitter.mjs';
import { clipName, getThousandsMark } from '../utils/formatter.mjs';
import { getInvasionsData, storeInvasionsData } from '../utils/file-manager.mjs';
import { dashboardLink } from '../config.mjs';
import { jobEntrypoint } from '../startup.mjs';
(async () => {
    await jobEntrypoint(async () => {
        // Get the first Invasion to Tweet in the List
        // Do only 1 per job run.

        const invasions = getInvasionsData("PT");
        const invasion = invasions.shift();

        try {

            const relatedInvasions = await Invasion.find({ 'properties.ID': invasion.properties.ID });

            const wasSomeInvasionTweeted = relatedInvasions.some(inv => inv.tweeted);
            if (wasSomeInvasionTweeted) {
                return;
            }

            const { AREA_K2, FASE, SUBS, UC_NOME, NOME } = invasion.properties;
            const slug = slugify(UC_NOME, { replacement: '_', lower: true });
            const link = dashboardLink;
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
        finally {
            storeInvasionsData("PT", invasions);
        }
    });
})();