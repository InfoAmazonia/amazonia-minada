import mongoose from 'mongoose';

import { Reserve } from './models.mjs';
import {
   importReserves,
   importReserveInvasions
} from './controllers.mjs';
import { updateTweetStatus } from './services.mjs';
import { dashboardLink } from '../config.mjs';
import { appendInvasionsData } from '../utils/file-manager.mjs';

(async () => {
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

        appendInvasionsData(reserveInvasions, "reserve_PT");
        appendInvasionsData(reserveInvasions, "reserve_EN");
    } catch (ex) {
        console.error(ex);
    }
})();