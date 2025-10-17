
import { Invasion } from './models.mjs';
import { getGeralImage } from './mapbox-service.mjs';

import { tweetStatus, tweetImageMedia } from '../utils/twitter.mjs';
import { dashboardLink } from '../config.mjs';
import { jobEntrypoint } from '../startup.mjs';
(async () => {
    await jobEntrypoint(async () => {
        try {
            const total = await getUniqueInvasionsNumber(Invasion);

            const tweet = {
                media: await getGeralImage(),
                status: `⚠ MINÉRIO ILEGAL: As 49 unidades de conservação de proteção integral da Amazônia são alvo de ${total} requerimentos de mineração ativos na ANM. A lei 9.985/00 proíbe qualquer tipo de atividade mineradora nessas áreas. #AmazoniaMinada ${dashboardLink}`
            };

            tweetImageMedia(tweet.media, (media_id) => tweetStatus(tweet.status, media_id));
        } catch (ex) {
            console.error(ex);
        }
    });
})();