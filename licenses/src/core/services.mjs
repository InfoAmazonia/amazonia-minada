import { License, Invasion, Unity } from './models.mjs';

import { addInternationalization } from '../utils/formatter.mjs';
import { ifMayNotIgnore } from '../utils/handler.mjs';

export const getInvasions = (query = {}) => {
   return Invasion.aggregate([{
      $match: query
   }, {
      $project: {
         _id: 0,
         type: "Feature",
         properties: {
            "PROCESSO" : "$properties.PROCESSO",
            "ID" : "$properties.ID",
            "NUMERO" : "$properties.NUMERO",
            "ANO" : "$properties.ANO",
            "AREA_HA" : "$properties.AREA_HA",
            "AREA_K2" : { $multiply: [ "$properties.AREA_HA", 0.01 ] },
            "FASE" : { $toUpper: "$properties.FASE" },
            "ULT_EVENTO" : { $toUpper: "$properties.ULT_EVENTO" },
            "NOME" : { $toUpper: "$properties.NOME" },
            "SUBS" : { $toUpper: "$properties.SUBS" },
            "USO" : { $toUpper: "$properties.USO" },
            "UF" : { $toUpper: "$properties.UF" },
            "UC_COD" : "$properties.UC_COD",
            "UC_NOME" : { $toUpper: "$properties.UC_NOME" },
            "UC_NOMEABREV" : { $toUpper: "$properties.UC_NOMEABREV" },
            "UC_SIGLA" : { $toUpper: "$properties.UC_SIGLA" },
            "UC_BIOMA" : { $toUpper: "$properties.UC_BIOMA" },
            "ANO_ATUAL" : { $year: new Date() }
         },
         geometry: "$geometry"
      }
   }])
   .then(items => addInternationalization(items, [
      { "uc" : { crr: "UC_NOME", new: "EN_UC_NOME"} },
      { "fase" : { crr: "FASE", new: "EN_FASE"} },
      { "sub" : { crr: "SUBS", new: "EN_SUBS"} },
   ]));
}

export const createInvasionsByUnities = async (unities, index = 0) => {
   return getLicensesIntersectionsByUnity(unities[index])
      .then(invasions => Invasion.create(invasions))
      .then(() => {
         if((index + 1) < unities.length)
            return createInvasionsByUnities(unities, ++index);
         return;
      })
      .then(() => Promise.all([
         getInvasions(), // all
         getInvasions({ tweeted: false })  // only not tweetted
      ]))
      .then(invasions => Object.assign({}, { all: invasions[0], new: invasions[1]}))
      .catch(ex => {
         ifMayNotIgnore(ex).throw();
         
         return createInvasionsByUnities(unities, ++index)
      });
}

export const updateTweetStatus = query => {
   return Invasion.update(query, {
      $set: {
         tweeted: true
      }
   },{ 
      multi: true 
   })
}

export const getUnitiesInsideAmazon = (hasId = true) => {
   return Unity
      .aggregate([{
         $match: {
            'properties.sigla': { 
               $in: ['REBIO', 'ESEC', 'PARNA']
            },
            'properties.biomaIBGE': { 
               $eq: 'AMAZÔNIA'
            }
         }
      }, {
         $project: {
            _id: hasId ? "$_id" : 0,
            type: "Feature",
            properties: {
               "codigoCnuc": "$properties.codigoCnuc",
               "nome": { $toUpper: "$properties.nome" },
               "geometriaA": "$properties.geometriaA",
               "anoCriacao": "$properties.anoCriacao",
               "sigla": { $toUpper: "$properties.sigla" },
               "areaHa": "$properties.areaHa",
               "areaK2" : { $multiply: [ "$properties.areaHa", 0.01 ] },
               "perimetroM": "$properties.perimetroM",
               "atoLegal": { $toUpper: "$properties.atoLegal" },
               "administra": { $toUpper: "$properties.administra" },
               "SiglaGrupo": { $toUpper: "$properties.SiglaGrupo" },
               "UF": { $toUpper: "$properties.UF" },
               "municipios": { $toUpper: "$properties.municipios" },
               "biomaIBGE": { $toUpper: "$properties.biomaIBGE" },
               "biomaCRL": { $toUpper: "$properties.biomaCRL" },
               "CoordRegio": { $toUpper: "$properties.CoordRegio" },
               "fusoAbrang": { $toUpper: "$properties.fusoAbrang" },
               "UORG": { $toUpper: "$properties.UORG" },
               "nomeabrev": { $toUpper: "$properties.nomeabrev" }
            },
            geometry: "$geometry"
         }
      }])
      .then(unities => addInternationalization(unities, [{ "uc" : { crr: "nome", new: "en_nome"}}])) 
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
               'properties.ULT_EVENTO': {
                  $not: /indeferimento.*/gi
               },
               $or: [{
                  'properties.FASE': 'CONCESSÃO DE LAVRA'
               }, {
                  'properties.ANO': {
                     $gte: unity.properties.anoCriacao
                  }
               }],
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
                  "PROCESSO" : "$properties.PROCESSO",
                  "ID" : "$properties.ID",
                  "NUMERO" : "$properties.NUMERO",
                  "ANO" : "$properties.ANO",
                  "AREA_HA" : "$properties.AREA_HA",
                  "FASE" : "$properties.FASE",
                  "ULT_EVENTO" : "$properties.ULT_EVENTO",
                  "NOME" : "$properties.NOME",
                  "SUBS" : "$properties.SUBS",
                  "USO" : "$properties.USO",
                  "UF" : "$properties.UF",
                  "UC_COD" : unity.properties.codigoCnuc,
                  "UC_NOME" : unity.properties.nome,
                  "UC_NOMEABREV" : unity.properties.nomeabrev,
                  "UC_SIGLA" : unity.properties.sigla,
                  "UC_BIOMA" : unity.properties.biomaIBGE
               },
               geometry: "$geometry"
            }
         }
      ])
}