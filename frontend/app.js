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
  setInterval(checkServerStatus, 10000);
  setTimeout(loadEvents, 500);
});

// ============ Setup de Event Listeners ============

function setupEventListeners() {
  const bind = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };

  bind('formNewProduct', 'submit', handleNewProduct);
  bind('formStockIn', 'submit', handleStockIn);
  bind('formStockOut', 'submit', handleStockOut);
  bind('formStockAdjust', 'submit', handleStockAdjust);
  bind('btnExport', 'click', exportToJSON);
  bind('btnRefreshHistory', 'click', loadEvents);
}

// ============ Produtos ============

async function loadProducts() {
  try {
    const response = await InventoryAPI.getProducts();

    // Se response.data não for array, converte para array vazio
    if (Array.isArray(response.data)) {
      productsCache = response.data;
    } else if (response.data && typeof response.data === 'object') {
      // Se for objeto, tenta extrair produtos de um campo 'products', senão vazio
      productsCache = Array.isArray(response.data.products)
        ? response.data.products
        : [];
    } else {
      productsCache = [];
    }

    renderProductsTable();
    updateProductSelects();
  } catch (error) {
    showNotification(error.message, 'error');
    console.error(error);
  }
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  if (productsCache.length === 0) {
    tbody.innerHTML = '<tr class="placeholder"><td colspan="4" class="text-center">Nenhum produto adicionado</td></tr>';
    return;
  }

  tbody.innerHTML = productsCache.map(product => {
    const status = getStockStatus(product.stock);
    const statusClass = getStatusClass(product.stock);

    return `
      <tr class="product-row">
        <td><strong>${escapeHtml(product.name)}</strong></td>
        <td class="text-center"><span class="stock-badge">${product.stock}</span></td>
        <td class="text-center"><span class="status-badge ${statusClass}">${status}</span></td>
        <td class="text-center">
          <button class="btn btn-small btn-danger"
            onclick="confirmDeleteProduct('${product.id}', '${escapeHtml(product.name)}')">
            🗑️ Deletar
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function updateProductSelects() {
  const selects = ['productSelectIn', 'productSelectOut', 'productSelectAdjust'];
  const options = productsCache
    .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join('');

  selects.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = '<option value="">-- Selecionar --</option>' + options;
    }
  });
}

async function handleNewProduct(e) {
  e.preventDefault();

  const name = document.getElementById('productName')?.value.trim();
  const initialStock = parseInt(document.getElementById('productStock')?.value, 10) || 0;

  if (!name) {
    showNotification('Nome do produto é obrigatório', 'error');
    return;
  }

  if (!Number.isInteger(initialStock) || initialStock < 0) {
    showNotification('Stock inicial inválido', 'error');
    return;
  }

  try {
    showNotification('Criando produto...', 'info');
    await InventoryAPI.createProduct(name, initialStock);
    showNotification(`Produto "${name}" criado com sucesso!`, 'success');
    e.target.reset();
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
    showNotification('Produto deletado com sucesso', 'success');
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

  const productId = document.getElementById('productSelectIn')?.value;
  const quantity = parseInt(document.getElementById('quantityIn')?.value, 10);
  const notes = document.getElementById('notesIn')?.value.trim();

  if (!productId) {
    showNotification('Selecione um produto', 'error');
    return;
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    showNotification('Quantidade inválida', 'error');
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

  const productId = document.getElementById('productSelectOut')?.value;
  const quantity = parseInt(document.getElementById('quantityOut')?.value, 10);
  const notes = document.getElementById('notesOut')?.value.trim();

  if (!productId) {
    showNotification('Selecione um produto', 'error');
    return;
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    showNotification('Quantidade inválida', 'error');
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

  const productId = document.getElementById('productSelectAdjust')?.value;
  const newQuantity = parseInt(document.getElementById('quantityAdjust')?.value, 10);
  const notes = document.getElementById('notesAdjust')?.value.trim();

  if (!productId) {
    showNotification('Selecione um produto', 'error');
    return;
  }

  if (!Number.isInteger(newQuantity) || newQuantity < 0) {
    showNotification('Quantidade inválida', 'error');
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

// ============ Eventos / Histórico ============

async function loadEvents() {
  try {
    const response = await InventoryAPI.getEvents(100);
    const events = response.data?.events || [];
    renderEventsTable(events);
    const countEl = document.getElementById('eventCount');
    if (countEl) countEl.textContent = `${events.length} eventos`;
  } catch (error) {
    showNotification(error.message, 'error');
    console.error(error);
  }
}

function renderEventsTable(events) {
  const tbody = document.getElementById('eventsTableBody');
  if (!tbody) return;

  if (events.length === 0) {
    tbody.innerHTML = '<tr class="placeholder"><td colspan="5" class="text-center">Nenhum evento registado</td></tr>';
    return;
  }

  tbody.innerHTML = events.map(event => {
    const date = new Date(event.created_at).toLocaleString('pt-PT');
    const product = getProductName(event.product_id);
    const typeClass = getEventTypeClass(event.type);

    return `
      <tr>
        <td><small>${date}</small></td>
        <td>${escapeHtml(product)}</td>
        <td class="text-center"><span class="event-type ${typeClass}">${event.type}</span></td>
        <td class="text-center"><strong>${event.quantity}</strong></td>
        <td><small>${escapeHtml(event.notes ?? '—')}</small></td>
      </tr>
    `;
  }).join('');
}

// ============ Export ============

async function exportToJSON() {
  try {
    const response = await InventoryAPI.getEvents(10000);
    const events = response.data?.events || [];

    const exportData = {
      exportedAt: new Date().toISOString(),
      products: productsCache,
      stockEvents: events
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

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

// ============ Status / Health ============

async function checkServerStatus() {
  const indicator = document.getElementById('statusIndicator');
  if (!indicator) return;

  try {
    const isOnline = await InventoryAPI.checkHealth();
    indicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
    indicator.title = isOnline ? 'Servidor online' : 'Servidor offline';
  } catch {
    indicator.className = 'status-indicator offline';
    indicator.title = 'Servidor offline';
  }
}

// ============ Utils ============

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
  return { IN: 'type-in', OUT: 'type-out', ADJUST: 'type-adjust' }[type] || '';
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[m]));
}

// ============ Notifications ============

function showNotification(message, type = 'info') {
  const container = document.getElementById('notificationContainer');
  if (!container) return;

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}
