# Importação segura de shapefiles

O importador baixa para um arquivo `.part`, exige HTTP 200 e transferência completa,
valida os CRCs do ZIP e exige os arquivos SHP/DBF esperados. A verificação de TLS
permanece ativa. Antes da publicação, confere cabeçalhos, tamanhos e quantidade de
registros e carrega todos os dados em uma coleção temporária com os índices do modelo.
Somente então `renameCollection` com `dropTarget` substitui atomicamente a coleção
ativa. Esse procedimento funciona também no MongoDB standalone.

Falhas de download, extração, leitura, validação, banco ou publicação são propagadas
até o job, que desconecta do MongoDB e encerra com código 1. O log de conclusão só
aparece em caso de sucesso. As etapas seguintes do job não são executadas após uma
falha do importador. Os erros de geometria conhecidos da ANM (16755 e erros de
geometria com código 2) são contados como `rejectedGeometry`; outros erros abortam.
Uma importação sem registros aceitos também aborta.

A substituição atômica protege cada coleção importada (licenças, UCs ou TIs).
As etapas posteriores de geração de invasões, arquivos derivados e publicação de
mapas não constituem uma transação única com a importação. Se uma delas falhar,
o job sinaliza erro, mas a coleção já importada permanece atualizada.

## Testes

Use Node.js 24, a versão de produção:

```sh
cd licenses
npm ci
npm test
```

Para incluir os testes de integração, forneça `MONGO_TEST_URI` para uma instância de
teste. O teste força um banco novo `minada_import_test_<timestamp>` e o remove ao
terminar; precisa de permissão para criar e remover bancos. Nunca configure esse
acesso com credenciais restritas a um banco de produção. Exemplo local:

```sh
MONGO_TEST_URI=mongodb://127.0.0.1:27017 npm test
```

A bateria cobre HTTP 403, HTML com HTTP 200, transferência interrompida, ZIP truncado,
CRC incorreto, arquivos ausentes, caminhos inseguros, SHP/DBF inválidos, leitura e
gravação interrompidas, coleção vazia, falha na promoção, concorrência, sucesso com
preservação dos índices e código de saída do job.

## Recuperação e reversão

Antes de publicar, preserve a imagem anterior, o Compose, um `mongodump` atualizado
e os arquivos do diretório `files` efetivamente usado pelo contêiner. Inicialize
`runtime/licenses-files` com esses arquivos antes de ativar o novo volume do Compose,
para manter o cache e os arquivos derivados ao recriar o serviço. Teste a
restauração em um banco separado. Publique somente o serviço `licenses`; não execute
o job completo como teste, pois ele também adiciona itens às filas de publicação.

A coleção `import_locks` impede dois processos de compartilhar a mesma área
temporária. Uma queda abrupta pode deixar o documento de lock e a coleção
`<coleção>_importing`. Nesse caso, o próximo job falha sem apagar os dados ativos.
Antes de retentar, confirme que não há outro worker executando, preserve a coleção
temporária para investigação e só então remova o lock e a coleção temporária
correspondentes. Não apague locks automaticamente por idade: uma importação grande
pode ainda estar em andamento.

Para reverter código, retorne à imagem anterior e recrie apenas `licenses`, mantendo
os arquivos persistidos. Restaurar dados a partir do backup só é necessário se a
substituição já tiver sido concluída e os dados novos precisarem ser revertidos;
faça isso com os workers de importação parados. A promoção da coleção não depende
de transações nem de replica set.
