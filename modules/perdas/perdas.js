/**
 * GEF - GESTÃO FINANCEIRA | PERDAS & AVARIAS DE MATERIAIS
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';

export function initPerdasModule(container) {
  const storeId = db.getCurrentStoreId();
  const products = db.getProducts(storeId);
  const currentUser = auth.getCurrentUser();

  const render = () => {
    const losses = db.getLosses(storeId);
    const totalLossCost = losses.reduce((sum, l) => sum + (l.totalCost || 0), 0);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 20px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">Registro de Perdas & Avarias</h2>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Baixa contábil e física por quebra, saco rasgado, cimento empedrado ou ferrugem com impacto direto no patrimônio real.
            </div>
          </div>
          <button class="btn btn-danger" id="btn-create-loss" style="background: #ef4444; color: #fff;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12"/></svg>
            <span>Apontar Nova Avaria / Perda</span>
          </button>
        </div>

        <!-- Metric Card -->
        <div class="metrics-grid" style="grid-template-columns: 1fr;">
          <div class="card metric-card" style="border-left: 4px solid #ef4444;">
            <span class="metric-title">Custo Total de Avarias Registradas</span>
            <div class="metric-value" style="color: #f87171;">
              ${totalLossCost.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 14px; color: #ef4444;">MT</span>
            </div>
            <div class="metric-sub">${losses.length} apontamentos de perdas no canteiro / depósito</div>
          </div>
        </div>

        <!-- Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Material / Item</th>
                  <th>Quantidade Baixada</th>
                  <th>Custo Unitário</th>
                  <th>Impacto Total</th>
                  <th>Motivo / Justificativa</th>
                  <th>Operador Responsável</th>
                </tr>
              </thead>
              <tbody>
                ${losses.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; color: #64748b; padding: 32px;">
                      Nenhuma avaria ou perda registrada nesta loja.
                    </td>
                  </tr>
                ` : losses.map(l => `
                  <tr>
                    <td>
                      <div style="font-size: 11px; color: #cbd5e1;">${new Date(l.date || l.createdAt).toLocaleDateString('pt-MZ')}</div>
                      <div style="font-size: 10px; color: #94a3b8;">${new Date(l.date || l.createdAt).toLocaleTimeString('pt-MZ')}</div>
                    </td>
                    <td>
                      <div style="font-weight: 700; color: #f8fafc;">${l.productName}</div>
                      <div style="font-size: 10px; color: #94a3b8;">Local: ${l.location || 'ARMAZEM'}</div>
                    </td>
                    <td>
                      <strong style="color: #f87171; font-family: var(--font-mono);">${l.quantity} ${l.unit}</strong>
                    </td>
                    <td style="font-family: var(--font-mono); color: #cbd5e1;">
                      ${(l.costUnit || 0).toFixed(2)} MT
                    </td>
                    <td>
                      <strong style="color: #ef4444; font-family: var(--font-mono); font-size: 13px;">
                        ${(l.totalCost || 0).toFixed(2)} MT
                      </strong>
                    </td>
                    <td>
                      <span class="badge badge-red">${l.reason}</span>
                      ${l.notes ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${l.notes}</div>` : ''}
                    </td>
                    <td style="font-size: 11px; color: #cbd5e1;">
                      ${l.userName || 'Admin'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Create loss modal
    container.querySelector('#btn-create-loss').onclick = () => {
      openRegisterLossModal(() => render());
    };
  };

  const openRegisterLossModal = (onSuccess) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 480px;">
        <div class="modal-header" style="border-bottom-color: rgba(239, 68, 68, 0.4);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
            <h3 class="modal-title" style="color: #fca5a5;">Apontamento de Avaria / Baixa de Estoque</h3>
          </div>
          <button class="modal-close-btn" id="btn-close-lmodal">✕</button>
        </div>

        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Material Avariado:</label>
            <select id="sel-loss-prod" style="width: 100%;">
              ${products.map(p => `<option value="${p.id}" data-cost="${p.costPriceBase}" data-unit="${p.baseUnit}" data-stock="${p.currentStockBase}">[${p.code}] ${p.name} (Estoque: ${p.currentStockBase} ${p.baseUnit})</option>`).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Quantidade Perdida:</label>
              <input type="number" min="0.01" step="any" id="inp-loss-qty" value="1" style="width: 100%;">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Localização Física:</label>
              <select id="sel-loss-loc" style="width: 100%;">
                <option value="LOJA">Loja (Balcão)</option>
                <option value="ARMAZEM" selected>Armazém Central</option>
                <option value="PATIO">Pátio de Agregados</option>
              </select>
            </div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Motivo da Baixa:</label>
            <select id="sel-loss-reason" style="width: 100%;">
              <option value="Saco Rasgado / Avaria de Transporte">Saco Rasgado / Avaria de Transporte</option>
              <option value="Material Empedrado / Vencido">Material Empedrado / Vencido</option>
              <option value="Quebra / Dano Físico">Quebra / Dano Físico</option>
              <option value="Oxidação / Ferrugem de Aço">Oxidação / Ferrugem de Aço</option>
              <option value="Ajuste de Inventário / Divergência">Ajuste de Inventário / Divergência</option>
              <option value="Furto / Desvio">Furto / Desvio</option>
            </select>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Observações / Detalhes:</label>
            <input type="text" id="inp-loss-notes" placeholder="Ex: Chuva infiltrou na lateral da carreta durante o descarrego" style="width: 100%;">
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-lmodal">Cancelar</button>
          <button class="btn btn-danger" id="btn-confirm-loss">
            Efetivar Baixa de Estoque
          </button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-lmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-lmodal').onclick = () => modal.remove();

    modal.querySelector('#btn-confirm-loss').onclick = () => {
      const prodSelect = modal.querySelector('#sel-loss-prod');
      const opt = prodSelect.selectedOptions[0];
      const prodId = prodSelect.value;
      const product = products.find(p => p.id === prodId);
      const qty = parseFloat(modal.querySelector('#inp-loss-qty').value) || 0;
      const location = modal.querySelector('#sel-loss-loc').value;
      const reason = modal.querySelector('#sel-loss-reason').value;
      const notes = modal.querySelector('#inp-loss-notes').value.trim();

      if (qty <= 0) {
        showToast('Quantidade deve ser superior a zero.', 'error');
        return;
      }

      const costUnit = product.costPriceBase;
      const totalCost = qty * costUnit;

      const newLoss = {
        id: 'loss-' + Date.now(),
        storeId,
        productId: prodId,
        productName: product.name,
        quantity: qty,
        unit: product.baseUnit,
        costUnit,
        totalCost,
        location,
        reason,
        notes,
        userName: currentUser?.fullName || 'Admin',
        date: new Date().toISOString()
      };

      try {
        db.saveLoss(newLoss);
        showToast(`Perda de ${qty} ${product.baseUnit} registrada com sucesso. Estoque baixado!`, 'success');
        modal.remove();
        if (onSuccess) onSuccess();
      } catch (err) {
        showToast(err.message || 'Erro ao registrar perda.', 'error');
      }
    };

    document.body.appendChild(modal);
  };

  render();
}
