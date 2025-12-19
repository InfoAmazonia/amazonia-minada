import mongoose from 'mongoose';

import { Unity } from '../core/models.mjs';
import {
    importUnities,
    importLicenses,
    importInvasions,
} from '../core/controllers.mjs';
import { updateTweetStatus } from '../core/services.mjs';
import { jobEntrypoint } from '../startup.mjs';
import { addItem } from '../core/queue.mjs';
import { getLogger } from '../utils/logging.mjs';

(async () => {
    await jobEntrypoint(async () => {
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

            // Store Invasions for the Tweet New Invasions Job
            for (const invasion of invasions) {
                const key = `invasion:${invasion._id}`;
                await addItem('InvasionPT', key, JSON.stringify(invasion));
                await addItem('InvasionEN', key, JSON.stringify(invasion));
            }            
        } catch (ex) {
            getLogger().error(`Failed Update Invasions: ${ex} `);
        }
    });
})();