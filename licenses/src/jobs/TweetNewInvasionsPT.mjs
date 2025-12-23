import mongoose from 'mongoose';
import slugify from 'slugify';

import { Unity, Invasion } from '../core/models.mjs';
import { getEntityImage } from '../core/mapbox-service.mjs';
import { updateTweetStatus } from '../core/services.mjs';

import { tweetStatus, tweetImageMedia } from '../utils/twitter.mjs';
import { clipName, getThousandsMark } from '../utils/formatter.mjs';
import { dashboardLink } from '../config.mjs';
import { jobEntrypoint } from '../startup.mjs';
import { popItem, updateItemStatus } from '../core/queue.mjs';
import { getLogger } from '../utils/logging.mjs';
import { getInvasionAreaNamesText } from '../core/jobs.mjs';

(async () => {
    await jobEntrypoint(async () => {
        while (true) {
            const invasionItem = await popItem('InvasionPT');
            if (invasionItem !== undefined && invasionItem !== null) {
                getLogger().info(`DEBUG: ${JSON.stringify(invasionItem)}`);
                try {
                    getLogger().info(`Tweeting Invasion PT: ${invasionItem.key} `);
                    
                    const invasion = JSON.parse(invasionItem.data);
                    const relatedInvasions = await Invasion.find({ 'properties.ID': invasion.properties.ID });

                    getLogger().info(`Found ${relatedInvasions.length} related invasions for ID: ${invasion.properties.ID} `);

                    const wasSomeInvasionTweeted = relatedInvasions.some(inv => inv.tweeted);
                    if (wasSomeInvasionTweeted) {
                        getLogger().info(`Invasion PT: ${invasionItem.key} already tweeted. Skipping... `);
                        continue;
                    }

                    getLogger().info(`Preparing tweet for Invasion PT: ${invasionItem.key} `);

                    const { AREA_K2, FASE, SUBS, UC_NOME, NOME } = invasion.properties;
                    const slug = slugify(UC_NOME, { replacement: '_', lower: true });
                    const link = dashboardLink;
                    const areaK2 = getThousandsMark(parseFloat(AREA_K2).toFixed(2));
                    const areaNamesText = getInvasionAreaNamesText(relatedInvasions, 'pt');

                    getLogger().info(`Tweet content prepared for Invasion PT: ${invasionItem.key} `);

                    let requirerName = NOME;
                    let status = `⚠ ALERTA! Novo requerimento minerário de ${FASE} para ${SUBS} de ${areaK2} km² detectado na ANM dentro ${areaNamesText} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;

                    if (status.length >= 280) {
                        requirerName = clipName(requirerName, status.length - 280);
                        status = `⚠ ALERTA! Novo requerimento minerário de ${FASE} para ${SUBS} de ${areaK2} km² detectado na ANM dentro ${areaNamesText} da Amazônia. Pedido feito por ${requirerName}. #AmazoniaMinada ${link}`;
                    }

                    getLogger().info(`Tweet status prepared for Invasion PT: ${invasionItem.key} `);

                    const unity = await Unity.findOne(
                        { "properties.nome": UC_NOME },
                        { _id: 0, type: 1, properties: 1, geometry: 1 }
                    );
                    const image = await getEntityImage(unity);

                    const tweet = { media: image, status: status };
                    getLogger().info(`Sending tweet for Invasion PT: ${invasionItem.key} `);
                    tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));

                    getLogger().info(`Tweet sent for Invasion PT: ${invasionItem.key} `);
                    
                    await updateTweetStatus({ 'properties.ID': invasion.properties.ID });
                    await updateItemStatus('InvasionPT', invasionItem._id, 'completed');
                } catch (ex) {
                    getLogger().error(`Failed to tweet Invasion PT: ${invasionItem.key} -> \r\n ${ex} `);
                    await updateItemStatus('InvasionPT', invasionItem._id, 'failed');
                }                
            }
            else {
                break;
            }
        }
    });
})();