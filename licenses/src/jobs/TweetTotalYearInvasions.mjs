
import { Invasion, ReserveInvasion } from './models.mjs';
import { getGeralImage } from './mapbox-service.mjs';

import { tweetStatus, tweetImageMedia } from '../utils/twitter.mjs';
import { dashboardLink } from '../config.mjs';
import { jobEntrypoint } from '../startup.mjs';
import { getLogger } from '../utils/logging.mjs';

(async () => {
    await jobEntrypoint(async () => {
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
                status: `⚠ Nosso simpático robô já detectou ${totalReserveInvasions} requerimentos minerários em terras indígenas e ${totalInvasions} em UCs de proteção integral em ${currentYear} na Amazônia. A área alvo desses pedidos ativos na ANM é equivalente a ${totalCampos} campos de futebol. #AmazoniaMinada ${dashboardLink}`
            };

            tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
        } catch (ex) {
            getLogger().error(`Failed Tweet Total Year: ${ex} `);
        }
    });
})();