# Inventário - Gestão de Stock Web

Uma aplicação web simples e completa de gestão de inventário para uso pessoal, construída com Node.js, Express e SQLite.

## 🎯 Características

- ✅ **Sem autenticação** - Aplicação single-user
- ✅ **Web-based** - Frontend HTML + CSS + JavaScript
- ✅ **Backend REST** - API cleanly designed
- ✅ **Persistência local** - SQLite como ficheiro local
- ✅ **Transações ACID** - Garantia de consistência de dados
- ✅ **Histórico imutável** - Todas as operações de stock são registadas
- ✅ **Stock negativo bloqueado** - Validações de negócio
- ✅ **Health check** - Endpoint `/health` para manter serviço ativo no Render
- ✅ **Export JSON** - Backup manual dos dados
- ✅ **Responsivo** - Funciona em desktop e mobile
- ✅ **Sem over-engineering** - Código simples e legível

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- npm

### Setup Rápido

1. **Entrar no diretório:**
   ```bash
   cd inventario
   ```

2. **Instalar dependências:**
   ```bash
   npm install
   ```

3. **Iniciar o servidor:**
   ```bash
   npm start
   ```

   O servidor rodará em `http://localhost:3000`

4. **Abrir no navegador:**
   ```
   http://localhost:3000
   ```

5. **Modo desenvolvimento (auto-reload):**
   ```bash
   npm run dev
   ```

6. **Verificar health check:**
   ```bash
   curl http://localhost:3000/health
   # Resposta: {"status":"ok"}
   ```

## 📋 API REST

### Health Check
```
GET /health
```
Resposta:
```json
{ "status": "ok" }
```

### Produtos (API)

#### Listar todos os produtos
```
GET /api/products
```

#### Criar novo produto
```
POST /api/products
Content-Type: application/json

{
  "name": "Parafuso M8",
  "initialStock": 100
}
```

#### Obter detalhes de um produto
```
GET /api/products/:id
```

#### Deletar produto
```
DELETE /api/products/:id
```

### Stock (API)

#### Adicionar stock (entrada)
```
POST /api/stock/in
Content-Type: application/json

{
  "productId": "uuid-aqui",
  "quantity": 50,
  "notes": "Compra fornecedor X"
}
```

#### Remover stock (saída)
```
POST /api/stock/out
Content-Type: application/json

{
  "productId": "uuid-aqui",
  "quantity": 10,
  "notes": "Venda cliente Y"
}
```

#### Ajustar stock (correção de inventário)
```
POST /api/stock/adjust
Content-Type: application/json

{
  "productId": "uuid-aqui",
  "newQuantity": 75,
  "notes": "Contagem física de inventário"
}
```

#### Histórico de eventos
```
GET /api/stock/events?limit=100&offset=0
```

#### Eventos de um produto específico
```
GET /api/stock/events/:productId?limit=50&offset=0
```

## 🗂️ Estrutura do Projeto

```
inventario/
├── src/
│   ├── app.js                  # Servidor Express, static files, rotas principais
│   ├── database.js             # Inicialização e configuração SQLite
│   ├── models.js               # Lógica de negócio (ProductModel, StockModel)
│   └── routes/
│       ├── products.js         # Endpoints de produtos
│       └── stock.js            # Endpoints de stock
├── frontend/                   # Frontend web-based
│   ├── index.html              # Interface HTML
│   ├── app.js                  # Lógica da aplicação (DOM, eventos)
│   ├── api.js                  # Wrapper para chamadas API
│   └── styles.css              # Estilos responsivos
├── data/                       # Base de dados (criada automaticamente)
│   └── inventory.db
├── package.json                # Dependências e scripts
└── README.md                   # Este ficheiro
```

## 💾 Base de Dados

### Tabela `products`
- `id` (TEXT PRIMARY KEY) - UUID único
- `name` (TEXT UNIQUE) - Nome do produto
- `stock` (INTEGER) - Quantidade atual (não pode ser negativo)
- `created_at` - Data de criação
- `updated_at` - Data de última atualização

### Tabela `stock_events`
- `id` (TEXT PRIMARY KEY) - UUID único
- `product_id` (FOREIGN KEY) - Referência ao produto
- `type` (TEXT) - Tipo: `IN`, `OUT` ou `ADJUST`
- `quantity` (INTEGER) - Quantidade movimentada
- `created_at` - Data do evento
- `notes` (TEXT) - Anotações opcionais

## 🔒 Regras de Negócio

1. **Stock não pode ser negativo** - Validações impedem remover mais do que existe
2. **Histórico imutável** - Eventos nunca são apagados ou modificados
3. **Transações ACID** - Cada operação de stock é atómica
4. **Atualização sempre via eventos** - Stock direto nunca é alterado sem registar evento

## 🚀 Deployment no Render

### Setup no Render (Free Tier)

1. **Criar novo Web Service no Render:**
   - Conectar repositório GitHub
   - Nome do serviço: `inventario-app`
   - Runtime: `Node`
   - Build command: `npm install`
   - Start command: `npm start`

2. **Variáveis de ambiente:**
   ```
   NODE_ENV=production
   PORT=3000 (definido automaticamente pelo Render)
   ```

3. **Health Check:**
   O Render fará ping automático a `/health` para manter o serviço ativo no free tier.

4. **Acesso remoto:**
   - URL do Render será algo como: `https://inventario-app.onrender.com`
   - Aceder ao frontend via: `https://inventario-app.onrender.com`
   - Health check: `https://inventario-app.onrender.com/health`

### Notas sobre o Free Tier do Render

- Serviço inativo durante 15+ minutos é suspenso
- Endpoints de health check a cada 5-10 minutos mantêm ativo
- Base de dados SQLite local funciona bem em free tier
- Dados persistem entre restarts (ficheiro `data/inventory.db`)
- **IMPORTANTE:** Dados são perdidos quando o free tier reinicia após 3 meses de inatividade
- Para backup permanente, use o botão "📥 Exportar JSON" regularmente

## 🛠️ Desenvolvimento

### Adicionar novo produto (via API)
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Item Test", "initialStock": 10}'
```

### Adicionar stock (via API)
```bash
curl -X POST http://localhost:3000/api/stock/in \
  -H "Content-Type: application/json" \
  -d '{"productId": "id-aqui", "quantity": 5, "notes": "Teste"}'
```

### Ver histórico completo (via API)
```bash
curl http://localhost:3000/api/stock/events
```

## 📝 Exemplo de Fluxo Completo

```bash
# 1. Criar produto com 100 unidades iniciais
PRODUCT=$(curl -s -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Produto A", "initialStock": 100}')

PRODUCT_ID=$(echo $PRODUCT | grep -o '"id":"[^"]*' | cut -d'"' -f4)

# 2. Adicionar mais 50 unidades
curl -X POST http://localhost:3000/api/stock/in \
  -H "Content-Type: application/json" \
  -d "{\"productId\": \"$PRODUCT_ID\", \"quantity\": 50, \"notes\": \"Reabastecimento\"}"

# 3. Remover 30 unidades
curl -X POST http://localhost:3000/api/stock/out \
  -H "Content-Type: application/json" \
  -d "{\"productId\": \"$PRODUCT_ID\", \"quantity\": 30, \"notes\": \"Venda\"}"

# 4. Listar todos os eventos do produto
curl "http://localhost:3000/api/stock/events/$PRODUCT_ID"
```

## 🐛 Troubleshooting

### Base de dados corrompida
```bash
# Eliminar base de dados e reiniciar (perdem-se todos os dados)
rm -rf data/
npm start
```

### Porta já em uso
```bash
# Usar porta diferente
PORT=3001 npm start
```

### Melhorar performance
- Base de dados já está otimizada com WAL mode
- Índices criados automaticamente em colunas de query frequentes
- Foreign keys ativadas para integridade referencial

---

## 📚 Documentação Adicional

- **[QUICKSTART.md](QUICKSTART.md)** - Guia rápido para começar
- **[TESTING.md](TESTING.md)** - Testes completos (frontend, API, persistência)
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy passo a passo em Render
- **[EXAMPLES.md](EXAMPLES.md)** - Casos de uso e exemplos práticos

---

## 📄 Licença

MIT

## ✍️ Autor

Aplicação criada para gestão de inventário pessoal - sem dependências externas desnecessárias.
