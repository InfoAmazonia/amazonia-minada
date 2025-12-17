# Escopo Detalhado do Job UpdateInvasions

## Visão Geral
O job `UpdateInvasions.mjs` é responsável por atualizar as invasões de licenças minerárias em unidades de conservação da Amazônia, processando dados geoespaciais e enfileirando invasões para notificação via Twitter.

---

## Fluxo de Execução Principal

### 1. Inicialização do Job
**Método:** `jobEntrypoint()`
- Inicializa o sistema de logging
- Estabelece conexão com o banco de dados MongoDB usando mongoose
- Executa o callback principal do job
- Trata erros gerais e registra no logger

### 2. Verificação de Unidades de Conservação
**Lógica:**
- Conta o número de documentos na coleção Unity
- Se não houver unidades cadastradas, executa a importação

**Método chamado:** `importUnities()`
- Inicia uma sessão de transação no MongoDB
- Deleta todas as unidades existentes
- Remove diretório temporário
- Cria novo diretório temporário
- Carrega arquivo local de unidades de conservação (shapefile zipado)
- Descompacta o arquivo ZIP
- Copia arquivos shapefile (.shp) e database (.dbf) para o diretório de saída
- Remove diretório temporário
- Lê o shapefile com encoding específico
- Para cada registro lido:
  - Gera abreviação do nome da unidade usando `getAbrev()`
  - Cria documento no banco de dados (Unity)
  - Ignora erros duplicados
- Realiza commit da transação
- Encerra a sessão
- Obtém unidades dentro da Amazônia usando `getUnitiesInsideAmazon()`
- Gera arquivo GeoJSON com os dados
- Gera arquivo CSV com propriedades específicas
- Envia dados para API do Mapbox
- Em caso de erro, aborta a transação

**Método auxiliar:** `getUnitiesInsideAmazon(hasId = true)`
- Executa agregação no MongoDB
- Projeta campos específicos das unidades:
  - codigoCnuc, nome, geometriaA, anoCriacao, sigla
  - areaHa e calcula areaK2 (área em km²)
  - perimetroM, atoLegal, administra
  - SiglaGrupo, UF, municipios
  - biomaIBGE, biomaCRL, CoordRegio, fusoAbrang, UORG, nomeabrev
- Adiciona internacionalização (nomes em inglês)
- Formata áreas com separadores de milhares

### 3. Importação de Licenças
**Método:** `importLicenses()`
- Inicia sessão de transação MongoDB
- Deleta todas as licenças existentes
- Remove diretório temporário
- Cria novo diretório temporário
- Faz download do arquivo de licenças da ANM (Agência Nacional de Mineração)
- Descompacta o arquivo
- Copia arquivos shapefile e database
- Remove diretório temporário
- Lê o shapefile com encoding específico
- Cria registros de License no banco de dados
- Ignora erros duplicados
- Realiza commit da transação
- Encerra sessão
- Em caso de erro, aborta a transação

### 4. Importação de Invasões
**Método:** `importInvasions()`
- Obtém todas as unidades de conservação dentro da Amazônia
- Cria invasões por unidade usando `createInvasionsByUnities()`

**Método:** `createInvasionsByUnities(unities)`
- Para cada unidade de conservação:
  - Obtém licenças que intersectam geometricamente com a unidade usando `getLicensesIntersectionsByUnity()`
  - Realiza upsert das invasões usando `upsertInvasions()`
  - Adiciona invasões geradas à lista de retorno

**Método:** `getLicensesIntersectionsByUnity(unity)`
- Executa agregação MongoDB com operador geoespacial `$geoIntersects`
- Busca licenças cuja geometria intersecta com a geometria da unidade
- Projeta campos da licença (PROCESSO, ID, NUMERO, ANO, AREA_HA, FASE, ULT_EVENTO, NOME, SUBS, USO, UF)
- Adiciona campos da unidade (UC_COD, UC_NOME, UC_NOMEABREV, UC_SIGLA, UC_BIOMA)
- Retorna lista de invasões encontradas

**Método:** `upsertInvasions(invasions, schema, identifier)`
- Para cada invasão:
  - Busca invasão existente no banco por ID e identificador (UC_NOME)
  - Se existe:
    - Compara todas as propriedades
    - Registra mudanças detectadas
    - Se houver mudanças:
      - Atualiza timestamp
      - Define last_action como 'update'
      - Adiciona registro de mudanças ao histórico
      - Remove _id
      - Atualiza documento no banco
  - Se não existe:
    - Define last_action como 'create'
    - Remove _id
    - Cria novo documento

**Verificação de invasões removidas:**
**Método:** `flagRemovedInvasions(generatedInvasions, Invasion, 'UC_NOME')`
- Busca todas as invasões existentes no banco
- Para cada invasão existente:
  - Verifica se ainda existe nas invasões geradas
  - Se não existe e não está marcada como deletada:
    - Define last_action como 'delete'
    - Atualiza timestamp
    - Adiciona 'deleted' ao histórico de mudanças
    - Atualiza documento no banco
- Para invasões geradas não encontradas nas existentes (restauração):
  - Busca invasão marcada como deletada
  - Define last_action como 'update'
  - Atualiza timestamp
  - Adiciona 'restored' ao histórico
  - Atualiza documento no banco

**Obtenção de invasões novas e todas:**
**Método:** `getNewAndAllInvasions()`
- Retorna objeto com duas listas:
  - all: todas as invasões não deletadas (last_action != 'delete')
  - new: invasões não tweetadas e não deletadas

**Método:** `getInvasions(query)`
- Executa agregação MongoDB com query fornecida
- Projeta campos formatados das invasões
- Calcula AREA_K2 (área em km²)
- Adiciona ANO_ATUAL (ano corrente)
- Adiciona internacionalização (nomes em inglês) para:
  - UC_NOME → EN_UC_NOME
  - FASE → EN_FASE
  - SUBS → EN_SUBS
- Formata áreas com separadores de milhares e 2 casas decimais

**Exportação de dados:**
- Gera arquivo GeoJSON com todas as invasões
- Gera arquivo CSV com todas as invasões
- Filtra invasões duplicadas usando `filterDuplicatedInvasions()`
- Envia dados para API do Mapbox

**Método:** `filterDuplicatedInvasions(invasions)`
- Cria conjunto (Set) para rastrear IDs únicos
- Itera sobre invasões
- Adiciona apenas primeira ocorrência de cada ID
- Retorna lista sem duplicatas

### 5. Filtragem de Invasões de Anos Anteriores
**Lógica:**
- Filtra invasões cujo ANO não corresponde ao ano atual
- Extrai IDs dessas invasões e converte para ObjectId do MongoDB
- Atualiza status de tweet usando `updateTweetStatus()`

**Método:** `updateTweetStatus(query)`
- Executa updateMany no modelo Invasion
- Define campo tweeted como true para invasões que atendem a query
- Marca invasões como já processadas para notificação

### 6. Enfileiramento de Invasões para Notificação
**Lógica:**
- Itera sobre todas as invasões retornadas
- Para cada invasão:
  - Gera chave única: `invasion:${invasion._id}`
  - Serializa invasão como JSON
  - Adiciona item na fila 'InvasionPT' usando `addItem()`
  - Adiciona item na fila 'InvasionEN' usando `addItem()`

**Método:** `addItem(sub, key, item)`
- Obtém modelo de fila específico (InvasionPT ou InvasionEN)
- Cria documento na coleção de fila com:
  - key: identificador único
  - data: dados da invasão em JSON
  - status: 'pending' (padrão)
  - createdAt: timestamp de criação

---

## Modelos de Dados Utilizados

### Unity (Unidade de Conservação)
**Campos:**
- type: String
- properties: Object (dados da unidade)
- geometry: Object (geometria geoespacial)

### License (Licença Minerária)
**Campos:**
- type: String
- properties: Object (dados da licença)
- geometry: Object (geometria geoespacial)

### Invasion (Invasão)
**Campos:**
- type: String
- properties: Object (dados combinados de licença e unidade)
- geometry: Object (geometria geoespacial)
- tweeted: Boolean (padrão: false)
- created_at: Date
- last_action: String ('create', 'update', 'delete')
- last_update_at: Date
- changes: Array de objetos {timestamp, changes}

### QueueItem (Item de Fila)
**Campos:**
- key: String (obrigatório)
- data: Mixed (dados da invasão)
- status: Enum ['pending', 'processing', 'done', 'failed'] (padrão: 'pending')
- lockedAt: Date
- createdAt: Date
- updatedAt: Date

---

## Operações Geoespaciais

### Indexação
- Índices 2dsphere são utilizados para consultas geoespaciais eficientes
- Permitem operações de interseção de geometrias

### Operador $geoIntersects
- Encontra documentos cuja geometria intersecta com geometria especificada
- Usado para identificar licenças dentro de unidades de conservação
- Operação fundamental para detectar invasões

---

## Tratamento de Erros

### Erros de Importação
- Transações MongoDB são utilizadas para garantir atomicidade
- Em caso de erro, transação é abortada (rollback)
- Erros são registrados no console e no logger

### Erros de Duplicação
- Método `ifMayNotIgnore(ex).throw()` trata erros específicos
- Erros de documentos duplicados são ignorados
- Outros erros são propagados

### Erro Geral do Job
- Try-catch no nível principal captura qualquer exceção
- Erros são registrados com `getLogger().error()`
- Mensagem formatada com descrição do erro

---

## Dependências Externas

### Banco de Dados
- MongoDB com mongoose
- Suporte a operações geoespaciais
- Transações ACID para consistência

### Arquivos
- Shapefiles (.shp, .dbf) para dados geoespaciais
- Downloads da ANM (Agência Nacional de Mineração)
- Arquivos locais de unidades de conservação

### APIs Externas
- API do Mapbox para visualização de dados
- Upload de dados geoespaciais para serviço de mapas

### Sistema de Arquivos
- Manipulação de diretórios temporários
- Leitura e escrita de arquivos
- Compressão/descompressão de arquivos ZIP

---

## Formato de Saída

### Arquivos GeoJSON
- Formato padrão para dados geoespaciais
- Usado por ferramentas como Carto
- Contém geometrias e propriedades

### Arquivos CSV
- Formato tabular para análise em planilhas
- Propriedades selecionadas específicas
- Separadores de milhares para áreas

### Filas de Processamento
- Duas filas: português (InvasionPT) e inglês (InvasionEN)
- Status FIFO (First In, First Out)
- Suporte a processamento paralelo com lock

---

## Fluxo de Notificação (Preparação)

### Objetivo
- Preparar invasões para notificação via Twitter
- Suportar múltiplos idiomas (PT e EN)
- Evitar notificações duplicadas

### Processamento
- Apenas invasões do ano atual são enfileiradas
- Invasões de anos anteriores são marcadas como tweetadas
- Cada invasão gera dois itens de fila (PT e EN)
- Chave única previne duplicatas na fila

---

## Considerações de Performance

### Operações Paralelas
- Transações isolam operações de escrita
- Índices geoespaciais otimizam consultas de interseção
- Agregações MongoDB são executadas no servidor

### Volume de Dados
- Processamento em lote de licenças
- Iteração sequencial para upsert (evita duplicatas)
- Filtragem de duplicatas antes do upload para Mapbox

### Memória
- Leitura streaming de shapefiles
- Processamento iterativo de grandes conjuntos de dados
- Remoção de diretórios temporários após uso

---

## Rastreabilidade

### Histórico de Mudanças
- Cada invasão mantém histórico completo
- Registro de timestamp para cada alteração
- Descrição detalhada das mudanças de propriedades

### Estados de Ação
- **create**: Invasão recém-descoberta
- **update**: Invasão existente com mudanças
- **delete**: Invasão que não existe mais (licença removida ou não intersecta mais)
- **restored**: Invasão anteriormente deletada que voltou a existir

### Auditoria
- Logging em cada etapa principal
- Timestamps de início e fim de operações
- Contagem de documentos processados
