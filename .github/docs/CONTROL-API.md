# API de Controle - Amazônia Minada

## Visão Geral

A API de Controle é um serviço REST que permite gerenciar e monitorar jobs agendados do sistema Amazônia Minada. A API executa na porta **5100** e fornece endpoints para executar jobs manualmente e listar os jobs configurados.

## Autenticação

### Tipo de Autenticação
A API utiliza **Basic Authentication** com uma chave de API (API Key).

### Middleware de Segurança
`SecureKeyAuthorizationMiddleware()`

### Formato da Autenticação

A autenticação é feita através do header `Authorization` usando o formato Basic Auth:

```
Authorization: Basic base64(apikey:API_SECURE_KEY)
```

**Componentes:**
- **Username:** `apikey` (fixo)
- **Password:** Valor da variável de ambiente `API_SECURE_KEY`

### Exemplo de Uso

```bash
# Exemplo com curl
curl -X GET http://localhost:5100/jobs/list \
  -H "Authorization: Basic $(echo -n 'apikey:sua_chave_secreta' | base64)"
```

```javascript
// Exemplo com JavaScript/Node.js
const username = 'apikey';
const password = process.env.API_SECURE_KEY;
const auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

fetch('http://localhost:5100/jobs/list', {
  headers: {
    'Authorization': auth
  }
});
```

### Configuração

A chave de API é configurada através da variável de ambiente:

```env
API_SECURE_KEY=sua_chave_secreta_aqui
```

Se não configurada, o valor padrão será `'null'`.

### Códigos de Resposta de Autenticação

| Código | Descrição |
|--------|-----------|
| 200 | Autenticação bem-sucedida e requisição processada |
| 401 | Não autorizado - credenciais inválidas ou ausentes |
| 500 | Erro interno do servidor |

## Endpoints

### 1. Executar Job Manualmente

Executa um job específico imediatamente, ignorando o agendamento configurado.

**Endpoint:**
```
POST /jobs/now/:jobName
```

**Parâmetros:**
- `jobName` (path parameter) - Nome do job a ser executado

**Headers Obrigatórios:**
```
Authorization: Basic base64(apikey:API_SECURE_KEY)
Content-Type: application/json
```

**Exemplo de Requisição:**

```bash
curl -X POST http://localhost:5100/jobs/now/UpdateInvasions \
  -H "Authorization: Basic $(echo -n 'apikey:sua_chave_secreta' | base64)" \
  -H "Content-Type: application/json"
```

**Respostas:**

| Código | Descrição |
|--------|-----------|
| 200 | Job iniciado com sucesso |
| 401 | Não autorizado |
| 500 | Erro ao executar o job |

---

### 2. Listar Jobs Configurados

Retorna a lista de todos os jobs configurados no sistema.

**Endpoint:**
```
GET /jobs/list
```

**Headers Obrigatórios:**
```
Authorization: Basic base64(apikey:API_SECURE_KEY)
```

**Exemplo de Requisição:**

```bash
curl -X GET http://localhost:5100/jobs/list \
  -H "Authorization: Basic $(echo -n 'apikey:sua_chave_secreta' | base64)"
```

**Exemplo de Resposta:**

```json
[
  "UpdateInvasions",
  "UpdateReserveInvasions",
  "TweetTotalYearInvasions",
  "TweetTotalReserveInvasions",
  "TweetTotalInvasions",
  "TweetTotalCountrySizeInvasionsPT",
  "TweetTotalCountrySizeInvasionsEN",
  "TweetNewReserveInvasionsPT",
  "TweetNewReserveInvasionsEN",
  "TweetNewInvasionsEN",
  "TweetNewInvasionsPT"
]
```

**Respostas:**

| Código | Descrição |
|--------|-----------|
| 200 | Lista retornada com sucesso |
| 401 | Não autorizado |

---

## Jobs Disponíveis

Lista completa dos jobs configurados no sistema com seus respectivos agendamentos:

| Nome do Job | Descrição | Agendamento (Cron) |
|-------------|-----------|-------------------|
| `UpdateInvasions` | Atualiza dados de invasões | `30 0 * * *` (00:30 diariamente) |
| `UpdateReserveInvasions` | Atualiza invasões em reservas | `30 1 * * *` (01:30 diariamente) |
| `TweetTotalYearInvasions` | Tweet total de invasões do ano | `0 12 * * 5` (12:00 sextas-feiras) |
| `TweetTotalReserveInvasions` | Tweet total de invasões em reservas | `0 12 * * 1` (12:00 segundas-feiras) |
| `TweetTotalInvasions` | Tweet total geral de invasões | `0 12 * * 3` (12:00 quartas-feiras) |
| `TweetTotalCountrySizeInvasionsPT` | Tweet comparação tamanho país (PT) | `0 12 * * 5` (12:00 sextas-feiras) |
| `TweetTotalCountrySizeInvasionsEN` | Tweet comparação tamanho país (EN) | `0 12 * * 6` (12:00 sábados) |
| `TweetNewReserveInvasionsPT` | Tweet novas invasões em reservas (PT) | `0 9-23 15 * *` (A cada hora das 9h às 23h no dia 15) |
| `TweetNewReserveInvasionsEN` | Tweet novas invasões em reservas (EN) | `0 9-23 15 * *` (A cada hora das 9h às 23h no dia 15) |
| `TweetNewInvasionsEN` | Tweet novas invasões (EN) | `0 10-23 30 * *` (A cada hora das 10h às 23h no dia 30) |
| `TweetNewInvasionsPT` | Tweet novas invasões (PT) | `0 10-23 30 * *` (A cada hora das 10h às 23h no dia 30) |

---

## Configuração do Servidor

### Variáveis de Ambiente Necessárias

```env
# Autenticação da API
API_SECURE_KEY=sua_chave_secreta

# Banco de Dados MongoDB
MONGO_DB_USERNAME=usuario
MONGO_DB_PASSWORD=senha
MONGO_DB_ADDRESS=database
# ou
MONGO_URI=mongodb://usuario:senha@host:27017/icfj?authSource=admin&ssl=false

# Timezone
TZ=America/Sao_Paulo
```

### Porta do Servidor

A API executa na porta **5100** por padrão.

### Dependências Principais

- **Express.js** - Framework web
- **Mongoose** - ODM para MongoDB
- **Bree** - Agendador de jobs
- **@breejs/later** - Parser de expressões cron

---

## Segurança

### Boas Práticas

1. **Nunca exponha a API_SECURE_KEY** em código-fonte ou logs
2. Use conexões HTTPS em produção
3. Mantenha a chave API complexa e segura
4. Rotacione a chave periodicamente
5. Limite o acesso à API apenas a IPs/serviços confiáveis
6. Monitore logs de acesso para detectar tentativas não autorizadas

### Validações Implementadas

- ✅ Verificação obrigatória do header Authorization
- ✅ Validação do formato Basic Auth
- ✅ Comparação segura da API key
- ✅ Validação do username 'apikey'
- ✅ Retorno de 401 para requisições não autorizadas

---

## Logs

O sistema utiliza um logger centralizado que registra:
- Inicialização da aplicação
- Conexão com banco de dados
- Início da API de controle
- Execução de jobs
- Erros e exceções

---

## Tratamento de Erros

### Erro ao Executar Job

Quando um job falha ao ser executado manualmente:
- Status HTTP 500 é retornado
- Erro é registrado no log: `Failed to due now job: ${error}`

### Erro de Autenticação

Quando as credenciais são inválidas:
- Status HTTP 401 é retornado
- Nenhum detalhe adicional é exposto por segurança

---

## Exemplos de Integração

### Python

```python
import requests
from base64 import b64encode

username = "apikey"
password = "sua_chave_secreta"
credentials = b64encode(f"{username}:{password}".encode()).decode()

headers = {
    "Authorization": f"Basic {credentials}"
}

# Listar jobs
response = requests.get("http://localhost:5100/jobs/list", headers=headers)
print(response.json())

# Executar job
response = requests.post(
    "http://localhost:5100/jobs/now/UpdateInvasions",
    headers=headers
)
print(response.status_code)
```

### Node.js

```javascript
const axios = require('axios');

const username = 'apikey';
const password = process.env.API_SECURE_KEY;
const token = Buffer.from(`${username}:${password}`).toString('base64');

const api = axios.create({
  baseURL: 'http://localhost:5100',
  headers: {
    'Authorization': `Basic ${token}`
  }
});

// Listar jobs
api.get('/jobs/list')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));

// Executar job
api.post('/jobs/now/UpdateInvasions')
  .then(response => console.log('Job iniciado:', response.status))
  .catch(error => console.error(error));
```

### Shell Script

```bash
#!/bin/bash

API_KEY="sua_chave_secreta"
BASE_URL="http://localhost:5100"
AUTH=$(echo -n "apikey:$API_KEY" | base64)

# Listar jobs
curl -X GET "$BASE_URL/jobs/list" \
  -H "Authorization: Basic $AUTH"

# Executar job específico
curl -X POST "$BASE_URL/jobs/now/UpdateInvasions" \
  -H "Authorization: Basic $AUTH"
```

---

## Suporte e Contribuições

Para mais informações sobre o projeto Amazônia Minada:
- **Organização:** InfoAmazonia
- **Repositório:** amazonia-minada
- **Branch:** master

---

**Última Atualização:** Dezembro 2025
