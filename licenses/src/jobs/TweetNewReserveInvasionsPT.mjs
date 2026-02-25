import slugify from 'slugify';

import { Reserve, ReserveInvasion } from '../core/models.mjs';
import { getEntityImage } from '../core/mapbox-service.mjs';
import { updateReserveInvasionTweetStatus } from '../core/services.mjs';

import { tweetStatus, tweetImageMedia } from '../utils/twitter.mjs';
import { clipName, getThousandsMark } from '../utils/formatter.mjs';
import { dashboardLink } from '../config.mjs';
import { jobEntrypoint } from '../startup.mjs';
import { popItem, updateItemStatus } from '../core/queue.mjs';
import { getLogger } from '../utils/logging.mjs';
import { getReserveInvasionAreaNamesText } from '../core/jobs.mjs';

(async () => {
    await jobEntrypoint(async () => {
        var invasionItem = await popItem('ReverseInvasionPT');
        while (invasionItem !== undefined && invasionItem !== null) {
            try {
                getLogger().info(`Tweeting Reserve Invasion PT: ${invasionItem.key} `);

                const reserveInvasion = JSON.parse(invasionItem.data);
                const relatedReserveInvasions = await ReserveInvasion.find({ 'properties.ID': reserveInvasion.properties.ID });

                getLogger().info(`Found ${relatedReserveInvasions.length} related reserve invasions for ID: ${reserveInvasion.properties.ID} `);

               if (relatedReserveInvasions.length === 0) {
                    getLogger().info(`No related invasions found for ID: ${reserveInvasion.properties.ID} . Skipping... `);
                    await updateItemStatus('ReverseInvasionPT', invasionItem._id, 'completed');
                    invasionItem = await popItem('ReverseInvasionPT');
                    continue;
                }

                const wasSomeReserveInvasionTweeted = relatedReserveInvasions.some(reserveInv => reserveInv.tweeted);
                if (wasSomeReserveInvasionTweeted) {
                    getLogger().info(`Reserve Invasion PT: ${invasionItem.key} already tweeted. Skipping... `);
                    await updateItemStatus('ReverseInvasionPT', invasionItem._id, 'completed');
                    invasionItem = await popItem('ReverseInvasionPT');
                    continue;
                }

                getLogger().info(`Preparing tweet for Reserve Invasion PT: ${invasionItem.key} `);

                const { AREA_K2, FASE, SUBS, TI_NOME, NOME } = reserveInvasion.properties;
                const slug = slugify(TI_NOME, { replacement: '_', lower: true });
                const link = dashboardLink;
                const areaK2 = getThousandsMark(parseFloat(AREA_K2).toFixed(2));
                const areaNamesText = getReserveInvasionAreaNamesText(relatedReserveInvasions, 'pt');

                getLogger().info(`Tweet content prepared for Reserve Invasion PT: ${invasionItem.key} `);

                let requirerName = NOME;
                let status = `⚠ ALERTA! Novo requerimento minerário de ${FASE} para ${SUBS} de ${areaK2} km² detectado na ANM dentro ${areaNamesText} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;

                if (status.length >= 280) {
                    requirerName = clipName(requirerName, status.length - 280);
                    status = `⚠ ALERTA! Novo requerimento minerário de ${FASE} para ${SUBS} de ${areaK2} km² detectado na ANM dentro ${areaNamesText} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;
                }

                getLogger().info(`Tweet status prepared for Reserve Invasion PT: ${invasionItem.key} `);

                const reserve = await Reserve.findOne(
                    { "properties.terrai_nom": TI_NOME },
                    { _id: 0, type: 1, properties: 1, geometry: 1 }
                );
                const image = await getEntityImage(reserve);

                const tweet = { media: image, status: status };
                getLogger().info(`Sending tweet for Reserve Invasion PT: ${invasionItem.key} `);
                const mediaId = await tweetImageMedia(tweet.media);
                await tweetStatus(tweet.status, mediaId);

                getLogger().info(`Tweet sent for Reserve Invasion PT: ${invasionItem.key} `);

                await updateReserveInvasionTweetStatus({ 'properties.ID': reserveInvasion.properties.ID });
                await updateItemStatus('ReverseInvasionPT', invasionItem._id, 'completed');
            } catch (ex) {
                getLogger().error(`Failed to tweet Reserve Invasion PT: ${invasionItem.key} -> \r\n ${ex} `);
                await updateItemStatus('ReverseInvasionPT', invasionItem._id, 'failed');
            }

            invasionItem = await popItem('ReverseInvasionPT');
        }

        getLogger().info(`No more items in queue for Reserve Invasion PT. Exiting... `);
    })
})();