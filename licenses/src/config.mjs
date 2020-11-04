export const database = {
   uri: `mongodb://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@${!process.env.MONGO_DB_ADDRESS ? 'database' : process.env.MONGO_DB_ADDRESS}/icfj?authSource=admin&ssl=false`,
   options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
   },
   debug: false
}

export const license = {
   id: 'requerimentos',
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
   uri: 'files_source/UCs_AmzLegal.zip',
   zipfile: 'UCs_AmzLegal.zip',
   output: `./files/unidades_conservacao`,
   unziped_folder: `UCs_AmzLegal`,
   shapefile: `UC_fed_julho_2019_AmzLegal.shp`,
   dbf: `UC_fed_julho_2019_AmzLegal.dbf`,
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
   id: 'terras_indigenas',
   uri: 'http://terrabrasilis.dpi.inpe.br/download/dataset/legal-amz-aux/vector/indigeneous_area_legal_amazon.zip',
   zipfile: 'indigeneous_area_legal_amazon.zip',
   output: `./files/terras_indigenas`,
   unziped_folder: ``,
   shapefile: `indigeneous_area_legal_amazon.shp`,
   dbf: `indigeneous_area_legal_amazon.dbf`,
   encoding: 'utf8',
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
   id: 'requerimentos_ti',
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

export const mapbox = {
   username: 'infoamazonia',
   access_token: process.env.MAPBOX_ACCESS_TOKEN,
   baseUri: 'https://api.mapbox.com/tilesets/v1/',

   recipe: function(identity) {
      return {
         'recipe': {
            'version': 1,
            'layers': {
               [identity]: {
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
