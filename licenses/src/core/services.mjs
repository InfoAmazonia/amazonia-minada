import { License, Invasion, Unity, Reserve, ReserveInvasion } from './models.mjs';

import { addInternationalization, getThousandsMark } from '../utils/formatter.mjs';
import { ifMayNotIgnore } from '../utils/handler.mjs';

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

export const createInvasionsByUnities = async (unities, index = 0) => {
   return getLicensesIntersectionsByUnity(unities[index])
      .then(invasions => Invasion.create(invasions))
      .then(() => {
         if ((index + 1) < unities.length)
            return createInvasionsByUnities(unities, ++index);
         return;
      })
      .then(() => Promise.all([
         getInvasions(), // all
         getInvasions({ tweeted: false })  // only not tweetted
      ]))
      .then(invasions => Object.assign({}, { all: invasions[0], new: invasions[1] }))
      .catch(ex => {
         ifMayNotIgnore(ex).throw();

         return createInvasionsByUnities(unities, ++index)
      });
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
   const existingInvasions = await Invasion.find({});

   return License
      .aggregate([
         {
            $match: {
               'properties.ID': {
                  $nin: existingInvasions.map(i => i.properties.ID)
               },
               geometry: {
                  $geoIntersects: {
                     $geometry: unity.geometry
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
                  "UC_COD": unity.properties.codigoCnuc,
                  "UC_NOME": unity.properties.nome,
                  "UC_NOMEABREV": unity.properties.nomeabrev,
                  "UC_SIGLA": unity.properties.sigla,
                  "UC_BIOMA": unity.properties.biomaIBGE
               },
               geometry: "$geometry"
            }
         }
      ])
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

export const createInvasionsByReserves = async (reserves, index = 0) => {
   return getLicensesIntersectionsByReserve(reserves[index])
      .then(invasions => ReserveInvasion.create(invasions))
      .then(() => {
         if ((index + 1) < reserves.length)
            return createInvasionsByReserves(reserves, ++index);
         return;
      })
      .then(() => Promise.all([
         getReserveInvasions(), // all
         getReserveInvasions({ tweeted: false })  // only not tweetted
      ]))
      .then(invasions => Object.assign({}, { all: invasions[0], new: invasions[1] }))
      .catch(ex => {
         ifMayNotIgnore(ex).throw();

         return createInvasionsByReserves(reserves, ++index)
      });
}

export const getLicensesIntersectionsByReserve = async (reserve) => {
   const existingReserveInvasions = await ReserveInvasion.find({});

   return License
      .aggregate([
         {
            $match: {
               'properties.ID': {
                  $nin: existingReserveInvasions.map(i => i.properties.ID)
               },
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