export const database = {
   uri: `mongodb://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@${process.env.MONGO_DB_ADDRESS ? 'database' : process.env.MONGO_DB_ADDRESS}/icfj?authSource=admin&ssl=false`,
   options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
   },
   debug: false
}

export const license = {
   id: 'invasoes',
   uri: 'http://sigmine.dnpm.gov.br/sirgas2000/Brasil.zip',
   zipfile: 'Brasil.zip',
   output: `./files/licencas`,
   unziped_folder: '',
   shapefile: `BRASIL.shp`,
   dbf: `BRASIL.dbf`,
   encoding: 'latin1',
   properties: [
      'PROCESSO',
      'ID',
      'NUMERO',
      'ANO',
      'AREA_HA',
      'FASE',
      'ULT_EVENTO',
      'NOME',
      'SUBS',
      'USO',
      'UF',
      'UC_COD',
      'UC_NOME',
      'UC_SIGLA',
      'UC_BIOMA'
   ]
}

export const unity = {
   id: 'unidades_conservacao',
   uri: 'http://www.icmbio.gov.br/portal/images/stories/servicos/geoprocessamento/DCOL/dados_vetoriais/UC_fed_julho_2019.zip',
   zipfile: 'UC_fed_julho_2019.zip',
   output: `./files/unidades_conservacao`,
   unziped_folder: `UC_fed_julho_2019`,
   shapefile: `UC_fed_julho_2019.shp`,
   dbf: `UC_fed_julho_2019.dbf`,
   encoding: 'utf8',
   properties: [
      'codigoCnuc',
      'nome',
      'geometriaA',
      'anoCriacao',
      'sigla',
      'areaHa',
      'perimetroM',
      'atoLegal',
      'administra',
      'SiglaGrupo',
      'UF',
      'municipios',
      'biomaIBGE',
      'biomaCRL',
      'CoordRegio',
      'fusoAbrang',
      'UORG'
   ]
}

export const reserve = {
   id: 'reservas_indigenas',
   uri: 'http://geoserver.funai.gov.br/geoserver/Funai/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Funai:ti_sirgas&CQL_FILTER=dominio_uniao=%27t%27&outputFormat=SHAPE-ZIP',
   zipfile: 'ti_sirgas.zip',
   output: `./files/reservas_indigenas`,
   unziped_folder: ``,
   shapefile: `ti_sirgasPolygon.shp`,
   dbf: `ti_sirgasPolygon.dbf`,
   encoding: 'latin1',
   properties: [
      'gid',
      'terrai_cod',
      'terrai_nom',
      'etnia_nome',
      'municipio_',
      'uf_sigla',
      'superficie',
      'fase_ti',
      'modalidade',
      'reestudo_t',
      'cr',
      'faixa_fron',
      'undadm_cod',
      'undadm_nom',
      'undadm_sig',
      'dominio_un'
   ]
}

export const reserve_invasion = {
   id: 'invasoes_reservas',
   properties: [
      'PROCESSO',
      'ID',
      'NUMERO',
      'ANO',
      'AREA_HA',
      'AREA_K2',
      'FASE',
      'ULT_EVENTO',
      'NOME',
      'SUBS',
      'USO',
      'UF',
      'TI_NOME',
      'TI_ETNIA',
      'TI_MUNICIPIO',
      'TI_UF',
      'TI_SUPERFICIE',
      'TI_FASE',
      'TI_MODALIDADE',
      'ANO_ATUAL'
   ]
}

export const twitter = {
   consumer_key: process.env.CONSUMER_KEY,
   consumer_secret: process.env.CONSUMER_SECRET,
   access_token_key: process.env.ACCESS_TOKEN_KEY,
   access_token_secret: process.env.ACCESS_TOKEN_SECRET
}