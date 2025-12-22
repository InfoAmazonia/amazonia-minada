import { License, Invasion, Unity, Reserve, ReserveInvasion } from './models.mjs';

import { addInternationalization, getThousandsMark } from '../utils/formatter.mjs';
import { ifMayNotIgnore } from '../utils/handler.mjs';
import { getLogger } from '../utils/logging.mjs';

// UNITIES

export const getInvasions = (query = {}) => {
   return Invasion.aggregate([{
      $match: query
   }, {
      $project: {
         _id: query && (query.tweeted || query.tweeted === false) ? 1 : 0,
         type: "Feature",
         properties: {
            "PROCESSO": "$properties.PROCESSO",
            "ID": "$properties.ID",
            "NUMERO": "$properties.NUMERO",
            "ANO": "$properties.ANO",
            "AREA_HA": "$properties.AREA_HA",
            "AREA_K2": { $multiply: ["$properties.AREA_HA", 0.01] },
            "FASE": "$properties.FASE",
            "ULT_EVENTO": "$properties.ULT_EVENTO",
            "NOME": "$properties.NOME",
            "SUBS": "$properties.SUBS",
            "USO": "$properties.USO",
            "UF": "$properties.UF",
            "UC_COD": "$properties.UC_COD",
            "UC_NOME": "$properties.UC_NOME",
            "UC_NOMEABREV": "$properties.UC_NOMEABREV",
            "UC_SIGLA": "$properties.UC_SIGLA",
            "UC_BIOMA": "$properties.UC_BIOMA",
            "ANO_ATUAL": { $year: new Date() }
         },
         geometry: "$geometry"
      }
   }])
      .then(items => items.map(item => {
         const newItem = addInternationalization(item, [
            { "uc": { crr: "UC_NOME", new: "EN_UC_NOME" } },
            { "fase": { crr: "FASE", new: "EN_FASE" } },
            { "sub": { crr: "SUBS", new: "EN_SUBS" } },
         ]);

         return Object.assign(newItem, {
            properties: Object.assign(newItem.properties, {
               "AREA_HA": getThousandsMark(parseFloat(newItem.properties.AREA_HA).toFixed(2)),
               "AREA_K2": getThousandsMark(parseFloat(newItem.properties.AREA_K2).toFixed(2))
            })
         });
      }));
}

export const createInvasionsByUnities = async unities => {
   const generatedInvasions = [];

   for await (const unity of unities) {
      try {
         getLogger().info(`Processing unity: ${unity.properties.nome}`);
         const invasions = await getLicensesIntersectionsByUnity(unity);

         getLogger().info(`Found ${invasions.length} invasions in unity: ${unity.properties.nome}`);         
         
         await upsertInvasions(invasions, Invasion, 'UC_NOME');
         getLogger().info(`Upserted invasions for unity: ${unity.properties.nome}`);

         generatedInvasions.push(...invasions);
      } catch (ex) {
         ifMayNotIgnore(ex).throw();
      }
   }

   return generatedInvasions;
}

export const updateTweetStatus = query => {
   return Invasion.updateMany(query, {
      $set: {
         tweeted: true
      }
   })
}

export const getUnitiesInsideAmazon = (hasId = true) => {
   return Unity
      .aggregate([
         {
            $project: {
               _id: hasId ? "$_id" : 0,
               type: "Feature",
               properties: {
                  "codigoCnuc": "$properties.codigoCnuc",
                  "nome": "$properties.nome",
                  "geometriaA": "$properties.geometriaA",
                  "anoCriacao": "$properties.anoCriacao",
                  "sigla": "$properties.sigla",
                  "areaHa": "$properties.areaHa",
                  "areaK2": { $multiply: ["$properties.areaHa", 0.01] },
                  "perimetroM": "$properties.perimetroM",
                  "atoLegal": "$properties.atoLegal",
                  "administra": "$properties.administra",
                  "SiglaGrupo": "$properties.SiglaGrupo",
                  "UF": "$properties.UF",
                  "municipios": "$properties.municipios",
                  "biomaIBGE": "$properties.biomaIBGE",
                  "biomaCRL": "$properties.biomaCRL",
                  "CoordRegio": "$properties.CoordRegio",
                  "fusoAbrang": "$properties.fusoAbrang",
                  "UORG": "$properties.UORG",
                  "nomeabrev": "$properties.nomeabrev"
               },
               geometry: "$geometry"
            }
         }
      ])
      .then(unities => unities.map(item => {
         const newItem = addInternationalization(item, [{
            "uc": { crr: "nome", new: "en_nome" }
         }]);

         return Object.assign(newItem, {
            properties: Object.assign(newItem.properties, {
               "areaHa": getThousandsMark(Math.round(newItem.properties.areaHa)),
               "areaK2": getThousandsMark(Math.round(newItem.properties.areaK2))
            })
         })
      }));
}

export const getLicensesIntersectionsByUnity = async (unity) => {
   return License
      .aggregate([
         {
            $match: {
               geometry: {
                  $geoIntersects: {
                     $geometry: unity.geometry
                  }
               }
            }
         },
         {
            $project: {
               _id: 1,
               type: 1,
               "properties.PROCESSO": 1,
               "properties.ID": 1,
               "properties.NUMERO": 1,
               "properties.ANO": 1,
               "properties.AREA_HA": 1,
               "properties.FASE": 1,
               "properties.ULT_EVENTO": 1,
               "properties.NOME": 1,
               "properties.SUBS": 1,
               "properties.USO": 1,
               "properties.UF": 1,
               geometry: 1
            }
         },
         {
            $addFields: {
               "properties.UC_COD": unity.properties.codigoCnuc,
               "properties.UC_NOME": unity.properties.nome,
               "properties.UC_NOMEABREV": unity.properties.nomeabrev,
               "properties.UC_SIGLA": unity.properties.sigla,
               "properties.UC_BIOMA": unity.properties.biomaIBGE
            }
         }
      ]);
}

export const getNewAndAllInvasions = async () => {
   return {
      all: await getInvasions({ last_action: { $ne: 'delete' } }),
      new: await getInvasions({ tweeted: false, last_action: { $ne: 'delete' } })
   };
}

// RESERVES

export const getReservesInsideAmazon = (hasId = true) => {
   return Reserve
      .aggregate([
         {
            $project: {
               _id: hasId ? "$_id" : 0,
               type: "Feature",
               properties: {
                  "gid": "$properties.gid",
                  "terrai_cod": "$properties.terrai_cod",
                  "terrai_nom": "$properties.terrai_nom",
                  "etnia_nome": "$properties.etnia_nome",
                  "municipio_": "$properties.municipio_",
                  "uf_sigla": "$properties.uf_sigla",
                  "superficie": "$properties.superficie",
                  "superficieK2": { $multiply: ["$properties.superficie", 0.01] },
                  "fase_ti": "$properties.fase_ti",
                  "modalidade": "$properties.modalidade",
                  "reestudo_t": "$properties.reestudo_t",
                  "cr": "$properties.cr",
                  "faixa_fron": "$properties.faixa_fron",
                  "undadm_cod": "$properties.undadm_cod",
                  "undadm_nom": "$properties.undadm_nom",
                  "undadm_sig": "$properties.undadm_sig",
                  "dominio_un": "$properties.dominio_un"
               },
               geometry: "$geometry"
            }
         }
      ])
      .then(reserves => reserves.map(item => {
         return Object.assign(item, {
            properties: Object.assign(item.properties, {
               "superficie": getThousandsMark(Math.round(item.properties.superficie)),
               "superficieK2": getThousandsMark(Math.round(item.properties.areaK2))
            })
         })
      }));
}

export const createInvasionsByReserves = async reserves => {
   const generatedInvasions = [];

   for await (const reserve of reserves) {
      try {
         const invasions = await getLicensesIntersectionsByReserve(reserve);
         await upsertInvasions(invasions, ReserveInvasion, 'TI_NOME');
         generatedInvasions.push(...invasions);
      } catch (ex) {
         ifMayNotIgnore(ex).throw();
      }
   }

   return generatedInvasions;
}

export const getLicensesIntersectionsByReserve = async (reserve) => {
   return License
      .aggregate([
         {
            $match: {
               geometry: {
                  $geoIntersects: {
                     $geometry: reserve.geometry
                  }
               }
            }
         },
         {
            $project: {
               _id: "$_id",
               type: "Feature",
               properties: {
                  "PROCESSO": "$properties.PROCESSO",
                  "ID": "$properties.ID",
                  "NUMERO": "$properties.NUMERO",
                  "ANO": "$properties.ANO",
                  "AREA_HA": "$properties.AREA_HA",
                  "FASE": "$properties.FASE",
                  "ULT_EVENTO": "$properties.ULT_EVENTO",
                  "NOME": "$properties.NOME",
                  "SUBS": "$properties.SUBS",
                  "USO": "$properties.USO",
                  "UF": "$properties.UF",
                  "TI_NOME": reserve.properties.terrai_nom,
                  "TI_ETNIA": reserve.properties.etnia_nome,
                  "TI_MUNICIPIO": reserve.properties.municipio_,
                  "TI_UF": reserve.properties.uf_sigla,
                  "TI_SUPERFICIE": reserve.properties.superficie || 1,
                  "TI_FASE": reserve.properties.fase_ti,
                  "TI_MODALIDADE": reserve.properties.modalidade
               },
               geometry: "$geometry"
            }
         }
      ]);
}

export const getReserveInvasions = (query = {}) => {
   return ReserveInvasion.aggregate([
      {
         $match: query
      },
      {
         $project: {
            _id: query && (query.tweeted || query.tweeted === false) ? 1 : 0,
            type: "Feature",
            properties: {
               "PROCESSO": "$properties.PROCESSO",
               "ID": "$properties.ID",
               "NUMERO": "$properties.NUMERO",
               "ANO": "$properties.ANO",
               "AREA_HA": "$properties.AREA_HA",
               "AREA_K2": { $multiply: ["$properties.AREA_HA", 0.01] },
               "FASE": "$properties.FASE",
               "ULT_EVENTO": "$properties.ULT_EVENTO",
               "NOME": "$properties.NOME",
               "SUBS": "$properties.SUBS",
               "USO": "$properties.USO",
               "UF": "$properties.UF",
               "TI_NOME": "$properties.TI_NOME",
               "TI_ETNIA": "$properties.TI_ETNIA",
               "TI_MUNICIPIO": "$properties.TI_MUNICIPIO",
               "TI_UF": "$properties.TI_UF",
               "TI_SUPERFICIE": "$properties.TI_SUPERFICIE",
               "TI_FASE": "$properties.TI_FASE",
               "TI_MODALIDADE": "$properties.TI_MODALIDADE",
               "ANO_ATUAL": { $year: new Date() }
            },
            geometry: "$geometry"
         }
      }
   ]).then(items => items.map(item => {
      const newItem = addInternationalization(item, [
         { "fase": { crr: "FASE", new: "EN_FASE" } },
         { "sub": { crr: "SUBS", new: "EN_SUBS" } },
      ]);

      return Object.assign(newItem, {
         properties: Object.assign(newItem.properties, {
            "AREA_HA": getThousandsMark(parseFloat(newItem.properties.AREA_HA).toFixed(2)),
            "AREA_K2": getThousandsMark(parseFloat(newItem.properties.AREA_K2).toFixed(2))
         })
      });
   }));
}

export const updateReserveInvasionTweetStatus = query => {
   return ReserveInvasion.updateMany(query, {
      $set: {
         tweeted: true
      }
   })
}

export const getNewAndAllReserveInvasions = async () => {
   return {
      all: await getReserveInvasions({ last_action: { $ne: 'delete' } }),
      new: await getReserveInvasions({ tweeted: false, last_action: { $ne: 'delete' } })
   };
}

// BOTH

const upsertInvasions = async (invasions, schema, identifier) => {
   for await (const invasion of invasions) {
      const query = {
         "properties.ID": invasion.properties.ID,
         [`properties.${identifier}`]: invasion.properties[identifier]
      };
      const invasionInDb = await schema.findOne(query);
      if (invasionInDb) {
         let changes = '';
         for (const property in invasion.properties) {
            if (invasion.properties[property] !== invasionInDb.properties[property]) {
               changes += `${property}: ${invasionInDb.properties[property]} -> ${invasion.properties[property]} | `;
            }
         }
         if (changes) {
            changes = changes.slice(0, -3);
            const timestamp = new Date();
            invasion.last_update_at = timestamp;
            invasion.last_action = 'update';
            invasion.changes = [...invasionInDb.changes, { timestamp, changes }];
            delete invasion._id;
            await schema.findOneAndUpdate(query, { $set: invasion }).exec();
         }
      } else {
         invasion.last_action = 'create';
         delete invasion._id;
         await schema.create(invasion);
      }
   }
};

export const flagRemovedInvasions = async (generatedInvasions, schema, identifier) => {
   const existingInvasions = await schema.find({});
   const timestamp = new Date();

   for await (const existingInvasion of existingInvasions) {
      const foundGeneratedInvasion = generatedInvasions.find(
         invasion => invasion.properties.ID === existingInvasion.properties.ID
         && invasion.properties[identifier] === existingInvasion.properties[identifier]
      )
      if (!foundGeneratedInvasion && existingInvasion.last_action !== 'delete') {
         existingInvasion.last_action = 'delete';
         existingInvasion.last_update_at = timestamp;
         existingInvasion.changes = [...existingInvasion.changes, { timestamp, changes: 'deleted' }];
         delete existingInvasion._id;
         await schema.findOneAndUpdate({
            "properties.ID": existingInvasion.properties.ID,
            [`properties.${identifier}`]: existingInvasion.properties[identifier]
         }, { $set: existingInvasion }).exec();
      }
   }

   const nonDeletedExistingInvasions = existingInvasions.filter(existingInvasion => existingInvasion.last_action !== 'delete');
   for await (const generatedInvasion of generatedInvasions) {
      const foundExistingInvasion = nonDeletedExistingInvasions.find(
         invasion => invasion.properties.ID === generatedInvasion.properties.ID
         && invasion.properties[identifier] === generatedInvasion.properties[identifier]
      )
      if (!foundExistingInvasion) {
         const existingInvasion = existingInvasions.find(
             invasion => invasion.properties.ID === generatedInvasion.properties.ID
                 && invasion.properties[identifier] === generatedInvasion.properties[identifier]
         );
         existingInvasion.last_action = 'update';
         existingInvasion.last_update_at = timestamp;
         existingInvasion.changes = [...existingInvasion.changes, { timestamp, changes: 'restored' }];
         delete existingInvasion._id;
         await schema.findOneAndUpdate({
            "properties.ID": existingInvasion.properties.ID,
            [`properties.${identifier}`]: existingInvasion.properties[identifier]
         }, { $set: existingInvasion }).exec();
      }
   }
};

export const filterDuplicatedInvasions = invasions => {
   const uniqueInvasions = [];
   const seenInvasionIds = new Set();

   for (const invasion of invasions) {
      const invasionID = invasion.properties.ID;

      if (!seenInvasionIds.has(invasionID)) {
         uniqueInvasions.push(invasion);
         seenInvasionIds.add(invasionID);
      }
   }

   return uniqueInvasions;
};
