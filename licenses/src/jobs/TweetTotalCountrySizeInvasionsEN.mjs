
import { Invasion, ReserveInvasion } from './models.mjs';
import { getGeralImage } from './mapbox-service.mjs';

import { tweetStatus, tweetImageMedia } from '../utils/twitter.mjs';
import { getCountryWithClosestArea } from '../utils/file-manager.mjs';
import { dashboardLink } from '../config.mjs';
import { jobEntrypoint } from '../startup.mjs';
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
})();