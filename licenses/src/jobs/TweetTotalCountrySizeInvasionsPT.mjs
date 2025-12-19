
import { Invasion, ReserveInvasion } from '../core/models.mjs';
import { getGeralImage } from '../core/mapbox-service.mjs';

import { tweetStatus, tweetImageMedia } from '../utils/twitter.mjs';
import { getCountryWithClosestArea } from '../utils/file-manager.mjs';
import { dashboardLink } from '../config.mjs';
import { getLogger } from '../utils/logging.mjs';
import { jobEntrypoint } from '../startup.mjs';
import { getUniqueInvasionsNumber } from '../core/jobs.mjs';

(async () => {
    await jobEntrypoint(async () => {
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
                status: `⚠ Há atualmente ${totalReserveInvasions} requerimentos minerários em terras indígenas e ${totalInvasions} em UCs de proteção integral ativos na Amazônia. A área total desses processos minerários é aproximadamente equivalente ao tamanho do país ${countryName}. #AmazoniaMinada ${dashboardLink}`
            };

            tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
        } catch (ex) {
            getLogger().error(`Failed TweetTotalCountrySizeInvasions: ${ex} `);
        }
    });
})();