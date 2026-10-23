import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import shapefile from 'shapefile';
import { fileManager } from '../config.mjs';
import { getLogger } from './logging.mjs';
import { downloadArchive, extractValidatedArchive } from './import-archive.mjs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const removeTmp = output => {
   fs.rmSync(path.resolve(fileManager.storagePath(), output, 'tmp'), { recursive: true, force: true });
}

const cpFiles = source => {
   for (const file of [source.shapefile, source.dbf]) {
      fs.copyFileSync(
         path.resolve(fileManager.storagePath(), source.output, 'tmp', source.unziped_folder, file),
         path.resolve(fileManager.storagePath(), source.output, file)
      );
   }
}

const makeTmp = (output) => {
   const _tmpPath = path.resolve(fileManager.storagePath(), output, 'tmp');
   if (!fs.existsSync(_tmpPath)){
      fs.mkdirSync(_tmpPath, { recursive: true });
   }

   return _tmpPath;
}

const download = (uri, output, name, options = {}) => downloadArchive(
   uri, path.resolve(fileManager.storagePath(), output, 'tmp', name), options
);

const loadLocal = async (localPath, output, name) => {
   makeTmp(output);
   await promisify(pipeline)(
      fs.createReadStream(localPath),
      fs.createWriteStream(path.resolve(fileManager.storagePath(), output, 'tmp', name))
   );
}

const unzip = async (output, name, required = []) => {
   const destination = path.resolve(fileManager.storagePath(), output, 'tmp');
   extractValidatedArchive(path.join(destination, name), destination, required);
}

const read = async (_path, file, encoding, cb) => {
   const pathfile = path.resolve(fileManager.storagePath(), _path, file);
   const source = await shapefile.open(pathfile, pathfile.replace(/\.shp$/i, '.dbf'), { encoding });
   try {
      while (true) {
         const result = await source.read();
         if (result.done) return;
         await cb(result.value);
      }
   } finally {
      await source.cancel();
   }
}

const writeGeoJson = (data, identity) => {
   getLogger().info(`\nStarting to write ${identity} json file at ${new Date()}`);
   
   const folder = path.resolve(fileManager.storagePath(), `files/${identity}`);
   if (!fs.existsSync(folder)){
      fs.mkdirSync(folder, { recursive: true });
   }

   return new Promise((resolve, reject) => {
      const tmpPath = path.resolve(fileManager.storagePath(), `files/${identity}/${identity}_tmp.json`);
      const defPath = path.resolve(fileManager.storagePath(), `files/${identity}/${identity}.json`);

      fs.writeFile(tmpPath, `{"type":"FeatureCollection","features":${JSON.stringify(data)}}`,
         (err) => {
            if (err) reject(err);
            else {
               child_process.spawnSync('cp', [tmpPath, defPath]);
               child_process.spawnSync('rm', ['-f', tmpPath]);

               getLogger().info(`Finish writing ${identity} json file at ${new Date()}`);

               resolve();
            }
         });
   });
}

const writeCSV = (data, identity, properties = []) => {
   getLogger().info(`\nStarting to write ${identity} csv file at ${new Date()}`);

   const folder = path.resolve(fileManager.storagePath(), `files/${identity}`);
   if (!fs.existsSync(folder)){
      fs.mkdirSync(folder, { recursive: true });
   }

   return new Promise((resolve, reject) => {
      const tmpPath = path.resolve(fileManager.storagePath(), `files/${identity}/${identity}_tmp.csv`);
      const defPath = path.resolve(fileManager.storagePath(), `files/${identity}/${identity}.csv`);

      const wstream = fs.createWriteStream(tmpPath);

      wstream.write(`${properties.join(',')}\n`);

      data.forEach((d) => {
         const line = properties.map(prop => {
            const item = d.properties[prop];

            return !item ? '' : item.toString().indexOf(',') > -1 ? `"${item}"` : item;
         }).join(',');

         wstream.write(`${line}\n`);
      })

      wstream.end(() => {
         child_process.spawnSync('cp', [tmpPath, defPath]);
         child_process.spawnSync('rm', ['-f', tmpPath]);

         getLogger().info(`Finish writing ${identity} csv file at ${new Date()}`);

         resolve();
      });
   });
}


const writeLineDelimitedJson = (data, identity) => {
   getLogger().info(`\nStarting to write ${identity} line delimited json file at ${new Date()}`);

   return new Promise((resolve, reject) => {
      const jsonPath = path.resolve(fileManager.storagePath(), `files/${identity}/${identity}_ld.json`);
      const geoJson = data.map((elem, index) => JSON.stringify(
         {
            geometry: elem.geometry,
            id: index,
            properties: elem.properties,
            type: elem.type
         }
      )).join('\n');
      fs.writeFile(jsonPath, geoJson, err => {
         if (err) reject(err);

         getLogger().info(`Finish writing ${identity} line delimited json file at ${new Date()}`);
         resolve(jsonPath);
      });
   });
}

const getCountryWithClosestArea = (area, language) => {
   const countries = JSON.parse(fs.readFileSync('src/country-area.json'));
   const closestCountry = countries.reduce(
      (prev, curr) => Math.abs(curr.area - area) < Math.abs(prev.area - area) ? curr : prev
   );
   if (language === 'en') {
      return closestCountry.nameEN;
   }
   return closestCountry.name;
}


export {
   removeTmp,
   cpFiles,
   makeTmp,
   download,
   loadLocal,
   unzip,
   read,
   writeCSV,
   writeGeoJson,
   writeLineDelimitedJson,
   getCountryWithClosestArea,
}