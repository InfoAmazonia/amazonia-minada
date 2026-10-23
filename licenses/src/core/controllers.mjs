import { license, unity, reserve, reserve_invasion } from '../config.mjs';

import { 
   writeGeoJson, 
   writeCSV 
} from '../utils/file-manager.mjs';


import { getAbrev } from '../utils/formatter.mjs';
import { importShapefile } from './import-shapefile.mjs';
import { getLogger } from '../utils/logging.mjs';

import { License, Unity, Reserve, Invasion, ReserveInvasion } from './models.mjs';
import { 
   createInvasionsByUnities,
   getUnitiesInsideAmazon,
   getNewAndAllInvasions,
   getReservesInsideAmazon,
   createInvasionsByReserves,
   getNewAndAllReserveInvasions,
   flagRemovedInvasions,
   filterDuplicatedInvasions
} from './services.mjs';
import { uploadDataToMapbox } from './mapbox-service.mjs';

export const importLicenses = () => importShapefile(license, License);

export const importUnities = async () => {
   await importShapefile(unity, Unity, {
      local: true,
      transform: value => {
         value.properties.nomeabrev = getAbrev(value.properties.nome);
         return value;
      }
   });
   const unities = await getUnitiesInsideAmazon(false);
   await writeGeoJson(unities, unity.id);
   await writeCSV(unities, unity.id, unity.properties);
   await uploadDataToMapbox(unities, unity.id);
}

export const importInvasions = async () => {
   getLogger().info(`\nStarting to import invasions at ${new Date()}`);  

   try {

      getLogger().info(`Getting unities inside amazon at ${new Date()}`);
      const unities = await getUnitiesInsideAmazon();      
      getLogger().info(`Finished getting unities inside amazon at ${new Date()}`);

      getLogger().info(`Creating invasions by unities at ${new Date()}`);
      const generatedInvasions = await createInvasionsByUnities(unities);
      getLogger().info(`Finished creating invasions by unities at ${new Date()}`);

      if (!generatedInvasions || !generatedInvasions.length) {
         getLogger().info(`No invasions generated at ${new Date()} (probably licenses or unities were not imported correctly).`);
         return [];
      }

      getLogger().info(`Flagging removed invasions at ${new Date()}`);
      await flagRemovedInvasions(generatedInvasions, Invasion, 'UC_NOME');
      const invasions = await getNewAndAllInvasions();     
      getLogger().info(`Finish importing invasions at ${new Date()}`);

      /** geo file handle by carto */
      getLogger().info(`Writing geojson for invasions at ${new Date()}`);
      await writeGeoJson(invasions.all, license.id);

      /** file for those who wants to analyse data into a sheet */
      getLogger().info(`Writing CSV for invasions at ${new Date()}`);
      await writeCSV(invasions.all, license.id, license.properties);

      /** send data to mapbox API */
      getLogger().info(`Uploading invasions to Mapbox at ${new Date()}`);
      await uploadDataToMapbox(filterDuplicatedInvasions(invasions.all), license.id);

      return invasions.new;
   }
   catch(ex) {
      getLogger().error(`Failed importing invasions: ${ex} `);
      throw ex;
   }
}

export const importReserves = async () => {
   await importShapefile(reserve, Reserve, {
      local: true,
      transform: value => {
         value.properties.etnia_nome = value.properties.etnia_nome.split(',').join(', ');
         value.properties.municipio_ = value.properties.municipio_.split(',').join(', ');
         return value;
      }
   });
   const reserves = await getReservesInsideAmazon(false);
   await writeGeoJson(reserves, reserve.id);
   await writeCSV(reserves, reserve.id, reserve.properties);
   await uploadDataToMapbox(reserves, reserve.id);
}

export const importReserveInvasions = async () => {
   getLogger().info(`\nStarting to import reserve invasions at ${new Date()}`);  

   try {
      const reserves = await getReservesInsideAmazon();
      const generatedInvasions = await createInvasionsByReserves(reserves);

      if (!generatedInvasions || !generatedInvasions.length) {
         getLogger().info(`No reserve invasions generated at ${new Date()} (probably licenses or reserves were not imported correctly).`);
         return [];
      }

      await flagRemovedInvasions(generatedInvasions, ReserveInvasion, 'TI_NOME');
      const invasions = await getNewAndAllReserveInvasions();

      getLogger().info(`Finish importing reserve invasions at ${new Date()}`);

      /** geo file handle by carto */
      await writeGeoJson(invasions.all, reserve_invasion.id);

      /** file for those who wants to analyse data into a sheet */
      await writeCSV(invasions.all, reserve_invasion.id, reserve_invasion.properties);

      /** send data to mapbox API */
      await uploadDataToMapbox(filterDuplicatedInvasions(invasions.all), reserve_invasion.id);

      return invasions.new;
   }
   catch(ex) {
      getLogger().error(ex);
      throw ex;
   }
}
