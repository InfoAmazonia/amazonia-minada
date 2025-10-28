import mongoose from 'mongoose';

import { Reserve } from './models.mjs';
import {
    importReserves,
    importReserveInvasions
} from './controllers.mjs';
import { updateTweetStatus } from './services.mjs';
import { jobEntrypoint } from '../startup.mjs';
import { getLogger } from '../utils/logging.mjs';

(async () => {
    await jobEntrypoint(async () => {
        try {
            /** check if there is any reserve in database, if not import them */
            const hasReserves = await Reserve.countDocuments() > 0;
            if (!hasReserves) {
                await importReserves();
            }

            /** get every license inside protected unity */
            const reserveInvasions = await importReserveInvasions();

            /** filter out reserve invasions from prior years */
            await updateTweetStatus({
                _id: {
                    $in: reserveInvasions
                        .filter(invasion => invasion.properties.ANO !== new Date().getFullYear())
                        .map(invasion => mongoose.Types.ObjectId(invasion._id))
                }
            });

            for (const invasion of reserveInvasions) {
                const key = `reverseinvasion:${invasion._id}`;
                await addItem('ReverseInvasionPT', key, JSON.stringify(invasion));
                await addItem('ReverseInvasionEN', key, JSON.stringify(invasion));
            }
        } catch (ex) {
            getLogger().error(`Failed Update Reverse Invasions: ${ex} `);
        }
    });
})();