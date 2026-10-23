# Credencial exclusiva do importador

O serviço `licenses` usa `./.secrets/licenses.env` em vez do `.env` administrativo.
Crie o diretório com modo 0700 e o arquivo com modo 0600, fora de qualquer montagem
acessível à aplicação. Ele contém:

- `MONGO_URI` da conta `minada_importer`, host interno `database:27017`, banco e
  `authSource` iguais a `icfj`;
- `API_SECURE_KEY`, `MAPBOX_ACCESS_TOKEN` e as quatro variáveis `TWITTER_*` usadas
  pela configuração atual;
- `NODE_ENV` e `TZ`, quando necessários.

Não mantenha usuário/senha root em variáveis alternativas ou arquivos da imagem.
A sobreposição `docker-compose.application-user.yml` substitui todo o ambiente
antigo em Compose >= 2.24.4; o arquivo base também deve apontar ao arquivo exclusivo.
As imagens não devem incluir arquivos `.env*`.

A política e o provisionamento versionados estão em
`InfoAmazonia/amazonia-minada-back`, arquivos `ops/mongodb-application-roles.json`
e `ops/provision-mongodb-users.js`. O papel do importador limita leituras/gravações
às coleções necessárias e permite a promoção atômica dentro do `icfj`, sem
administração de usuários, exclusão do banco ou acesso a outros bancos.
Requer o importador com staging/promoção atômica da PR #18 deste repositório.

`autoCreate` e `autoIndex` ficam desativados na conexão. A criação dos índices
nos shapefiles temporários continua explícita no importador; os índices permanentes
existentes devem ser preservados ou provisionados pelo administrador.

Teste primeiro em banco isolado: importação nas três coleções, criação de índices,
promoção com substituição, interseções, atualização de invasões e as quatro filas.
Confirme que criação de usuários, concessão de root e dropDatabase são negados.
Não execute publicação de mapas ou mensagens como teste. Faça backup dos Compose,
imagens e ambientes; migre um serviço por vez e valide APIs, CSV e identidade MongoDB.
Evite recriar o scheduler enquanto houver workers ativos ou perto de seus horários.

A reversão usa imagem e ambiente anteriores, sem restaurar dados. Os arquivos
antigos com credenciais administrativas devem permanecer apenas no backup privado
operacional, fora das aplicações; revertê-los reintroduz temporariamente esse acesso.
