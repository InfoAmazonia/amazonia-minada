export const database = {
   uri: `mongodb://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@${!process.env.MONGO_DB_ADDRESS ? 'database' : process.env.MONGO_DB_ADDRESS}/icfj?authSource=admin&ssl=false`,
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
   consumer_key: process.env.CONSUMER_KEY,
   consumer_secret: process.env.CONSUMER_SECRET,
   access_token_key: process.env.ACCESS_TOKEN_KEY,
   access_token_secret: process.env.ACCESS_TOKEN_SECRET
}

export const mapbox = {
   username: 'infoamazonia',
   access_token: process.env.MAPBOX_ACCESS_TOKEN,
   baseUri: 'https://api.mapbox.com/tilesets/v1/',

   recipe: function(identity) {
      return {
         'recipe': {
            'version': 1,
            'layers': {
               'layer1': {
                  'source': `mapbox://tileset-source/${this.username}/${identity}`,
                  'minzoom': 3,
                  'maxzoom': 16
               }
            }
         },
         'name': identity,
      }
   },

   upload_source_uri: function (identity) {
      return `${this.baseUri}sources/${this.username}/${identity}?access_token=${this.access_token}`;
   },
   tileset_uri: function(identity) {
      return `${this.baseUri}${this.username}.${identity}?access_token=${this.access_token}`;
   },
   publish_tileset_uri: function (identity) {
      return `${this.baseUri}${this.username}.${identity}/publish?access_token=${this.access_token}`;
   }
}
