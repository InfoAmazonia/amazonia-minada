import slugify from 'slugify';

const getDateArray = (obj) => {
   var d = new Date();
   
   const arr = [
      obj.year || d.getFullYear(),
      obj.month || d.getMonth(),
      obj.day || d.getDate(),
      obj.hour || d.getHours(),
      obj.minute || d.getMinutes(),
   ];

   return new Date(...arr)
}

const getAbrev = (nome, getPreposition = false) => {
   const preposicoes = ["DOS", "DAS", "DE", "DO", "DA"];
   const tipos = ["ESTAÇÃO ECOLÓGICA", "RESERVA BIOLÓGICA", "PARQUE NACIONAL"];

   const preposicao = tipos.reduce((prevTipo, tipo) => {
      const found = preposicoes.reduce((prevPre, pre) => {
         const str = `${tipo} ${pre} `;
         return nome.indexOf(str) > -1 ? str : prevPre;
      }, "");

      if(found)
         return found;
      else if(nome.indexOf(tipo) > -1)
         return tipo;
      else 
         return prevTipo;
   }, "");
   
   if(!getPreposition)
      return nome.replace(preposicao, '').trim();
   else {
      return preposicoes.reduce((prev, crr) => {
         const index = preposicao.indexOf(" " + crr);
         return index > -1 ? preposicao.substring(0, index) : prev;
      }, preposicao).trim();
   }
}

const clipName = (str, size) => {
   if(size < 0)
      return str;

   /** size minus 3 dots + 1 removed from sentence + 3 treshhold = < 280 */
   size = size + 6;
   
   return str.substring(0, str.length - size).trim() + "...";   
}

const addInternationalization = (items, attrs) => {
   const dictionary = {
      fase: {
         "concessao_de_lavra": "Mining Concession",
         "lavra_garimpeira": "Smal-scale Mining",
         "autorizacao_de_pesquisa": "Mining Research Authorization",
         "requerimento_de_pesquisa": "Mining Research Requirement",
         "requerimento_de_lavra_garimpeira": "Smal-scale Mining Requirement",
         "disponibilidade": "Available Mining Area"
      },
      uc: {
         "parque_nacional": "National Park",
         "reserva_biologica": "Biological Reserve",
         "estacao_ecologica": "Ecological Station"
      },
      sub: {
         "ouro": "Gold",
         "cassiterita": "Cassiterite",
         "cobre": "Copper",
         "diamante": "Diamond",
         "estanho": "Tin",
         "ferro": "Iron",
         "bauxita": "Bauxite",
         "enxofre": "Sulfur",
         "manganes": "Manganese",
         "tantalo": "Tantalum",
         "wolframita": "Wolframite",
         "aluminio": "Aluminum",
         "ilmenita": "Ilmenite",
         "ametista": "Amethyst",
         "areia": "Sand",
         "apatita": "Apatite",
         "fosfato": "Phosphate",
         "magnesio": "Magnesium",
         "prata": "Silver",
         "titanio": "Titanium",
         "turmalina": "Tourmaline"
      }
   }

   const removeWords = ["minério de"];

   return items.map(item => {
      const properties = item.properties;

      const translatedProperties = attrs.reduce((prev, crrAttr) => {         
         const dictionaryKey = Object.keys(crrAttr)[0];
         
         /** attr: { "uc" : { crr: "UC_NOME", new: "EN_UC_NOME"} } */
         const mapper = crrAttr[dictionaryKey];
         
         if(dictionaryKey === "uc"){
            const itemValue = slugify(getAbrev(properties[mapper.crr], true), { replacement: '_', lower: true });
            const translated = dictionary[dictionaryKey][itemValue];

            return Object.assign(prev, {
               [mapper.new]: `${translated} of ${getAbrev(properties[mapper.crr])}`
            });
         }
         else {
            const value = removeWords.reduce((prev, crr) => prev.replace(crr, '').trim(), properties[mapper.crr]);
            const itemValue = slugify(value, { replacement: '_', lower: true });
            const translated = dictionary[dictionaryKey][itemValue];

            return Object.assign(prev, {
               [mapper.new]: translated
            });
         }
      }, {});

      return Object.assign(item, { 
         properties: Object.assign(properties, translatedProperties)
      });
   })
}

export {
   getDateArray,
   getAbrev,
   clipName,
   addInternationalization
}
