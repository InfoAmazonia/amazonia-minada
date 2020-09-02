import mbxClient  from '@mapbox/mapbox-sdk/index';
import mbxUploads from '@mapbox/mapbox-sdk/services/uploads';
import { mapbox } from '../config.mjs';

const sendDataToMapbox = (data, identity) => {
    console.log(`\nStarting to send ${identity} data to Mapbox API at ${new Date()}`);

    // const uploadsService = mbxUploads({ accessToken: mapbox.access_token });
    const baseClient = mbxClient({ accessToken: mapbox.access_token });
    const uploadsService = mbxUploads(baseClient);

    // TODO: descobrir o que deve ser enviado na API
    return new Promise((resolve, reject) => {
        uploadsService.listUploads()
            .send()
            .then(response => {
                const uploads = response.body;
                console.log(uploads);
                console.log(`Finish sending ${identity} data to Mapbox API at ${new Date()}`);
                resolve();
            })
            .catch(err => reject(err));
    });
}

export {
    sendDataToMapbox
}

