import slugify from 'slugify';

import { Reserve, ReserveInvasion } from '../core/models.mjs';
import { getEntityImage } from '../core/mapbox-service.mjs';

import { tweetStatus, tweetImageMedia } from '../utils/twitter.mjs';
import { clipName, getThousandsMark } from '../utils/formatter.mjs';
import { dashboardLink } from '../config.mjs';
import { jobEntrypoint } from '../startup.mjs';
import { getLogger } from '../utils/logging.mjs';

(async () => {
    await jobEntrypoint(async () => {
        while (true) {
            const invasionItem = popItem('ReverseInvasionPT');
            if (invasionItem !== null) {
                try {
                    const reserveInvasion = JSON.parse(invasionItem.data);
                    const relatedReserveInvasions = await ReserveInvasion.find({ 'properties.ID': reserveInvasion.properties.ID });

                    const wasSomeReserveInvasionTweeted = relatedReserveInvasions.some(reserveInv => reserveInv.tweeted);
                    if (wasSomeReserveInvasionTweeted) {
                        return;
                    }

                    const { AREA_K2, FASE, SUBS, TI_NOME, NOME } = reserveInvasion.properties;
                    const slug = slugify(TI_NOME, { replacement: '_', lower: true });
                    const link = dashboardLink;
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
                    await updateItemStatus('ReverseInvasionPT', invasionItem._id, 'completed');
                } catch (ex) {
                    getLogger().error(`Failed to tweet Reserve Invasion PT: ${invasionItem.key} -> \r\n ${ex} `);
                    await updateItemStatus('ReverseInvasionPT', invasionItem._id, 'failed');
                }
            }
            else {
                break;
            }
        }
    })
})();