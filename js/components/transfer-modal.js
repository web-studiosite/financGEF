/**
 * GEF - GESTÃO FINANCEIRA | TRANSFER MODAL COMPONENT (INTER-WAREHOUSE)
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../core/database.js';
import { showToast } from './toast.js';

export function openTransferModal(options = {}) {
  const {
    initialProductId = null,
    onSuccess,
    onClose
  } = options;

  const products = db.getProducts();
  if (products.length === 0) {
    showToast('Não há produtos cadastrados para transferir.', 'warning');
    return;
  }

  let selectedProductId = initialProductId || products[0].id;
  let fromLocation = 'ARMAZEM';
  let toLocation = 'LOJA';
  let quantity = 1;
  let notes = '';

  const modalEl = document.createElement('div');
  modalEl.className = 'modal-backdrop';
  modalEl.id = 'active-transfer-modal';

  const render = () => {
    const selectedProd = products.find(p => p.id === selectedProductId) || products[0];
    const stock = selectedProd.stockByLocation || { LOJA: 0, ARMAZEM: 0, PATIO: 0 };
    const availableSource = stock[fromLocation] ?? 0;

    modalEl.innerHTML = `
      <div class="modal-dialog" style="max-width: 480px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
            <h3 class="modal-title">Transferência Interna de Estoque</h3>
          </div>
          <button class="modal-close-btn" id="btn-transfer-close">✕</button>
        </div>

        <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
          <!-- Product Selector -->
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 4px;">Material / Produto:</label>
            <select id="select-transfer-product" style="width: 100%; font-size: 13px; font-weight: 600;">
              ${products.map(p => `
                <option value="${p.id}" ${p.id === selectedProductId ? 'selected' : ''}>
                  [${p.code}] ${p.name} (Saldo Total: ${p.currentStockBase} ${p.baseUnit})
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Current Stock by Location -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #0f172a; padding: 10px; border-radius: 8px; border: 1px solid #334155;">
            <div style="text-align: center;">
              <span style="font-size: 10px; color: #94a3b8; font-weight: 700;">LOJA</span>
              <div style="font-size: 14px; font-weight: 800; color: #fff; font-family: var(--font-mono);">${stock.LOJA ?? 0} ${selectedProd.baseUnit}</div>
            </div>
            <div style="text-align: center;">
              <span style="font-size: 10px; color: #94a3b8; font-weight: 700;">ARMAZÉM</span>
              <div style="font-size: 14px; font-weight: 800; color: #f97316; font-family: var(--font-mono);">${stock.ARMAZEM ?? 0} ${selectedProd.baseUnit}</div>
            </div>
            <div style="text-align: center;">
              <span style="font-size: 10px; color: #94a3b8; font-weight: 700;">PÁTIO</span>
              <div style="font-size: 14px; font-weight: 800; color: #34d399; font-family: var(--font-mono);">${stock.PATIO ?? 0} ${selectedProd.baseUnit}</div>
            </div>
          </div>

          <!-- From & To Locations -->
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Origem (Saída):</label>
              <select id="select-from-loc" style="width: 100%;">
                <option value="ARMAZEM" ${fromLocation === 'ARMAZEM' ? 'selected' : ''}>Armazém</option>
                <option value="LOJA" ${fromLocation === 'LOJA' ? 'selected' : ''}>Loja</option>
                <option value="PATIO" ${fromLocation === 'PATIO' ? 'selected' : ''}>Pátio</option>
              </select>
            </div>

            <div style="color: #ea580c; font-weight: 900; margin-top: 18px;">➔</div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Destino (Entrada):</label>
              <select id="select-to-loc" style="width: 100%;">
                <option value="LOJA" ${toLocation === 'LOJA' ? 'selected' : ''}>Loja</option>
                <option value="ARMAZEM" ${toLocation === 'ARMAZEM' ? 'selected' : ''}>Armazém</option>
                <option value="PATIO" ${toLocation === 'PATIO' ? 'selected' : ''}>Pátio</option>
              </select>
            </div>
          </div>

          <!-- Quantity to transfer -->
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1;">Quantidade a Transferir (${selectedProd.baseUnit}):</label>
              <span style="font-size: 10px; color: ${availableSource >= quantity ? '#10b981' : '#ef4444'}; font-weight: 700;">
                Disponível na Origem: ${availableSource} ${selectedProd.baseUnit}
              </span>
            </div>
            <input 
              type="number" 
              id="input-transfer-qty" 
              min="0.01" 
              step="0.01" 
              max="${availableSource}" 
              value="${quantity}" 
              style="width: 100%; font-size: 18px; font-weight: 800; font-family: var(--font-mono);"
            >
          </div>

          <!-- Notes -->
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 4px;">Justificativa / Observação:</label>
            <input type="text" id="input-transfer-notes" placeholder="Ex: Reposição de gôndola na loja matriz" value="${notes}" style="width: 100%;">
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-transfer-cancel">Cancelar</button>
          <button class="btn btn-primary" id="btn-transfer-confirm">
            <span>Confirmar Transferência</span>
          </button>
        </div>
      </div>
    `;

    modalEl.querySelector('#btn-transfer-close').onclick = () => {
      modalEl.remove();
      if (onClose) onClose();
    };
    modalEl.querySelector('#btn-transfer-cancel').onclick = () => {
      modalEl.remove();
      if (onClose) onClose();
    };

    modalEl.querySelector('#select-transfer-product').onchange = (e) => {
      selectedProductId = e.target.value;
      render();
    };

    modalEl.querySelector('#select-from-loc').onchange = (e) => {
      fromLocation = e.target.value;
      if (fromLocation === toLocation) {
        toLocation = fromLocation === 'LOJA' ? 'ARMAZEM' : 'LOJA';
      }
      render();
    };

    modalEl.querySelector('#select-to-loc').onchange = (e) => {
      toLocation = e.target.value;
      if (fromLocation === toLocation) {
        fromLocation = toLocation === 'LOJA' ? 'ARMAZEM' : 'LOJA';
      }
      render();
    };

    modalEl.querySelector('#input-transfer-qty').oninput = (e) => {
      quantity = parseFloat(e.target.value) || 0;
    };

    modalEl.querySelector('#input-transfer-notes').oninput = (e) => {
      notes = e.target.value;
    };

    modalEl.querySelector('#btn-transfer-confirm').onclick = () => {
      if (quantity <= 0) {
        showToast('A quantidade deve ser maior que zero.', 'error');
        return;
      }
      if (fromLocation === toLocation) {
        showToast('Origem e Destino não podem ser o mesmo local.', 'error');
        return;
      }
      if (quantity > availableSource) {
        showToast(`Saldo insuficiente em ${fromLocation}. Disponível: ${availableSource} ${selectedProd.baseUnit}.`, 'error');
        return;
      }

      const tx = {
        id: 'transf-' + Date.now(),
        productId: selectedProd.id,
        productName: selectedProd.name,
        fromLocation,
        toLocation,
        quantityBase: quantity,
        unit: selectedProd.baseUnit,
        notes,
        timestamp: new Date().toISOString()
      };

      db.saveTransfer(tx);
      showToast(`Transferência de ${quantity} ${selectedProd.baseUnit} de ${fromLocation} para ${toLocation} concluída!`, 'success');
      modalEl.remove();
      if (onSuccess) onSuccess();
    };
  };

  render();
  document.body.appendChild(modalEl);
}
