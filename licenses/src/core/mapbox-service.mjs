import fs from 'fs';
import request from 'request';
import simplify from 'simplify-geojson';

import { writeLineDelimitedJson } from '../utils/file-manager.mjs'
import { mapbox } from '../config.mjs';


const uploadDataToMapbox = async (data, identity) => {
    const jsonPath = await writeLineDelimitedJson(data, identity);

    try {
        console.log(`\nStarting to send ${identity} data to Mapbox API at ${new Date()}`);

        const am_identity = `am_minada_${identity}`;

        await uploadTilesetSource(jsonPath, am_identity);
        if (!(await checkIfTilesetExists(am_identity))) {
            await createTilesetRecipe(am_identity);
        }
        await publishTileset(am_identity);

        console.log(`\nFinish sending ${identity} data to Mapbox API at ${new Date()}`);
    } catch (err) {
        throw err;
    }
}

const uploadTilesetSource = (path, identity) => {
    return new Promise((resolve, reject) => {
        request.put({
            url: mapbox.upload_source_uri(identity),
            formData: {
                file: fs.createReadStream(path)
            }
        }, (err, resp, body) => {
            if (err || resp.statusCode !== 200) {
                return reject(err ? err : body);
            }
            resolve();
        });
    });
}

const checkIfTilesetExists = (identity) => {
    return new Promise((resolve, reject) => {
        request.get({
            url: mapbox.tileset_uri(identity)
        }, (err, resp, body) => {
            if (err || (resp.statusCode !== 200 && resp.statusCode !== 404)) {
                return reject(err ? err : body);
            } else if (resp.statusCode === 404) {
                return resolve(false);
            }
            return resolve(true);
        });
    });
}

const createTilesetRecipe = (identity) => {
    return new Promise((resolve, reject) => {
        request.post({
            url: mapbox.tileset_uri(identity),
            headers: {
                'Content-Type': 'application/json'
            },
            body: mapbox.recipe(identity),
            json: true
        }, (err, resp, body) => {
            if (err || resp.statusCode !== 200) {
                return reject(err ? err : body);
            }
            resolve();
        });
    });
}

const publishTileset = (identity) => {
    return new Promise((resolve, reject) => {
        request.post({
            url: mapbox.publish_tileset_uri(identity)
        }, (err, resp, body) => {
            if (err || resp.statusCode !== 200) {
                return reject(err ? err : body);
            }
            resolve();
        });
    });
}

const getEntityImage = (geojson, type) => {
    const overlay = simplify(geojson, 0.05);
    if (type === 'UC') {
        overlay.properties = {
            "fill":"%23195c53",
            "stroke": "%2327867b",
            "stroke-width": 3,
            "fill-opacity":.5
        };
    } else if (type === 'TI') {
        overlay.properties = {
            "fill":"%23551636",
            "stroke": "%23702341",
            "stroke-width": 3,
            "fill-opacity":.5
        };
    }
    return new Promise((resolve, reject) => {
        request.get({
            url: mapbox.static_image_uri(JSON.stringify(overlay)),
            encoding: null
        }, (err, resp, body) => {
            if (err ||  resp.statusCode !== 200) {
                reject(err ? err : body);
            }
            resolve(body);
        });
    });
}

const getGeralImage = () => {
    return new Promise((resolve, reject) => {
        request.get({
            url: mapbox.geral_image_uri(),
            encoding: null
        }, (err, resp, body) => {
            if (err ||  resp.statusCode !== 200) {
                reject(err ? err : body);
            }
            resolve(body);
        });
    });
}

export {
    uploadDataToMapbox,
    getEntityImage,
    getGeralImage
}

