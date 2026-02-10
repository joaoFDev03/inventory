/**
 * Aplicação Frontend
 * Lógica principal da interface
 */

let productsCache = [];

// ============ Inicialização ============

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Iniciando aplicação...');
  loadProducts();
  setupEventListeners();
  checkServerStatus();
  setInterval(checkServerStatus, 10000); // Check a cada 10s
});

// ============ Setup de Event Listeners ============

function setupEventListeners() {
  // Form: Novo Produto
  document.getElementById('formNewProduct').addEventListener('submit', handleNewProduct);

  // Forms: Stock Operations
  document.getElementById('formStockIn').addEventListener('submit', handleStockIn);
  document.getElementById('formStockOut').addEventListener('submit', handleStockOut);
  document.getElementById('formStockAdjust').addEventListener('submit', handleStockAdjust);

  // Buttons
  document.getElementById('btnExport').addEventListener('click', exportToJSON);
  document.getElementById('btnRefreshHistory').addEventListener('click', loadEvents);
}

// ============ Produtos ============

async function loadProducts() {
  try {
    const response = await InventoryAPI.getProducts();
    productsCache = response.data || [];
    renderProductsTable();
    updateProductSelects();
  } catch (error) {
    showNotification(error.message, 'error');
    console.error(error);
  }
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');

  if (productsCache.length === 0) {
    tbody.innerHTML = '<tr class="placeholder"><td colspan="4" class="text-center">Nenhum produto adicionado</td></tr>';
    return;
  }

  tbody.innerHTML = productsCache
    .map(product => {
      const status = getStockStatus(product.stock);
      const statusClass = getStatusClass(product.stock);

      return `
        <tr class="product-row">
          <td><strong>${escapeHtml(product.name)}</strong></td>
          <td class="text-center"><span class="stock-badge">${product.stock}</span></td>
          <td class="text-center"><span class="status-badge ${statusClass}">${status}</span></td>
          <td class="text-center">
            <button class="btn btn-small btn-danger" onclick="confirmDeleteProduct('${product.id}', '${escapeHtml(product.name)}')">
              🗑️ Deletar
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function updateProductSelects() {
  const selects = ['productSelectIn', 'productSelectOut', 'productSelectAdjust'];
  const options = productsCache
    .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join('');

  selects.forEach(selectId => {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">-- Selecionar --</option>' + options;
  });
}

async function handleNewProduct(e) {
  e.preventDefault();

  const name = document.getElementById('productName').value.trim();
  const initialStock = parseInt(document.getElementById('productStock').value) || 0;

  if (!name) {
    showNotification('Nome do produto é obrigatório', 'error');
    return;
  }

  try {
    showNotification('Criando produto...', 'info');
    await InventoryAPI.createProduct(name, initialStock);
    showNotification(`Produto "${name}" criado com sucesso!`, 'success');

    document.getElementById('formNewProduct').reset();
    loadProducts();
  } catch (error) {
    showNotification(error.message, 'error');
    console.error(error);
  }
}

async function confirmDeleteProduct(productId, productName) {
  if (!confirm(`Tem certeza que deseja deletar "${productName}"? Isto também apagará todo o histórico.`)) {
    return;
  }

  try {
    showNotification('Deletando produto...', 'info');
    await InventoryAPI.deleteProduct(productId);
    showNotification(`Produto deletado com sucesso`, 'success');
    loadProducts();
    loadEvents();
  } catch (error) {
    showNotification(error.message, 'error');
    console.error(error);
  }
}

// ============ Stock Operations ============

async function handleStockIn(e) {
  e.preventDefault();

  const productId = document.getElementById('productSelectIn').value;
  const quantity = parseInt(document.getElementById('quantityIn').value);
  const notes = document.getElementById('notesIn').value.trim();

  if (!productId) {
    showNotification('Selecione um produto', 'error');
    return;
  }

  try {
    showNotification('Adicionando stock...', 'info');
    await InventoryAPI.addStock(productId, quantity, notes);
    showNotification('Stock adicionado com sucesso!', 'success');

    e.target.reset();
    loadProducts();
    loadEvents();
  } catch (error) {
    showNotification(error.message, 'error');
    console.error(error);
  }
}

async function handleStockOut(e) {
  e.preventDefault();

  const productId = document.getElementById('productSelectOut').value;
  const quantity = parseInt(document.getElementById('quantityOut').value);
  const notes = document.getElementById('notesOut').value.trim();

  if (!productId) {
    showNotification('Selecione um produto', 'error');
    return;
  }

  try {
    showNotification('Removendo stock...', 'info');
    await InventoryAPI.removeStock(productId, quantity, notes);
    showNotification('Stock removido com sucesso!', 'success');

    e.target.reset();
    loadProducts();
    loadEvents();
  } catch (error) {
    showNotification(error.message, 'error');
    console.error(error);
  }
}

async function handleStockAdjust(e) {
  e.preventDefault();

  const productId = document.getElementById('productSelectAdjust').value;
  const newQuantity = parseInt(document.getElementById('quantityAdjust').value);
  const notes = document.getElementById('notesAdjust').value.trim();

  if (!productId) {
    showNotification('Selecione um produto', 'error');
    return;
  }

  try {
    showNotification('Ajustando stock...', 'info');
    await InventoryAPI.adjustStock(productId, newQuantity, notes);
    showNotification('Stock ajustado com sucesso!', 'success');

    e.target.reset();
    loadProducts();
    loadEvents();
  } catch (error) {
    showNotification(error.message, 'error');
    console.error(error);
  }
}

// ============ Eventos/Histórico ============

async function loadEvents() {
  try {
    const response = await InventoryAPI.getEvents(100);
    const events = response.data.events || [];
    renderEventsTable(events);

    document.getElementById('eventCount').textContent = `${events.length} eventos`;
  } catch (error) {
    showNotification(error.message, 'error');
    console.error(error);
  }
}

function renderEventsTable(events) {
  const tbody = document.getElementById('eventsTableBody');

  if (events.length === 0) {
    tbody.innerHTML = '<tr class="placeholder"><td colspan="5" class="text-center">Nenhum evento registado</td></tr>';
    return;
  }

  tbody.innerHTML = events
    .map(event => {
      const date = new Date(event.created_at).toLocaleString('pt-PT');
      const product = getProductName(event.product_id);
      const typeClass = getEventTypeClass(event.type);

      return `
        <tr>
          <td><small>${date}</small></td>
          <td>${escapeHtml(product)}</td>
          <td class="text-center"><span class="event-type ${typeClass}">${event.type}</span></td>
          <td class="text-center"><strong>${event.quantity}</strong></td>
          <td><small>${escapeHtml(event.notes || '—')}</small></td>
        </tr>
      `;
    })
    .join('');
}

// ============ Export ============

async function exportToJSON() {
  try {
    const products = productsCache;
    const response = await InventoryAPI.getEvents(10000);
    const events = response.data.events || [];

    const exportData = {
      exportedAt: new Date().toISOString(),
      products,
      stockEvents: events
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showNotification('Dados exportados com sucesso!', 'success');
  } catch (error) {
    showNotification('Falha ao exportar dados: ' + error.message, 'error');
    console.error(error);
  }
}

// ============ Status & Health Check ============

async function checkServerStatus() {
  const isOnline = await InventoryAPI.checkHealth();
  const indicator = document.getElementById('statusIndicator');

  if (isOnline) {
    indicator.className = 'status-indicator online';
    indicator.title = 'Servidor online';
  } else {
    indicator.className = 'status-indicator offline';
    indicator.title = 'Servidor offline';
  }
}

// ============ Utility Functions ============

function getProductName(productId) {
  const product = productsCache.find(p => p.id === productId);
  return product ? product.name : 'Produto desconhecido';
}

function getStockStatus(stock) {
  if (stock === 0) return 'Esgotado';
  if (stock < 10) return 'Baixo';
  if (stock < 50) return 'Médio';
  return 'Alto';
}

function getStatusClass(stock) {
  if (stock === 0) return 'status-red';
  if (stock < 10) return 'status-yellow';
  if (stock < 50) return 'status-blue';
  return 'status-green';
}

function getEventTypeClass(type) {
  const classes = {
    'IN': 'type-in',
    'OUT': 'type-out',
    'ADJUST': 'type-adjust'
  };
  return classes[type] || '';
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ============ Notifications ============

function showNotification(message, type = 'info') {
  const container = document.getElementById('notificationContainer');
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  // Auto-remove após 5 segundos
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Carrega eventos ao iniciar
setTimeout(loadEvents, 500);
