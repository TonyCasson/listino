
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
        <th>Descrizione 1</th>
        <th>Descrizione 2</th>
        <th>Prezzo</th>
        <th>Quantità</th>
      </tr>
    </thead><tbody>`;

  equipment.forEach((item, index) => {
    html += `
      <tr>
        <td>${item.name}</td>
        <td>${item.description1}</td>
        <td>${item.description2}</td>
        <td>€ <span id="price-${index}">${(item.price * discountMultiplier).toFixed(2)}</span></td>
        <td>
          <input type="number" id="qty-${index}" min="0" max="${item.maxQty}" value="0" />
        </td>
      </tr>`;
  });

  html += `</tbody></table>`;
  tableDiv.innerHTML = html;
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

function generatePDF() {
  const element = document.querySelector('.container');
  html2pdf().from(element).save('preventivo.pdf');
}

function resetForm() {
  document.getElementById('discount').value = '';
  document.getElementById('userName').value = '';
  document.getElementById('eventLocation').value = '';
  document.getElementById('eventDate').value = '';
  discountMultiplier = 1;
  renderTable();
  document.getElementById('totalPrice').textContent = 'Totale: €0';
}

document.body.classList.add('dark');

function toggleTheme() {
  const isChecked = document.getElementById('themeSwitch').checked;
  document.body.classList.toggle('light', isChecked);
  document.body.classList.toggle('dark', !isChecked);
}
