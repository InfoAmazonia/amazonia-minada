
import { ReserveInvasion } from './models.mjs';
import { getGeralImage } from './mapbox-service.mjs';

import { tweetStatus, tweetImageMedia } from '../utils/twitter.mjs';
import { dashboardLink } from '../config.mjs';

(async () => {
    try {
        const total = await getUniqueInvasionsNumber(ReserveInvasion);

        const tweet = {
            media: await getGeralImage(),
            status: `⚠ MINÉRIO ILEGAL: Terras indígenas da Amazônia são alvo de ${total} requerimentos para exploração mineral. A Constituição brasileira proíbe qualquer exploração nessas áreas sem autorização do Congresso e consulta aos povos afetados. #AmazoniaMinada ${dashboardLink}`
        };

        tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
    } catch (ex) {
        console.error(ex);
    }
})();