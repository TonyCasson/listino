let equipment = [];
let discountMultiplier = 1;

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    equipment = data;
    renderTable();
  });

function renderTable() {
  const tableDiv = document.getElementById('equipmentTable');
  let html = `<table>
    <thead>
      <tr>
        <th>Nome</th>
        <th>Descrizione</th>
        <th>Prezzo</th>
        <th>Quantità</th>
      </tr>
    </thead><tbody>`;

  equipment.forEach((item, index) => {
    html += `
      <tr>
        <td>${item.name}</td>
        <td>${item.description1 || ''}</td>
        <td>€ <span id="price-${index}">${(item.price * discountMultiplier).toFixed(2)}</span></td>
 <td>
  <div class="qty-controls">
    <button onclick="changeQty(${index}, -1)">−</button>
    <input type="number" id="qty-${index}" min="0" max="${item.maxQty}" value="0" />
    <button onclick="changeQty(${index}, 1)">+</button>
  </div>
</td>

      </tr>`;
  });

  html += `</tbody></table>`;
  tableDiv.innerHTML = html;
}

function changeQty(index, delta) {
  const input = document.getElementById(`qty-${index}`);
  let value = parseInt(input.value) || 0;
  value = Math.max(0, value + delta);
  input.value = value;
  calculateTotal(); // opzionale: aggiorna il totale in tempo reale
}


function applyDiscount() {
  const input = document.getElementById('discount').value;
  discountMultiplier = parseFloat(input) || 1;
  renderTable();
}

function calculateTotal() {
  let total = 0;
  equipment.forEach((item, index) => {
    const qty = parseInt(document.getElementById(`qty-${index}`).value) || 0;
    total += qty * item.price * discountMultiplier;
  });
  document.getElementById('totalPrice').textContent = `Totale: €${total.toFixed(2)}`;
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

  if (!name || !location || !date || totalText === 'Totale: €0') {
    alert('Inserisci nome, luogo, data e calcola il totale prima di generare il riepilogo.');
    return;
  }

  let html = `<div id="summaryContent" style="font-family: sans-serif; padding: 1em; font-size: 14px;">
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
    <button onclick="generatePDF()">📄 Esporta PDF</button>
  </div>`;

  const summaryWindow = window.open('', '_blank', 'width=800,height=600');
  summaryWindow.document.write(`<!DOCTYPE html>
    <html>
    <head>
      <title>Riepilogo</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    </head>
    <body>${html}
    <script>
      function generatePDF() {
        const element = document.getElementById('summaryContent');
        html2pdf().from(element).save('riepilogo.pdf');
      }
    </script>
    </body></html>`);
  summaryWindow.document.close();
}


function resetForm() {
  document.getElementById('discount').value = '';
  document.getElementById('userName').value = '';
  document.getElementById('eventLocation').value = '';
  document.getElementById('eventDate').value = '';
  discountMultiplier = 1;
  renderTable();
  document.getElementById('totalPrice').textContent = 'Totale: €0';
  document.getElementById('themeSwitch').checked = false;
  document.body.classList.remove('light');
  document.body.classList.add('dark');
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  document.body.classList.toggle('dark', !isLight);
  const button = document.getElementById('themeButton');
  button.textContent = isLight ? '🌕' : '🌑';
}

document.addEventListener('DOMContentLoaded', () => {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isLight = !prefersDark;
  document.body.classList.add(isLight ? 'light' : 'dark');
  const button = document.getElementById('themeButton');
  button.textContent = isLight ? '🌕' : '🌑';
});

