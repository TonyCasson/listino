// Admin Mode: cambia a false per nascondere controlli di editing
const ADMIN_MODE = false;

let equipment = [];
let discountMultiplier = 1;
const currencyFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

// Carica da localStorage se disponibile, altrimenti da data.json
const savedData = localStorage.getItem('equipmentData');
if (savedData) {
  equipment = JSON.parse(savedData);
  renderTable();
} else {
  fetch('data.json')
    .then(response => response.json())
    .then(data => {
      equipment = data;
      renderTable();
    });
}

function renderTable() {
  const tableDiv = document.getElementById('equipmentTable');
  
  // Raggruppa per categoria
  const categories = {};
  equipment.forEach((item, index) => {
    const cat = item.category || 'Altro';
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push({ item, index });
  });
  
  // Ordinamento custom
  const categoryOrder = ['Speakers', 'Subwoofers', 'Lights', 'Stands and Supports', 'Special Effects', 'Consoles & Mixers', 'Altro'];
  const sortedCategories = categoryOrder.filter(cat => categories[cat]);
  
  // Aggiungi categorie non nell'ordine (per retrocompatibilità)
  Object.keys(categories).forEach(cat => {
    if (!categoryOrder.includes(cat)) {
      sortedCategories.push(cat);
    }
  });
  
  let html = '';
  
  // Crea una tabella per ogni categoria
  sortedCategories.forEach(category => {
    const items = categories[category];
    const categoryId = category.replace(/\s+/g, '-').toLowerCase();
    
    html += `
      <div class="category-section" data-category="${categoryId}">
        <div class="category-header" onclick="toggleCategory('${categoryId}')">
          <h3>
            <span class="category-toggle" id="toggle-${categoryId}">▼</span>
            ${category} <span class="category-count">(${items.length})</span>
          </h3>
        </div>
        <div id="category-${categoryId}" class="category-content">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Quantity</th>
                ${ADMIN_MODE ? '<th>Actions</th>' : ''}
              </tr>
            </thead>
            <tbody>`;
    
    items.forEach(({ item, index }, localIndex) => {
      const imageUrls = item.imageUrls || (item.imageUrl ? [item.imageUrl] : []);
      const hasImages = imageUrls.length > 0 && imageUrls[0].trim() !== '';
      const nameClickable = hasImages ? `onclick="showImageGallery(${index})" style="cursor: pointer;"` : '';
      const draggableAttr = ADMIN_MODE ? `draggable="true" ondragstart="dragStart(event, ${index})" ondragover="dragOver(event)" ondrop="drop(event, ${index})" style="cursor: move;"` : '';
      html += `
        <tr ${draggableAttr} data-index="${index}">
          <td ${nameClickable}>
            <div style="line-height: 1.4;">
              <div style="font-weight: 500;">${item.name}</div>
              ${item.description1 ? `<div style="font-size: 0.85em; color: #86868b; margin-top: 2px;">${item.description1}</div>` : ''}
            </div>
          </td>
          <td><span id="price-${index}">${currencyFormatter.format(item.price * discountMultiplier)}</span></td>
          <td>
            <div class="qty-controls">
              <button onclick="changeQty(${index}, -1)">−</button>
              <input type="number" id="qty-${index}" min="0" max="${item.maxQty}" value="0" oninput="handleQuantityInput(this, ${item.maxQty}); calculateTotal();" />
              <button onclick="changeQty(${index}, 1)">+</button>
            </div>
          </td>
          ${ADMIN_MODE ? `<td>
            <button onclick="openEditModal(${index})" style="padding: 4px 8px; font-size: 12px;">Edit</button>
          </td>` : ''}
        </tr>`;
    });
    
    html += `
            </tbody>
          </table>
        </div>
      </div>`;
  });
  
  tableDiv.innerHTML = html;
  
  // Nascondi pulsanti admin se ADMIN_MODE = false
  if (!ADMIN_MODE) {
    const adminButtons = ['btnAddItem', 'btnBulkEdit', 'btnResetOriginal', 'btnExport'];
    adminButtons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = 'none';
    });
  }
  
  // Disabilita Show Summary finché non viene calcolato il totale
  const btnShowSummary = document.getElementById('btnShowSummary');
  if (btnShowSummary) {
    btnShowSummary.disabled = true;
    btnShowSummary.style.opacity = '0.5';
    btnShowSummary.style.cursor = 'not-allowed';
  }
}

function moveItem(index, direction) {
  const newIndex = index + direction;
  
  if (newIndex < 0 || newIndex >= equipment.length) {
    return; // Già alla prima o ultima posizione
  }
  
  // Swap items
  const temp = equipment[index];
  equipment[index] = equipment[newIndex];
  equipment[newIndex] = temp;
  
  localStorage.setItem('equipmentData', JSON.stringify(equipment));
  renderTable();
  calculateTotal();
}

// Drag & Drop
let draggedIndex = null;

function dragStart(event, index) {
  draggedIndex = index;
  event.dataTransfer.effectAllowed = 'move';
  event.target.style.opacity = '0.4';
}

function dragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  return false;
}

function drop(event, dropIndex) {
  event.preventDefault();
  event.stopPropagation();
  
  if (draggedIndex === null || draggedIndex === dropIndex) {
    return;
  }
  
  // Rimuovi l'elemento dalla posizione originale e inseriscilo nella nuova
  const draggedItem = equipment[draggedIndex];
  equipment.splice(draggedIndex, 1);
  
  // Aggiusta l'indice se necessario
  const newIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
  equipment.splice(newIndex, 0, draggedItem);
  
  localStorage.setItem('equipmentData', JSON.stringify(equipment));
  draggedIndex = null;
  
  renderTable();
  calculateTotal();
}

function changeQty(index, delta) {
  const input = document.getElementById(`qty-${index}`);
  const maxQty = parseInt(input.getAttribute('max'));
  let value = parseInt(input.value) || 0;
  const newValue = value + delta;
  
  if (newValue > maxQty) {
    showMaxQuantityTooltip(input, maxQty);
    return;
  }
  
  value = Math.max(0, newValue);
  input.value = value;
  calculateTotal();
}

function handleQuantityInput(input, maxQty) {
  const value = parseInt(input.value);
  
  if (value > maxQty) {
    input.value = maxQty;
    showMaxQuantityTooltip(input, maxQty);
  }
}

function showMaxQuantityTooltip(input, maxQty) {
  // Rimuovi tooltip esistente se presente
  const existingTooltip = document.querySelector('.max-qty-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
  
  // Feedback rosso sul pulsante +
  const qtyControls = input.parentElement;
  const plusButton = qtyControls.querySelector('button:last-child');
  if (plusButton) {
    plusButton.style.color = '#ff3b30';
    plusButton.style.transform = 'scale(1.3)';
    setTimeout(() => {
      plusButton.style.color = '';
      plusButton.style.transform = '';
    }, 400);
  }
  
  const tooltip = document.createElement('div');
  tooltip.className = 'max-qty-tooltip';
  tooltip.textContent = 'Max number possible selected';
  
  const isDark = document.body.classList.contains('dark');
  tooltip.style.cssText = `
    position: fixed;
    background: ${isDark ? '#2d2d2d' : '#86868b'};
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 2000;
    pointer-events: none;
    box-shadow: 0 2px 12px rgba(0,0,0,0.25);
    animation: fadeInOut 2s ease-in-out;
  `;
  
  // Posiziona il tooltip a destra dell'input, più vicino al pulsante +
  const rect = input.parentElement.getBoundingClientRect();
  tooltip.style.left = `${rect.right + 10}px`;
  tooltip.style.top = `${rect.top + (rect.height / 2) - 15}px`;
  
  document.body.appendChild(tooltip);
  
  // Rimuovi dopo 2 secondi
  setTimeout(() => {
    tooltip.remove();
  }, 2000);
}


function applyDiscount() {
  const input = document.getElementById('discount').value;
  const discountPercent = parseFloat(input);
  if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    discountMultiplier = 1;
  } else {
    discountMultiplier = 1 - (discountPercent / 100);
  }
  renderTable();
}

function calculateTotal() {
  let total = 0;
  equipment.forEach((item, index) => {
    const qty = parseInt(document.getElementById(`qty-${index}`).value) || 0;
    total += qty * item.price * discountMultiplier;
  });
  document.getElementById('totalPrice').textContent = `Totale: ${currencyFormatter.format(total)}`;
  
  // Abilita/disabilita Show Summary in base ai dati compilati e al totale
  const btnShowSummary = document.getElementById('btnShowSummary');
  if (btnShowSummary) {
    const name = document.getElementById('userName').value.trim();
    const location = document.getElementById('eventLocation').value.trim();
    const date = document.getElementById('eventDate').value.trim();
    
    // Abilita solo se ci sono tutti i dati e almeno un item selezionato
    if (total > 0 && name && location && date) {
      btnShowSummary.disabled = false;
      btnShowSummary.style.opacity = '1';
      btnShowSummary.style.cursor = 'pointer';
    } else {
      btnShowSummary.disabled = true;
      btnShowSummary.style.opacity = '0.5';
      btnShowSummary.style.cursor = 'not-allowed';
    }
  }
}

/*
function showSummaryModal() {
  const name = document.getElementById('userName').value.trim();
  const location = document.getElementById('eventLocation').value.trim();
  const date = document.getElementById('eventDate').value.trim();
  const totalText = document.getElementById('totalPrice').textContent;

  if (!name || !location || !date || totalText === 'Totale: €0') {
    alert('Inserisci nome, luogo, data e calcola il totale prima di generare il riepilogo.');
    return;
  }

  let html = `<div style="font-family: sans-serif; padding: 1em; font-size: 14px;">
    <h3>Riepilogo preventivo</h3>
    <p><strong>Nome:</strong> ${name}<br>
    <strong>Luogo:</strong> ${location}<br>
    <strong>Data:</strong> ${date}</p>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="border: 1px solid #ccc; padding: 4px;">Nome</th>
          <th style="border: 1px solid #ccc; padding: 4px;">Descrizione</th>
          <th style="border: 1px solid #ccc; padding: 4px;">Quantità</th>
          <th style="border: 1px solid #ccc; padding: 4px;">Totale</th>
        </tr>
      </thead>
      <tbody>`;

  equipment.forEach((item, index) => {
    const qty = parseInt(document.getElementById(`qty-${index}`).value) || 0;
    if (qty > 0) {
      html += `<tr>
        <td style="border: 1px solid #ccc; padding: 4px;">${item.name}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${item.description1 || ''}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">${qty}</td>
        <td style="border: 1px solid #ccc; padding: 4px;">€ ${(qty * item.price * discountMultiplier).toFixed(2)}</td>
      </tr>`;
    }
  });

  html += `</tbody></table>
    <p style="margin-top: 10px; text-align: right;"><strong>${totalText}</strong></p>
  </div>`;

  const summaryWindow = window.open('', '_blank', 'width=800,height=600');
  summaryWindow.document.write(`<!DOCTYPE html><html><head><title>Riepilogo</title></head><body>${html}</body></html>`);
  summaryWindow.document.close();
}
*/

function showSummaryModal() {
  const name = document.getElementById('userName').value.trim();
  const location = document.getElementById('eventLocation').value.trim();
  const date = document.getElementById('eventDate').value.trim();
  const totalText = document.getElementById('totalPrice').textContent;

  if (!name || !location || !date || totalText.includes('0,00')) {
    alert('Please enter name, location, date and calculate the total before generating the summary.');
    return;
  }

  const summaryWindow = window.open('', '_blank', 'width=900,height=800');
  const currentDate = new Date().toLocaleDateString('en-GB');
  
  summaryWindow.document.write(`<!DOCTYPE html>
    <html>
    <head>
      <title>Equipment Rental Quote</title>
      <meta charset="UTF-8">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <style>
        @media print {
          body { margin: 0; padding: 20px; }
          button { display: none; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          line-height: 1.4;
          color: #1d1d1f;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px 20px;
          background: #ffffff;
        }
        .header {
          border-bottom: 2px solid #007AFF;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          color: #1d1d1f;
        }
        .header .subtitle {
          color: #86868b;
          font-size: 12px;
          margin-top: 4px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px;
          background: #f5f5f7;
          border-radius: 6px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #86868b;
          font-weight: 600;
          margin-bottom: 3px;
        }
        .info-value {
          font-size: 13px;
          color: #1d1d1f;
          font-weight: 500;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 12px;
        }
        thead {
          background: #f5f5f7;
        }
        th {
          text-align: left;
          padding: 8px 10px;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #1d1d1f;
          border-bottom: 2px solid #d2d2d7;
        }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #f5f5f7;
        }
        tbody tr:hover {
          background: #fafafa;
        }
        .item-name {
          font-weight: 500;
          color: #1d1d1f;
        }
        .item-desc {
          font-size: 10px;
          color: #86868b;
          margin-top: 2px;
        }
        .qty {
          text-align: center;
          font-weight: 600;
        }
        .price {
          text-align: right;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }
        .total-section {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 2px solid #d2d2d7;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }
        .total-label {
          font-size: 14px;
          font-weight: 600;
          color: #1d1d1f;
        }
        .total-value {
          font-size: 18px;
          font-weight: 700;
          color: #007AFF;
          font-variant-numeric: tabular-nums;
        }
        .footer {
          margin-top: 30px;
          padding-top: 16px;
          border-top: 1px solid #d2d2d7;
          font-size: 10px;
          color: #86868b;
          text-align: center;
        }
        .actions {
          margin: 20px 0;
          text-align: center;
        }
        button {
          background: #007AFF;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin: 0 8px;
        }
        button:hover {
          background: #0051D5;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
        }
      </style>
    </head>
    <body>
      <div id="summaryContent">
        <div class="header">
          <h1>Equipment Rental Quote</h1>
          <div class="subtitle">Professional Audio & Lighting Equipment</div>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Client Name</div>
            <div class="info-value" id="nameSpan"></div>
          </div>
          <div class="info-item">
            <div class="info-label">Quote Date</div>
            <div class="info-value">${currentDate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Event Location</div>
            <div class="info-value" id="locationSpan"></div>
          </div>
          <div class="info-item">
            <div class="info-label">Event Date</div>
            <div class="info-value" id="dateSpan"></div>
          </div>
        </div>
        
        <table id="itemsTable">
          <thead>
            <tr>
              <th style="width: 40%;">Equipment</th>
              <th style="width: 35%;">Specifications</th>
              <th style="width: 10%;">Qty</th>
              <th style="width: 15%;">Subtotal</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        
        <div class="total-section">
          <div class="total-row">
            <div class="total-label">Subtotal</div>
            <div class="total-value" id="subtotalPara"></div>
          </div>
          <div class="total-row" id="discountRow" style="display: none;">
            <div class="total-label" style="font-size: 14px; color: #86868b;">Discount <span id="discountPercent"></span></div>
            <div class="total-value" style="font-size: 18px; color: #86868b;" id="discountAmount"></div>
          </div>
          <div class="total-row" style="border-top: 2px solid #007AFF; padding-top: 20px; margin-top: 12px;">
            <div class="total-label">Total Amount</div>
            <div class="total-value" id="totalPara"></div>
          </div>
        </div>
        
        <div class="footer">
          <p>This quote is valid for 30 days from the date of issue.</p>
          <p>All prices are in EUR and exclude taxes unless otherwise stated.</p>
        </div>
      </div>
      
      <div class="actions">
        <button onclick="window.print()">Print Quote</button>
        <button onclick="generatePDF()">Save as PDF</button>
      </div>
      
      <script>
        function generatePDF() {
          const element = document.getElementById('summaryContent');
          const opt = {
            margin: 5,
            filename: 'quote_${date.replace(/\//g, '-')}.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          html2pdf().set(opt).from(element).save();
        }
      </script>
    </body></html>`);
  summaryWindow.document.close();
  
  summaryWindow.document.getElementById('nameSpan').textContent = name;
  summaryWindow.document.getElementById('locationSpan').textContent = location;
  summaryWindow.document.getElementById('dateSpan').textContent = date;
  
  const tbody = summaryWindow.document.querySelector('#itemsTable tbody');
  
  let subtotal = 0;

  equipment.forEach((item, index) => {
    const qty = parseInt(document.getElementById(`qty-${index}`).value) || 0;
    if (qty > 0) {
      subtotal += qty * item.price;
      
      const row = summaryWindow.document.createElement('tr');
      
      const cellName = summaryWindow.document.createElement('td');
      cellName.innerHTML = `<div class="item-name">${item.name}</div>`;
      
      const cellDesc = summaryWindow.document.createElement('td');
      cellDesc.innerHTML = `<div class="item-desc">${item.description1 || '-'}</div>`;
      
      const cellQty = summaryWindow.document.createElement('td');
      cellQty.className = 'qty';
      cellQty.textContent = qty;
      
      const cellTotal = summaryWindow.document.createElement('td');
      cellTotal.className = 'price';
      cellTotal.textContent = currencyFormatter.format(qty * item.price);
      
      row.appendChild(cellName);
      row.appendChild(cellDesc);
      row.appendChild(cellQty);
      row.appendChild(cellTotal);
      tbody.appendChild(row);
    }
  });
  
  // Calcola sconto e totale
  const discountPercent = parseFloat(document.getElementById('discount').value) || 0;
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal - discountAmount;
  
  // Popola i valori
  summaryWindow.document.getElementById('subtotalPara').textContent = currencyFormatter.format(subtotal);
  summaryWindow.document.getElementById('totalPara').textContent = currencyFormatter.format(total);
  
  // Mostra la riga sconto solo se > 0
  if (discountPercent > 0) {
    summaryWindow.document.getElementById('discountRow').style.display = 'flex';
    summaryWindow.document.getElementById('discountPercent').textContent = `(${discountPercent}%)`;
    summaryWindow.document.getElementById('discountAmount').textContent = '- ' + currencyFormatter.format(discountAmount);
  }
}


function resetForm() {
  document.getElementById('discount').value = '';
  document.getElementById('userName').value = '';
  document.getElementById('eventLocation').value = '';
  document.getElementById('eventDate').value = '';
  discountMultiplier = 1;
  renderTable();
  document.getElementById('totalPrice').textContent = 'Total: €0';
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  document.body.classList.toggle('dark', !isLight);
  const button = document.getElementById('themeButton');
  button.textContent = 'Theme';
}

document.addEventListener('DOMContentLoaded', () => {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isLight = !prefersDark;
  document.body.classList.add(isLight ? 'light' : 'dark');
  const button = document.getElementById('themeButton');
  button.textContent = 'Theme';
});

// Controllo quantità massima
function handleQuantityInput(input, maxQty) {
  const value = parseInt(input.value);
  
  if (value > maxQty) {
    input.value = maxQty;
    showMaxQuantityTooltip(input, maxQty);
  }
}

function showMaxQuantityTooltip(input, maxQty) {
  // Rimuovi tooltip esistente se presente
  const existingTooltip = document.querySelector('.max-qty-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
  
  // Feedback rosso sul pulsante +
  const qtyControls = input.parentElement;
  const plusButton = qtyControls.querySelector('button:last-child');
  if (plusButton) {
    plusButton.style.color = '#ff3b30';
    plusButton.style.transform = 'scale(1.3)';
    setTimeout(() => {
      plusButton.style.color = '';
      plusButton.style.transform = '';
    }, 400);
  }
  
  const tooltip = document.createElement('div');
  tooltip.className = 'max-qty-tooltip';
  tooltip.textContent = 'Max number possible selected';
  
  const isDark = document.body.classList.contains('dark');
  tooltip.style.cssText = `
    position: fixed;
    background: ${isDark ? '#2d2d2d' : '#86868b'};
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 2000;
    pointer-events: none;
    box-shadow: 0 2px 12px rgba(0,0,0,0.25);
    animation: fadeInOut 2s ease-in-out;
  `;
  
  // Posiziona il tooltip a destra dell'input, più vicino al pulsante +
  const rect = input.parentElement.getBoundingClientRect();
  tooltip.style.left = `${rect.right + 10}px`;
  tooltip.style.top = `${rect.top + (rect.height / 2) - 15}px`;
  
  document.body.appendChild(tooltip);
  
  // Rimuovi dopo 2 secondi
  setTimeout(() => {
    tooltip.remove();
  }, 2000);
}

// Funzioni di editing lowcode
function openBulkEditModal() {
  const modal = document.createElement('div');
  modal.id = 'bulkEditModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${document.body.classList.contains('dark') ? '#0d0d0d' : '#f5f5f7'};
    z-index: 3000;
    overflow: auto;
    padding: 20px;
  `;
  
  const categories = ['Speakers', 'Subwoofers', 'Lights', 'Stands and Supports', 'Special Effects', 'Consoles & Mixers'];
  
  let html = `
    <div style="max-width: 1400px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>Bulk Edit - All Items</h2>
        <div>
          <button onclick="saveBulkEdit()" style="margin-right: 10px;">Save All Changes</button>
          <button onclick="closeBulkEditModal()" style="background: #ff3b30;">Cancel</button>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table id="bulkEditTable" style="width: 100%; min-width: 1200px; font-size: 13px;">
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th style="width: 200px;">Name</th>
              <th style="width: 150px;">Category</th>
              <th style="width: 250px;">Technical Details</th>
              <th style="width: 100px;">Price (€)</th>
              <th style="width: 80px;">Max Qty</th>
              <th style="width: 200px;">Image URL</th>
              <th style="width: 60px;">Action</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  equipment.forEach((item, index) => {
    html += `
      <tr id="bulk-row-${index}">
        <td style="text-align: center; color: #86868b;">${index + 1}</td>
        <td><input type="text" id="bulk-name-${index}" value="${item.name}" style="width: 100%; padding: 6px; font-size: 13px;"></td>
        <td>
          <select id="bulk-category-${index}" style="width: 100%; padding: 6px; font-size: 13px;">
            ${categories.map(cat => `<option value="${cat}" ${item.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
          </select>
        </td>
        <td><input type="text" id="bulk-desc-${index}" value="${item.description1 || ''}" style="width: 100%; padding: 6px; font-size: 13px;"></td>
        <td><input type="number" id="bulk-price-${index}" value="${item.price}" step="0.01" min="0" style="width: 100%; padding: 6px; font-size: 13px;"></td>
        <td><input type="number" id="bulk-maxqty-${index}" value="${item.maxQty}" min="1" style="width: 100%; padding: 6px; font-size: 13px;"></td>
        <td><input type="url" id="bulk-image-${index}" value="${item.imageUrl || ''}" style="width: 100%; padding: 6px; font-size: 13px;"></td>
        <td style="text-align: center;"><button onclick="deleteBulkRow(${index})" style="padding: 4px 8px; font-size: 12px; background: #ff3b30;">Del</button></td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </div>
      <div style="margin-top: 20px;">
        <button onclick="addBulkRow()" style="background: #34c759;">+ Add Row</button>
      </div>
    </div>
  `;
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
}

function closeBulkEditModal() {
  const modal = document.getElementById('bulkEditModal');
  if (modal && confirm('Close without saving? All changes will be lost.')) {
    modal.remove();
  }
}

function saveBulkEdit() {
  const newEquipment = [];
  
  for (let i = 0; i < equipment.length; i++) {
    const row = document.getElementById(`bulk-row-${i}`);
    if (!row) continue; // Row was deleted
    
    const name = document.getElementById(`bulk-name-${i}`).value.trim();
    const category = document.getElementById(`bulk-category-${i}`).value;
    const description1 = document.getElementById(`bulk-desc-${i}`).value.trim();
    const price = parseFloat(document.getElementById(`bulk-price-${i}`).value);
    const maxQty = parseInt(document.getElementById(`bulk-maxqty-${i}`).value);
    const imageUrl = document.getElementById(`bulk-image-${i}`).value.trim();
    
    if (!name || isNaN(price) || price < 0 || isNaN(maxQty) || maxQty < 1) {
      alert(`Row ${i + 1}: Please enter valid values for all required fields.`);
      return;
    }
    
    newEquipment.push({
      name,
      category,
      description1,
      price,
      maxQty,
      imageUrl,
      description2: equipment[i].description2 || ''
    });
  }
  
  equipment = newEquipment;
  localStorage.setItem('equipmentData', JSON.stringify(equipment));
  
  const modal = document.getElementById('bulkEditModal');
  if (modal) modal.remove();
  
  renderTable();
  calculateTotal();
  alert('All changes saved successfully!');
}

function deleteBulkRow(index) {
  if (confirm('Delete this row?')) {
    const row = document.getElementById(`bulk-row-${index}`);
    if (row) row.remove();
  }
}

function addBulkRow() {
  const tbody = document.querySelector('#bulkEditTable tbody');
  const newIndex = equipment.length;
  const categories = ['Speakers', 'Subwoofers', 'Lights', 'Stands and Supports', 'Special Effects', 'Consoles & Mixers'];
  
  const row = document.createElement('tr');
  row.id = `bulk-row-${newIndex}`;
  row.innerHTML = `
    <td style="text-align: center; color: #86868b;">NEW</td>
    <td><input type="text" id="bulk-name-${newIndex}" placeholder="Item name" style="width: 100%; padding: 6px; font-size: 13px;"></td>
    <td>
      <select id="bulk-category-${newIndex}" style="width: 100%; padding: 6px; font-size: 13px;">
        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
      </select>
    </td>
    <td><input type="text" id="bulk-desc-${newIndex}" placeholder="Tech details" style="width: 100%; padding: 6px; font-size: 13px;"></td>
    <td><input type="number" id="bulk-price-${newIndex}" value="0" step="0.01" min="0" style="width: 100%; padding: 6px; font-size: 13px;"></td>
    <td><input type="number" id="bulk-maxqty-${newIndex}" value="1" min="1" style="width: 100%; padding: 6px; font-size: 13px;"></td>
    <td><input type="url" id="bulk-image-${newIndex}" placeholder="https://..." style="width: 100%; padding: 6px; font-size: 13px;"></td>
    <td style="text-align: center;"><button onclick="deleteBulkRow(${newIndex})" style="padding: 4px 8px; font-size: 12px; background: #ff3b30;">Del</button></td>
  `;
  
  tbody.appendChild(row);
  
  // Add to equipment array temporarily
  equipment.push({
    name: '',
    category: categories[0],
    description1: '',
    price: 0,
    maxQty: 1,
    imageUrl: '',
    description2: ''
  });
}

function openAddItemModal() {
  const categories = ['Speakers', 'Subwoofers', 'Lights', 'Stands and Supports', 'Special Effects', 'Consoles & Mixers'];
  
  const modal = document.createElement('div');
  modal.id = 'editModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: ${document.body.classList.contains('dark') ? '#1a1a1a' : '#fff'};
    color: ${document.body.classList.contains('dark') ? '#fff' : '#000'};
    padding: 30px;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  `;
  
  modalContent.innerHTML = `
    <h3>Add New Item</h3>
    <label>Name:</label><br>
    <input type="text" id="newName" placeholder="Item name" style="width: 100%; margin-bottom: 10px;"><br>
    
    <label>Category:</label><br>
    <select id="newCategory" style="width: 100%; margin-bottom: 10px;">
      ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
    </select><br>
    
    <label>Technical details (optional):</label><br>
    <input type="text" id="newDescription" placeholder="Specs, power, model..." style="width: 100%; margin-bottom: 10px;"><br>
    
    <label>Base price (€):</label><br>
    <input type="number" id="newPrice" value="0" step="0.01" min="0" style="width: 100%; margin-bottom: 10px;"><br>
    
    <label>Max quantity:</label><br>
    <input type="number" id="newMaxQty" value="1" min="1" style="width: 100%; margin-bottom: 10px;"><br>
    
    <label>Image URLs (one per line, optional):</label><br>
    <textarea id="newImageUrls" placeholder="images/photo1.jpg\nimages/photo2.jpg\nhttps://..." style="width: 100%; margin-bottom: 10px; min-height: 60px; font-family: inherit; padding: 8px; border-radius: 6px;"></textarea><br>
    
    <label>Position (1-${equipment.length + 1}):</label><br>
    <input type="number" id="newPosition" value="${equipment.length + 1}" min="1" max="${equipment.length + 1}" style="width: 100%; margin-bottom: 20px;">
    <small style="color: #666;">1 = start, ${equipment.length + 1} = end</small>
    
    <div style="display: flex; gap: 10px; margin-top: 20px;">
      <button onclick="addNewItem()" style="flex: 1;">Add</button>
      <button onclick="closeEditModal()" style="flex: 1; background: #f5f5f7; color: #1d1d1f;">Cancel</button>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  modal.onclick = (e) => {
    if (e.target === modal) closeEditModal();
  };
}

function openEditModal(index) {
  const item = equipment[index];
  const categories = ['Speakers', 'Subwoofers', 'Lights', 'Stands and Supports', 'Special Effects', 'Consoles & Mixers'];
  
  const modal = document.createElement('div');
  modal.id = 'editModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: ${document.body.classList.contains('dark') ? '#1a1a1a' : '#fff'};
    color: ${document.body.classList.contains('dark') ? '#fff' : '#000'};
    padding: 30px;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
  `;
  
  modalContent.innerHTML = `
    <h3>Edit Item #${index + 1}</h3>
    <label>Name:</label><br>
    <input type="text" id="editName" value="${item.name}" style="width: 100%; margin-bottom: 10px;"><br>
    
    <label>Category:</label><br>
    <select id="editCategory" style="width: 100%; margin-bottom: 10px;">
      ${categories.map(cat => `<option value="${cat}" ${item.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
    </select><br>
    
    <label>Technical details (optional):</label><br>
    <input type="text" id="editDescription" value="${item.description1 || ''}" placeholder="Specs, power, model..." style="width: 100%; margin-bottom: 10px;"><br>
    
    <label>Base price (€):</label><br>
    <input type="number" id="editPrice" value="${item.price}" step="0.01" min="0" style="width: 100%; margin-bottom: 10px;"><br>
    
    <label>Max quantity:</label><br>
    <input type="number" id="editMaxQty" value="${item.maxQty}" min="1" style="width: 100%; margin-bottom: 10px;"><br>
    
    <label>Image URLs (one per line, optional):</label><br>
    <textarea id="editImageUrls" placeholder="images/photo1.jpg\nimages/photo2.jpg\nhttps://..." style="width: 100%; margin-bottom: 20px; min-height: 60px; font-family: inherit; padding: 8px; border-radius: 6px;">${(item.imageUrls || (item.imageUrl ? [item.imageUrl] : [])).join('\n')}</textarea>
    
    <div style="display: flex; gap: 10px; margin-top: 20px;">
      <button onclick="saveEdit(${index})" style="flex: 1;">Save</button>
      <button onclick="closeEditModal()" style="flex: 1; background: #f5f5f7; color: #1d1d1f;">Cancel</button>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  modal.onclick = (e) => {
    if (e.target === modal) closeEditModal();
  };
}

function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (modal) modal.remove();
}

function addNewItem() {
  const name = document.getElementById('newName').value.trim();
  const category = document.getElementById('newCategory').value;
  const description = document.getElementById('newDescription').value.trim();
  const price = parseFloat(document.getElementById('newPrice').value);
  const maxQty = parseInt(document.getElementById('newMaxQty').value);
  const imageUrlsText = document.getElementById('newImageUrls').value.trim();
  const imageUrls = imageUrlsText ? imageUrlsText.split('\n').map(url => url.trim()).filter(url => url !== '') : [];
  const position = parseInt(document.getElementById('newPosition').value);
  
  if (!name || isNaN(price) || price < 0 || isNaN(maxQty) || maxQty < 1) {
    alert('Please enter valid values for all required fields.');
    return;
  }
  
  if (isNaN(position) || position < 1 || position > equipment.length + 1) {
    alert(`Position must be between 1 and ${equipment.length + 1}.`);
    return;
  }
  
  const newItem = {
    name: name,
    category: category,
    description1: description,
    price: price,
    maxQty: maxQty,
    imageUrls: imageUrls,
    description2: ''
  };
  
  // Inserisci nella posizione specificata (position-1 perché array è 0-based)
  equipment.splice(position - 1, 0, newItem);
  
  // Salva in localStorage
  localStorage.setItem('equipmentData', JSON.stringify(equipment));
  
  closeEditModal();
  renderTable();
}

function saveEdit(index) {
  const name = document.getElementById('editName').value.trim();
  const category = document.getElementById('editCategory').value;
  const description = document.getElementById('editDescription').value.trim();
  const price = parseFloat(document.getElementById('editPrice').value);
  const maxQty = parseInt(document.getElementById('editMaxQty').value);
  const imageUrlsText = document.getElementById('editImageUrls').value.trim();
  const imageUrls = imageUrlsText ? imageUrlsText.split('\n').map(url => url.trim()).filter(url => url !== '') : [];
  
  if (!name || isNaN(price) || price < 0 || isNaN(maxQty) || maxQty < 1) {
    alert('Please enter valid name, price, and max quantity.');
    return;
  }
  
  equipment[index].name = name;
  equipment[index].category = category;
  equipment[index].description1 = description;
  equipment[index].price = price;
  equipment[index].maxQty = maxQty;
  equipment[index].imageUrls = imageUrls;
  
  // Salva in localStorage
  localStorage.setItem('equipmentData', JSON.stringify(equipment));
  
  closeEditModal();
  renderTable();
  calculateTotal();
}

// Funzione per ripristinare i dati originali
function resetToOriginal() {
  if (confirm('Do you want to reset all data to original? All changes will be lost.')) {
    localStorage.removeItem('equipmentData');
    location.reload();
  }
}

// Funzione per esportare il JSON modificato
function exportJSON() {
  const dataStr = JSON.stringify(equipment, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'data.json';
  link.click();
  URL.revokeObjectURL(url);
}

// Funzione per visualizzare immagine
function showImageGallery(index) {
  const item = equipment[index];
  const imageUrls = item.imageUrls || (item.imageUrl ? [item.imageUrl] : []);
  
  if (imageUrls.length === 0 || imageUrls[0].trim() === '') {
    alert('No images available for this item.');
    return;
  }
  
  let currentImageIndex = 0;
  
  const modal = document.createElement('div');
  modal.id = 'imageModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    cursor: pointer;
  `;
  
  const imgContainer = document.createElement('div');
  imgContainer.style.cssText = `
    width: 700px;
    height: 550px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  `;
  
  const img = document.createElement('img');
  img.className = 'gallery-image';
  img.src = imageUrls[0];
  img.alt = item.name;
  img.style.cssText = `
    width: 100%;
    height: 500px;
    object-fit: contain;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
  `;
  
  const caption = document.createElement('p');
  caption.textContent = item.name;
  caption.style.cssText = `
    color: white;
    margin-top: 16px;
    font-size: 18px;
    font-weight: 500;
  `;
  
  imgContainer.appendChild(img);
  imgContainer.appendChild(caption);
  
  // Aggiungi navigazione se ci sono più immagini
  if (imageUrls.length > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '‹';
    prevBtn.style.cssText = `
      position: absolute;
      left: -60px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: none;
      font-size: 48px;
      padding: 12px 20px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    prevBtn.onmouseover = () => prevBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    prevBtn.onmouseout = () => prevBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      currentImageIndex = (currentImageIndex - 1 + imageUrls.length) % imageUrls.length;
      img.src = imageUrls[currentImageIndex];
      counter.textContent = `${currentImageIndex + 1} / ${imageUrls.length}`;
    };
    
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '›';
    nextBtn.style.cssText = prevBtn.style.cssText.replace('left: -60px', 'right: -60px');
    nextBtn.onmouseover = () => nextBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    nextBtn.onmouseout = () => nextBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    nextBtn.onclick = (e) => {
      e.stopPropagation();
      currentImageIndex = (currentImageIndex + 1) % imageUrls.length;
      img.src = imageUrls[currentImageIndex];
      counter.textContent = `${currentImageIndex + 1} / ${imageUrls.length}`;
    };
    
    const counter = document.createElement('div');
    counter.textContent = `1 / ${imageUrls.length}`;
    counter.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    `;
    
    imgContainer.appendChild(prevBtn);
    imgContainer.appendChild(nextBtn);
    imgContainer.appendChild(counter);
  }
  
  modal.appendChild(imgContainer);
  document.body.appendChild(modal);
  
  modal.onclick = () => modal.remove();
}

// Toggle categoria espansa/compressa
function toggleCategory(categoryId) {
  const content = document.getElementById(`category-${categoryId}`);
  const toggle = document.getElementById(`toggle-${categoryId}`);
  const section = document.querySelector(`[data-category="${categoryId}"]`);
  
  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    toggle.textContent = '▼';
    section.classList.remove('collapsed');
  } else {
    content.classList.add('collapsed');
    toggle.textContent = '▶';
    section.classList.add('collapsed');
  }
}
