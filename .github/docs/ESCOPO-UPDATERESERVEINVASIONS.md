# Escopo Detalhado do Job UpdateReserveInvasions

## Visão Geral

O job **UpdateReserveInvasions** é responsável por atualizar as invasões de licenças minerárias em terras indígenas (reservas), sincronizando os dados entre licenças e reservas, detectando novas invasões, removendo invasões obsoletas e enfileirando as invasões para processamento de tweets.

---

## Fluxo de Execução Principal

### 1. Inicialização do Job (jobEntrypoint)

- Inicializa o sistema de logging
- Registra log informando início da execução
- Estabelece conexão com o banco de dados MongoDB usando as credenciais e configurações do arquivo de configuração
- Executa o callback principal do job em um contexto protegido por try-catch
- Em caso de erro, registra no log e encerra a execução

### 2. Verificação e Importação de Reservas

- Executa contagem de documentos na collection Reserve
- Se não houver reservas cadastradas no banco de dados:
  - Chama o método importReserves que:
    - Inicia uma sessão de transação MongoDB
    - Remove todos os registros existentes na collection Reserve
    - Remove o diretório temporário de saída
    - Cria um novo diretório temporário
    - Carrega arquivos shapefile localmente do diretório configurado
    - Descompacta o arquivo zipado
    - Copia arquivos necessários para o diretório de trabalho
    - Remove arquivos temporários
    - Lê o shapefile com encoding configurado
    - Para cada registro lido:
      - Formata o campo etnia_nome substituindo vírgulas por vírgulas com espaço
      - Formata o campo municipio_ da mesma forma
      - Cria um documento na collection Reserve
    - Comita a transação se bem-sucedido
    - Em caso de erro, aborta a transação
    - Busca todas as reservas dentro da Amazônia
    - Gera arquivo GeoJSON com os dados
    - Gera arquivo CSV com propriedades específicas
    - Envia dados para a API do Mapbox

### 3. Importação de Invasões em Reservas (importReserveInvasions)

- Busca todas as reservas dentro da região da Amazônia através de agregação MongoDB
- A agregação projeta campos específicos das reservas incluindo:
  - Dados identificadores (gid, terrai_cod, terrai_nom)
  - Informações etnográficas (etnia_nome)
  - Dados geográficos (municipio_, uf_sigla, superficie)
  - Cálculo de superfície em km² (multiplica superficie por 0.01)
  - Dados administrativos (fase_ti, modalidade, undadm_cod, etc.)
  - Geometria completa

#### 3.1. Criação de Invasões por Reservas (createInvasionsByReserves)

Para cada reserva retornada:

- Busca interseções de licenças com a geometria da reserva através de agregação geoespacial MongoDB
- A agregação:
  - Usa operador $geoIntersects para encontrar licenças que cruzam com a geometria da reserva
  - Projeta propriedades da licença (PROCESSO, ID, NUMERO, ANO, AREA_HA, FASE, ULT_EVENTO, NOME, SUBS, USO, UF)
  - Adiciona propriedades da terra indígena (TI_NOME, TI_ETNIA, TI_MUNICIPIO, TI_UF, TI_SUPERFICIE, TI_FASE, TI_MODALIDADE)
  - Mantém a geometria original da licença

#### 3.2. Upsert de Invasões (upsertInvasions)

Para cada invasão detectada:

- Monta query de busca usando properties.ID e properties.TI_NOME
- Busca no banco se a invasão já existe
- Se a invasão existe:
  - Compara cada propriedade do novo registro com o registro existente
  - Detecta mudanças e gera string descritiva das alterações
  - Se houver mudanças:
    - Atualiza timestamp last_update_at
    - Define last_action como 'update'
    - Adiciona registro no array de changes com timestamp e descrição das mudanças
    - Remove o _id do objeto
    - Atualiza o documento no banco de dados
- Se a invasão não existe:
  - Define last_action como 'create'
  - Remove o _id do objeto
  - Cria novo documento na collection ReserveInvasion

#### 3.3. Sinalização de Invasões Removidas (flagRemovedInvasions)

- Busca todas as invasões existentes no banco de dados
- Para cada invasão existente:
  - Verifica se ela ainda está presente nas invasões geradas
  - Se não está presente e last_action não é 'delete':
    - Define last_action como 'delete'
    - Atualiza last_update_at com timestamp atual
    - Adiciona entrada no array changes com marcação 'deleted'
    - Atualiza o documento no banco
- Filtra invasões existentes que não estão deletadas
- Para cada invasão gerada:
  - Verifica se existe no conjunto de invasões não deletadas
  - Se não existe mas está marcada como deletada no banco:
    - Define last_action como 'update'
    - Atualiza last_update_at
    - Adiciona entrada no array changes com marcação 'restored'
    - Atualiza o documento (restaura a invasão)

#### 3.4. Recuperação de Invasões (getNewAndAllReserveInvasions)

- Busca todas as invasões não deletadas (last_action diferente de 'delete')
- Busca invasões novas (tweeted = false e last_action diferente de 'delete')
- Retorna objeto com duas listas: all (todas) e new (novas)
- Cada busca usa agregação MongoDB projetando:
  - Identificador _id (condicional baseado em query)
  - Tipo 'Feature'
  - Todas as propriedades da invasão
  - Geometria completa

#### 3.5. Geração e Upload de Arquivos

- Gera arquivo GeoJSON com todas as invasões
- Gera arquivo CSV com propriedades específicas configuradas
- Remove duplicatas usando filterDuplicatedInvasions:
  - Percorre array de invasões
  - Usa Set para rastrear IDs já vistos
  - Mantém apenas primeira ocorrência de cada ID
- Envia dados filtrados para API do Mapbox

### 4. Filtragem de Invasões de Anos Anteriores (updateTweetStatus)

- Filtra as invasões retornadas para identificar aquelas com properties.ANO diferente do ano atual
- Para cada invasão de ano anterior:
  - Converte o _id para ObjectId do MongoDB
- Executa updateMany na collection Invasion (note que usa Invasion, não ReserveInvasion):
  - Query: _id está na lista de ObjectIds das invasões de anos anteriores
  - Update: define campo tweeted como true
- Isso marca invasões antigas como já tuitadas para evitar duplicação

### 5. Enfileiramento para Processamento de Tweets

Para cada invasão retornada (incluindo as do ano atual):

- Gera chave única no formato: "reverseinvasion:{invasion._id}"
- Serializa o objeto invasão completo em JSON string
- Adiciona item na fila 'ReverseInvasionPT':
  - Cria documento na collection dinâmica "ReverseInvasionPT_QueueItem"
  - Armazena chave, dados serializados, status 'pending'
  - Define timestamps de criação e atualização
- Adiciona item na fila 'ReverseInvasionEN':
  - Mesmo processo mas na collection "ReverseInvasionEN_QueueItem"
  - Permite processamento paralelo em português e inglês

### 6. Tratamento de Erros

- Todo o fluxo está envolvido em try-catch
- Em caso de exceção:
  - Registra erro no log com mensagem "Failed Update Reverse Invasions: {erro}"
  - Não interrompe outros jobs do sistema

---

## Modelos de Dados Utilizados

### Reserve (Mongoose Schema)

- **type**: String
- **properties**: Object (flexível)
- **geometry**: Object (geometria geoespacial)

### ReserveInvasion (Mongoose Schema)

- **type**: String
- **properties**: Object (combina dados de licença e reserva)
- **geometry**: Object
- **tweeted**: Boolean (padrão false)
- **created_at**: Date
- **last_action**: String ('create', 'update', 'delete')
- **last_update_at**: Date
- **changes**: Array de objetos com timestamp e descrição de mudanças

### QueueItem (Schema Dinâmico)

- **key**: String (obrigatório)
- **data**: Mixed (obrigatório)
- **status**: Enum ['pending', 'processing', 'done', 'failed']
- **lockedAt**: Date
- **createdAt**: Date
- **updatedAt**: Date
- **Índice composto**: {status: 1, lockedAt: 1}

---

## Dependências e Integrações

### Banco de Dados

- MongoDB com suporte a operações geoespaciais ($geoIntersects)
- Transações para consistência de dados
- Agregações complexas para projeção e filtragem

### Arquivos Externos

- Shapefiles de terras indígenas
- Arquivos de configuração local
- Diretórios temporários para processamento

### Serviços Externos

- Mapbox API para visualização de dados geoespaciais

### Sistema de Filas

- Filas separadas para português e inglês
- Modelo de fila persistente com status e locks temporais
- Suporte a FIFO (First In First Out)

---

## Objetivos do Job

1. **Sincronização**: Manter dados de invasões sincronizados com as fontes de dados mais recentes
2. **Detecção de Mudanças**: Identificar criações, atualizações, remoções e restaurações de invasões
3. **Histórico**: Manter registro de todas as alterações com timestamps
4. **Distribuição**: Preparar dados para processamento assíncrono via filas
5. **Multilíngue**: Suportar processamento em múltiplos idiomas (PT/EN)
6. **Integridade**: Evitar duplicação de tweets marcando invasões antigas
7. **Visualização**: Gerar arquivos para análise (GeoJSON, CSV) e mapas (Mapbox)

---

## Diagrama de Fluxo Simplificado

```
Início
  ↓
Inicializar Logger e Conectar MongoDB
  ↓
Verificar Reservas no Banco
  ↓
[Não há reservas?] → Sim → Importar Reservas
  ↓
Buscar Reservas na Amazônia
  ↓
Para cada Reserva:
  ↓
  Buscar Licenças que Intersectam (Invasões)
  ↓
  Upsert Invasões (Create/Update)
  ↓
Sinalizar Invasões Removidas (Delete/Restore)
  ↓
Recuperar Invasões (Todas e Novas)
  ↓
Gerar Arquivos (GeoJSON, CSV)
  ↓
Enviar para Mapbox
  ↓
Filtrar Invasões de Anos Anteriores
  ↓
Marcar como Tuitadas (tweeted = true)
  ↓
Para cada Invasão:
  ↓
  Enfileirar para Tweet PT
  ↓
  Enfileirar para Tweet EN
  ↓
Fim (ou Log de Erro)
```

---

## Considerações Técnicas

### Performance

- Uso de agregações MongoDB para operações em lote
- Processamento assíncrono através de filas
- Índices geoespaciais para consultas de interseção eficientes

### Confiabilidade

- Transações MongoDB para consistência
- Sistema de retry através de filas com lock temporal
- Logs detalhados para auditoria e debug

### Escalabilidade

- Collections de fila dinâmicas por tipo de processamento
- Processamento paralelo de múltiplos idiomas
- Separação de responsabilidades entre jobs

### Manutenibilidade

- Código modular com funções específicas
- Schemas bem definidos no Mongoose
- Configurações externalizadas
- Histórico de mudanças mantido em cada documento
