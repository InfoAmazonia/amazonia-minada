import { license, unity, reserve, reserve_invasion } from '../config.mjs';

import { 
   read,
   download,
   loadLocal,
   unzip, 
   cpFiles, 
   removeTmp, 
   makeTmp, 
   writeGeoJson, 
   writeCSV 
} from '../utils/file-manager.mjs';


import { getAbrev } from '../utils/formatter.mjs';
import { ifMayNotIgnore } from '../utils/handler.mjs';

import { License, Unity, Reserve, Invasion, ReserveInvasion } from './models.mjs';
import { 
   createInvasionsByUnities,
   getUnitiesInsideAmazon,
   getNewAndAllInvasions,
   getReservesInsideAmazon,
   createInvasionsByReserves,
   getNewAndAllReserveInvasions,
   flagRemovedInvasions
} from './services.mjs';
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
      .then(() => loadLocal(unity.uri, unity.output, unity.zipfile))
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
      const generatedInvasions = await createInvasionsByUnities(unities);

      if (!generatedInvasions || !generatedInvasions.length) {
         console.log(`No invasions generated at ${new Date()} (probably licenses or unities were not imported correctly).`);
         return [];
      }

      await flagRemovedInvasions(generatedInvasions, Invasion, 'UC_NOME');
      const invasions = await getNewAndAllInvasions();

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

export const importReserves = async () => {
   console.log(`\nStarting to import reserves at ${new Date()}`);   

   const session = await Reserve.startSession();

   session.startTransaction();

   return Reserve.deleteMany({})
      .then(() => removeTmp(reserve.output))   
      .then(() => makeTmp(reserve.output))
      .then(() => loadLocal(reserve.uri, reserve.output, reserve.zipfile))
      .then(() => unzip(reserve.output, reserve.zipfile))
      .then(() => cpFiles(reserve))
      .then(() => removeTmp(reserve.output))
      .then(() => read(
         reserve.output, 
         reserve.shapefile, 
         reserve.encoding,
            value => {
               value.properties.etnia_nome =  value.properties.etnia_nome.split(',').join(', ');
               value.properties.municipio_ =  value.properties.municipio_.split(',').join(', ');
               return Reserve.create(value)
                  .catch(ex => ifMayNotIgnore(ex).throw())
            }
      ))
      .then(() => session.commitTransaction())
      .then(() => session.endSession())
      .then(() => console.log(`Finish importing reserves at ${new Date()}`))
      .then(() => getReservesInsideAmazon(false))
      .then(async (reserves) => {
         /** geo file handle by carto */
         await writeGeoJson(reserves, reserve.id);

         /** file for those who wants to analyse data into a sheet */
         await writeCSV(reserves, reserve.id, reserve.properties);
         
         /** send data to mapbox API */
         await uploadDataToMapbox(reserves, reserve.id);
      })
      .catch(async ex => {
         console.log(ex)
         await session.abortTransaction();
         session.endSession();         
      })
}

export const importReserveInvasions = async () => {
   console.log(`\nStarting to import reserve invasions at ${new Date()}`);  

   try {
      const reserves = await getReservesInsideAmazon();
      const generatedInvasions = await createInvasionsByReserves(reserves);

      if (!generatedInvasions || !generatedInvasions.length) {
         console.log(`No reserve invasions generated at ${new Date()} (probably licenses or reserves were not imported correctly).`);
         return [];
      }

      await flagRemovedInvasions(generatedInvasions, ReserveInvasion, 'TI_NOME');
      const invasions = await getNewAndAllReserveInvasions();

      console.log(`Finish importing reserve invasions at ${new Date()}`);

      /** geo file handle by carto */
      await writeGeoJson(invasions.all, reserve_invasion.id);

      /** file for those who wants to analyse data into a sheet */
      await writeCSV(invasions.all, reserve_invasion.id, reserve_invasion.properties);

      /** send data to mapbox API */
      await uploadDataToMapbox(invasions.all, reserve_invasion.id);

      return invasions.new;
   }
   catch(ex) {
      console.log(ex);
   }
}
