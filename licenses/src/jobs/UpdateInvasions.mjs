import { appendInvasionsData } from '../utils/file-manager.mjs';
import {
    importUnities,
    importLicenses,
    importInvasions,
} from './controllers.mjs';
import { updateTweetStatus } from './services.mjs';
import { dashboardLink } from '../config.mjs';
import { jobEntrypoint } from '../startup.mjs';
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
            appendInvasionsData(invasions, "PT");
            appendInvasionsData(invasions, "EN");
        } catch (ex) {
            console.error(ex);
        }
    });
})();