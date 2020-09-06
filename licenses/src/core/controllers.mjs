import { license, unity } from '../config.mjs';

import { 
   read, 
   download, 
   unzip, 
   cpFiles, 
   removeTmp, 
   makeTmp, 
   writeGeoJson, 
   writeCSV 
} from '../utils/file-manager.mjs';


import { getAbrev } from '../utils/formatter.mjs';
import { ifMayNotIgnore } from '../utils/handler.mjs';

import { License, Unity } from './models.mjs';
import { createInvasionsByUnities, getUnitiesInsideAmazon } from './services.mjs';
import { uploadDataToMapbox } from './mapbox-service.mjs';

export const importLicenses = async () => {
   console.log(`\nStarting to import licenses at ${new Date()}`);
         
   const session = await License.startSession();
   
   session.startTransaction();
   
   return License.deleteMany({})
      .then(() => removeTmp(license.output))   
      .then(() => makeTmp(license.output))
      .then(() => download(license.uri, license.output, license.zipfile))
      .then(() => unzip(license.output, license.zipfile))
      .then(() => cpFiles(license))
      .then(() => removeTmp(license.output))
      .then(() => read(
         license.output, 
         license.shapefile, 
         license.encoding, 
            value => License.create(value)
               .catch(ex => ifMayNotIgnore(ex).throw())
      ))
      .then(() => session.commitTransaction())
      .then(() => session.endSession())
      .then(() => console.log(`Finish importing licenses at ${new Date()}`))
      .catch(async ex => {
         await session.abortTransaction();
         session.endSession();
   
         console.log(ex)
      })
}

export const importUnities = async () => {
   console.log(`\nStarting to import unities at ${new Date()}`);   

   const session = await Unity.startSession();

   session.startTransaction();

   return Unity.deleteMany({})
      .then(() => removeTmp(unity.output))   
      .then(() => makeTmp(unity.output))
      .then(() => download(unity.uri, unity.output, unity.zipfile))
      .then(() => unzip(unity.output, unity.zipfile))
      .then(() => cpFiles(unity))
      .then(() => removeTmp(unity.output))
      .then(() => read(
         unity.output, 
         unity.shapefile, 
         unity.encoding,
            value => {
               value.properties.nomeabrev = getAbrev(value.properties.nome);               
               return Unity.create(value)
                  .catch(ex => ifMayNotIgnore(ex).throw())
            }
      ))
      .then(() => session.commitTransaction())
      .then(() => session.endSession())
      .then(() => console.log(`Finish importing unities at ${new Date()}`))
      .then(() => getUnitiesInsideAmazon(false))
      .then(async (unities) => {
         /** geo file handle by carto */
         await writeGeoJson(unities, unity.id);

         /** file for those who wants to analyse data into a sheet */
         await writeCSV(unities, unity.id, unity.properties);

         /** send data to mapbox API */
         await uploadDataToMapbox(unities, unity.id);
      })
      .catch(async ex => {
         console.log(ex)
         await session.abortTransaction();
         session.endSession();         
      })
}

export const importInvasions = async () => {
   console.log(`\nStarting to import invasions at ${new Date()}`);  

   try {
      const unities = await getUnitiesInsideAmazon();
      const invasions = await createInvasionsByUnities(unities);
         
      console.log(`Finish importing invasions at ${new Date()}`);

      /** geo file handle by carto */
      await writeGeoJson(invasions.all, license.id);

      /** file for those who wants to analyse data into a sheet */
      await writeCSV(invasions.all, license.id, license.properties);

      /** send data to mapbox API */
      await uploadDataToMapbox(invasions.all, license.id);

      return invasions.new;
   }
   catch(ex) {
      console.log(ex);
   }
}