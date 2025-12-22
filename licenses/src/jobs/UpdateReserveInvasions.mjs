import mongoose from 'mongoose';

import { Reserve } from '../core/models.mjs';
import {
    importReserves,
    importReserveInvasions
} from '../core/controllers.mjs';
import { updateReserveInvasionTweetStatus } from '../core/services.mjs';
import { jobEntrypoint } from '../startup.mjs';
import { getLogger } from '../utils/logging.mjs';
import { addItem } from '../core/queue.mjs';

(async () => {
    await jobEntrypoint(async () => {
        try {
            /** check if there is any reserve in database, if not import them */

            getLogger().info(`Checking for existing reserves in database... `);

            const hasReserves = await Reserve.countDocuments() > 0;
            if (!hasReserves) {
                getLogger().info(`No reserves found. Importing reserves... `);
                await importReserves();
            }

            /** get every license inside protected unity */
            getLogger().info(`Importing reserve invasions... `);
            const reserveInvasions = await importReserveInvasions();
            getLogger().info(`Imported ${reserveInvasions.length} reserve invasions. `);

            /** filter out reserve invasions from prior years */            
            getLogger().info(`Updating tweet status for prior year reserve invasions... `);
            await updateReserveInvasionTweetStatus({
                _id: {
                    $in: reserveInvasions
                        .filter(invasion => invasion.properties.ANO !== new Date().getFullYear())
                        .map(invasion => mongoose.Types.ObjectId(invasion._id))
                }
            });

            /** add reserve invasions to processing queue */
            getLogger().info(`Adding reserve invasions to processing queue... `);

            for (const invasion of reserveInvasions) {                
                const key = `reverseinvasion:${invasion._id}`;
                getLogger().info(`Adding invasion to queue: ${key} `);
                await addItem('ReverseInvasionPT', key, JSON.stringify(invasion));
                await addItem('ReverseInvasionEN', key, JSON.stringify(invasion));
            }
        } catch (ex) {
            getLogger().error(`Failed Update Reverse Invasions: ${ex} `);
        }
    });
})();