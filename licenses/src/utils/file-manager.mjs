import child_process from 'child_process';
import request from 'request';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import shapefile from 'shapefile';
import { fileManager } from '../config.mjs';
import { getLogger } from './logging.mjs';

const removeTmp = output => {
   child_process.spawnSync('rm', [
      '-rf',
      path.resolve(fileManager.storagePath(), output, 'tmp')
   ]);
}

const cpFiles = source => {

   const cp1_path = path.resolve(fileManager.storagePath(), source.output, 'tmp', source.unziped_folder, source.shapefile);

   child_process.spawnSync('cp', [
      cp1_path,
      path.resolve(fileManager.storagePath(), source.output)
   ]);

   const dbf_path = path.resolve(fileManager.storagePath(), source.output, 'tmp', source.unziped_folder, source.dbf);

   child_process.spawnSync('cp', [
      dbf_path,
      path.resolve(fileManager.storagePath(), source.output)
   ]);

   getLogger().info(`Copied files from ${cp1_path} and ${dbf_path} to ${path.resolve(fileManager.storagePath(), source.output)}`);
}

const makeTmp = (output) => {
   const _tmpPath = path.resolve(fileManager.storagePath(), output, 'tmp');
   if (!fs.existsSync(_tmpPath)){
      fs.mkdirSync(_tmpPath, { recursive: true });
   }

   return _tmpPath;
}

const download = (uri, output, name) => {
   getLogger().info('Preparing files(1/2) - Downloading files.');

   const destination = path.resolve(fileManager.storagePath(),`${output}/tmp/${name}`);
   getLogger().info(`Making tmp folder at output: ${output} -> ${destination}`);

   makeTmp(output);

   getLogger().info(`Downloading from ${uri} to ${destination}`);

   return new Promise((resolve, reject) => {
      request({ uri, rejectUnauthorized: false })
         .pipe(fs.createWriteStream(destination))
         .on('close', (err) => {
            if (err) reject(err)

            resolve()
         });
   })
}

const loadLocal = (localPath, output, name) => {
   getLogger().info('Preparing files(1/2) - Loading local files.');

   return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(localPath);
      const writeStream = fs.createWriteStream(path.resolve(fileManager.storagePath(), `${output}/tmp/${name}`));

      readStream.pipe(writeStream);
      writeStream.on('close', err => {
         if (err) reject(err);
         resolve();
      });
   });
}

const unzip = (pathfile, zipfile) => {
   getLogger().info('Preparing files(2/2) - Unzipping files.');

   return new Promise((resolve, reject) => {
      const zip = new AdmZip(path.resolve(fileManager.storagePath(), pathfile, 'tmp', zipfile));

      const destination = path.resolve(fileManager.storagePath(), pathfile, 'tmp');
      getLogger().info(`Unzipping ${zipfile} to ${destination}`);

      zip.extractAllToAsync(destination, false, err => {
         if (err) reject(err);

         resolve();
      });
   });
}

const read = (_path, file, encoding, cb) => {
   getLogger().info(`\nStarting to read file at ${new Date()}`);

   const pathfile = path.resolve(fileManager.storagePath(), `${_path}/${file}`);

   getLogger().info(`Reading shapefile at ${pathfile} with encoding ${encoding}`);

   return shapefile.open(
      `${pathfile}`,
      (`${pathfile}`).replace('shp', 'dbf'),
      { encoding }
   )
      .then(source => source.read()
         .then(function log(result) {
            if (result.done) return;

            return cb(result.value)
               .then(() => source.read())
               .then(log)
         }))
      .then(() => getLogger().info(`\nFinished reading at ${new Date()}`))
      .catch(error => getLogger().error(error.stack));
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