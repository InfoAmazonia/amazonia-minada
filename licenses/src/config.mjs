export const database = {
   uri: `mongodb://database/icfj`,
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

export const twitter = {
   consumer_key: 'xxxxxxxx',
   consumer_secret: 'xxxxxxxx',
   access_token_key: 'xxxxxxxx',
   access_token_secret: 'xxxxxxxx'
}