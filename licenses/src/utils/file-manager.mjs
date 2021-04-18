import child_process from 'child_process';
import request from 'request';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import shapefile from 'shapefile';

const removeTmp = output => {
   child_process.spawnSync('rm', [
      '-rf',
      path.resolve(process.cwd(), output, 'tmp')
   ]);
}

const cpFiles = source => {
   child_process.spawnSync('cp', [
      path.resolve(process.cwd(), source.output, 'tmp', source.unziped_folder, source.shapefile),
      path.resolve(process.cwd(), source.output)
   ]);

   child_process.spawnSync('cp', [
      path.resolve(process.cwd(), source.output, 'tmp', source.unziped_folder, source.dbf),
      path.resolve(process.cwd(), source.output)
   ]);
}

const makeTmp = (output) => {
   child_process.spawnSync('mkdir', [
      path.resolve(process.cwd(), output, 'tmp')
   ]);
}

const download = (uri, output, name) => {
   console.log('Preparing files(1/2) - Downloading files.');

   return new Promise((resolve, reject) => {
      request(uri)
         .pipe(fs.createWriteStream(path.resolve(`${output}/tmp/${name}`)))
         .on('close', (err) => {
            if (err) reject(err)

            resolve()
         });
   })
}

const loadLocal = (localPath, output, name) => {
   console.log('Preparing files(1/2) - Loading local files.');

   return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(localPath);
      const writeStream = fs.createWriteStream(path.resolve(`${output}/tmp/${name}`));

      readStream.pipe(writeStream);
      writeStream.on('close', err => {
         if (err) reject(err);
         resolve();
      });
   });
}

const unzip = (pathfile, zipfile) => {
   console.log('Preparing files(2/2) - Unzipping files.');

   return new Promise((resolve, reject) => {
      const zip = new AdmZip(path.resolve(process.cwd(), pathfile, 'tmp', zipfile));
      zip.extractAllToAsync(path.resolve(process.cwd(), pathfile, 'tmp'), false, err => {
         if (err) reject(err);

         resolve();
      });
   });
}

const read = (path, file, encoding, cb) => {
   console.log(`\nStarting to read file at ${new Date()}`);
   return shapefile.open(
      `${path}/${file}`,
      (`${path}/${file}`).replace('shp', 'dbf'),
      { encoding }
   )
      .then(source => source.read()
         .then(function log(result) {
            if (result.done) return;

            return cb(result.value)
               .then(() => source.read())
               .then(log)
         }))
      .then(() => console.log(`\nFinished reading at ${new Date()}`))
      .catch(error => console.error(error.stack));
}

const writeGeoJson = (data, identity) => {
   console.log(`\nStarting to write ${identity} json file at ${new Date()}`);

   return new Promise((resolve, reject) => {
      const tmpPath = path.resolve(process.cwd(), `files/${identity}/${identity}_tmp.json`);
      const defPath = path.resolve(process.cwd(), `files/${identity}/${identity}.json`);

      fs.writeFile(tmpPath, `{"type":"FeatureCollection","features":${JSON.stringify(data)}}`,
         (err) => {
            if (err) reject(err);
            else {
               child_process.spawnSync('cp', [tmpPath, defPath]);
               child_process.spawnSync('rm', ['-f', tmpPath]);

               console.log(`Finish writing ${identity} json file at ${new Date()}`);

               resolve();
            }
         });
   });
}

const writeCSV = (data, identity, properties = []) => {
   console.log(`\nStarting to write ${identity} csv file at ${new Date()}`);

   return new Promise((resolve, reject) => {
      const tmpPath = path.resolve(process.cwd(), `files/${identity}/${identity}_tmp.csv`);
      const defPath = path.resolve(process.cwd(), `files/${identity}/${identity}.csv`);

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

         console.log(`Finish writing ${identity} csv file at ${new Date()}`);

         resolve();
      });
   });
}


const writeLineDelimitedJson = (data, identity) => {
   console.log(`\nStarting to write ${identity} line delimited json file at ${new Date()}`);

   return new Promise((resolve, reject) => {
      const jsonPath = path.resolve(process.cwd(), `files/${identity}/${identity}_ld.json`);
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

         console.log(`Finish writing ${identity} line delimited json file at ${new Date()}`);
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
   getCountryWithClosestArea
}
