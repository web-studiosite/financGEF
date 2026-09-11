/**
 * GEF - GESTÃO FINANCEIRA | VENDAS E ESTORNOS
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { openReceiptModal } from '../../js/components/receipt-modal.js';
import { showToast } from '../../js/components/toast.js';

export function initVendasModule(container) {
  const storeId = db.getCurrentStoreId();
  const currentUser = auth.getCurrentUser();
  const canReverse = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN' || currentUser.role === 'MANAGER');
  let sales = db.getSales(storeId);
  let searchTerm = '';
  let statusFilter = 'ALL';
  let paymentFilter = 'ALL';

  const render = () => {
    sales = db.getSales(storeId);

    const filtered = sales.filter(s => {
      const matchSearch = !searchTerm || 
        (s.saleNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.receiptNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchPay = paymentFilter === 'ALL' || s.paymentMethod === paymentFilter;
      return matchSearch && matchStatus && matchPay;
    });

    const totalConcluded = filtered.filter(s => s.status === 'CONCLUIDA' || s.status === 'COMPLETED').reduce((sum, s) => sum + (s.total || s.totalNet || 0), 0);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 20px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">Histórico de Vendas & Estornos</h2>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Consulta detalhada de recibos, comprovantes e estorno atômico com retorno de estoque.
            </div>
          </div>
          <div style="background: #0f172a; padding: 6px 14px; border-radius: 8px; border: 1px solid #334155;">
            <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Total no Filtro:</span>
            <span style="font-size: 16px; font-weight: 900; font-family: var(--font-mono); color: #34d399; margin-left: 6px;">
              ${totalConcluded.toFixed(2)} MT
            </span>
          </div>
        </div>

        <!-- Filters Bar Card -->
        <div class="card" style="padding: 12px 16px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <input 
            type="text" 
            id="input-vendas-search" 
            placeholder="Buscar por nº da venda, recibo ou cliente..." 
            value="${searchTerm}"
            style="flex: 1; min-width: 200px; font-size: 12px;"
          >

          <select id="select-status-filter" style="font-size: 12px;">
            <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>Todos os Status</option>
            <option value="CONCLUIDA" ${statusFilter === 'CONCLUIDA' ? 'selected' : ''}>Concluídas</option>
            <option value="CANCELADA" ${statusFilter === 'CANCELADA' ? 'selected' : ''}>Estornadas / Canceladas</option>
          </select>

          <select id="select-payment-filter" style="font-size: 12px;">
            <option value="ALL" ${paymentFilter === 'ALL' ? 'selected' : ''}>Todas as Formas</option>
            <option value="DINHEIRO" ${paymentFilter === 'DINHEIRO' ? 'selected' : ''}>Dinheiro</option>
            <option value="M-PESA" ${paymentFilter === 'M-PESA' ? 'selected' : ''}>M-Pesa</option>
            <option value="E-MOLA" ${paymentFilter === 'E-MOLA' ? 'selected' : ''}>e-Mola</option>
            <option value="POS_CARTAO" ${paymentFilter === 'POS_CARTAO' ? 'selected' : ''}>Cartão POS</option>
            <option value="CREDITO_FIADO" ${paymentFilter === 'CREDITO_FIADO' ? 'selected' : ''}>Crédito Fiado</option>
          </select>

          <button class="btn btn-secondary" id="btn-reset-filters" style="padding: 6px 12px; font-size: 11px;">
            Limpar Filtros
          </button>
        </div>

        <!-- Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Venda / Recibo</th>
                  <th>Data & Hora</th>
                  <th>Cliente</th>
                  <th>Forma Pgto</th>
                  <th>Itens</th>
                  <th>Total Líquido</th>
                  <th>Status</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; color: #64748b; padding: 32px;">
                      Nenhuma venda encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ` : filtered.map(sale => {
                  const isCancelled = sale.status === 'CANCELADA' || sale.status === 'REVERSED';
                  return `
                    <tr style="${isCancelled ? 'opacity: 0.6; background: rgba(239, 68, 68, 0.03);' : ''}">
                      <td>
                        <div style="font-weight: 800; color: #f8fafc;">${sale.saleNumber || sale.id}</div>
                        <div style="font-size: 10px; color: #94a3b8; font-family: var(--font-mono);">${sale.receiptNumber || '-'}</div>
                      </td>
                      <td>
                        <div style="font-size: 11px; color: #cbd5e1;">${new Date(sale.createdAt || sale.timestamp).toLocaleDateString('pt-MZ')}</div>
                        <div style="font-size: 10px; color: #94a3b8;">${new Date(sale.createdAt || sale.timestamp).toLocaleTimeString('pt-MZ')}</div>
                      </td>
                      <td>
                        <div style="font-weight: 600; color: #cbd5e1;">${sale.customerName || 'Consumidor Final'}</div>
                        <div style="font-size: 10px; color: #64748b;">${sale.customerTaxId ? `NUIT: ${sale.customerTaxId}` : ''}</div>
                      </td>
                      <td>
                        <span class="badge ${sale.paymentMethod === 'DINHEIRO' ? 'badge-emerald' : sale.paymentMethod === 'M-PESA' ? 'badge-red' : sale.paymentMethod === 'CREDITO_FIADO' ? 'badge-amber' : 'badge-blue'}">
                          ${sale.paymentMethod}
                        </span>
                      </td>
                      <td style="font-size: 11px; color: #cbd5e1;">
                        ${(sale.items || []).length} ${(sale.items || []).length === 1 ? 'item' : 'itens'}
                      </td>
                      <td>
                        <strong style="color: ${isCancelled ? '#94a3b8' : '#34d399'}; font-family: var(--font-mono); font-size: 13px;">
                          ${(sale.total || sale.totalNet).toFixed(2)} MT
                        </strong>
                      </td>
                      <td>
                        <span class="badge ${isCancelled ? 'badge-red' : 'badge-emerald'}">
                          ${isCancelled ? 'CANCELADA' : 'CONCLUÍDA'}
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                          <button class="btn btn-secondary btn-print-sale" data-sale-id="${sale.id}" style="padding: 4px 8px; font-size: 10px;" title="Ver/Imprimir Comprovante">
                            Recibo
                          </button>
                          ${!isCancelled && canReverse ? `
                            <button class="btn btn-secondary btn-reverse-sale" data-sale-id="${sale.id}" style="padding: 4px 8px; font-size: 10px; color: #f87171; border-color: rgba(239, 68, 68, 0.4);" title="Estornar Venda (Admin/Gerente)">
                              Estornar
                            </button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Filter events
    const searchInp = container.querySelector('#input-vendas-search');
    searchInp.oninput = (e) => {
      searchTerm = e.target.value;
      render();
      const ref = container.querySelector('#input-vendas-search');
      if (ref) {
        ref.focus();
        ref.setSelectionRange(searchTerm.length, searchTerm.length);
      }
    };

    container.querySelector('#select-status-filter').onchange = (e) => {
      statusFilter = e.target.value;
      render();
    };

    container.querySelector('#select-payment-filter').onchange = (e) => {
      paymentFilter = e.target.value;
      render();
    };

    container.querySelector('#btn-reset-filters').onclick = () => {
      searchTerm = '';
      statusFilter = 'ALL';
      paymentFilter = 'ALL';
      render();
    };

    // Print Receipt
    container.querySelectorAll('.btn-print-sale').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-sale-id');
        const sale = sales.find(s => s.id === id);
        if (sale) openReceiptModal(sale);
      };
    });

    // Reversal / Estorno
    container.querySelectorAll('.btn-reverse-sale').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-sale-id');
        const sale = sales.find(s => s.id === id);
        if (!sale) return;

        openReversalConfirmModal(sale, () => {
          render();
        });
      };
    });
  };

  const openReversalConfirmModal = (sale, onReversed) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 440px;">
        <div class="modal-header" style="border-bottom-color: rgba(239, 68, 68, 0.3);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            <h3 class="modal-title" style="color: #fca5a5;">Confirmar Estorno de Venda</h3>
          </div>
          <button class="modal-close-btn" id="btn-close-rev">✕</button>
        </div>
        <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
          <div style="padding: 12px; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <span>Venda:</span>
              <strong style="color: #fff;">${sale.saleNumber} (${sale.receiptNumber})</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <span>Cliente:</span>
              <span style="color: #fff;">${sale.customerName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span>Valor a Devolver:</span>
              <strong style="color: #34d399; font-family: var(--font-mono);">${(sale.total || sale.totalNet).toFixed(2)} MT</strong>
            </div>
          </div>

          <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
            Ao confirmar o estorno:
            <ul style="margin: 4px 0 0 18px;">
              <li>Todas as quantidades serão <strong>devolvidas ao estoque e lotes FEFO</strong> originais.</li>
              <li>Caso tenha sido em dinheiro, o valor é estornado do caixa ativo.</li>
              <li>Caso tenha sido no fiado, a dívida do cliente é cancelada.</li>
            </ul>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Motivo do Estorno / Devolução:</label>
            <input type="text" id="input-rev-reason" placeholder="Ex: Cliente desistiu da compra / Material avariado" style="width: 100%; font-size: 12px;" required>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-rev">Cancelar</button>
          <button class="btn btn-danger" id="btn-confirm-rev">
            Confirmar Estorno Atômico
          </button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-rev').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-rev').onclick = () => modal.remove();
    modal.querySelector('#btn-confirm-rev').onclick = () => {
      const reason = modal.querySelector('#input-rev-reason').value;
      if (!reason) {
        showToast('Informe o motivo do estorno.', 'error');
        return;
      }
      try {
        db.reverseSale(sale.id, reason);
        showToast(`Venda ${sale.saleNumber} estornada com sucesso e estoque recomposto!`, 'success');
        modal.remove();
        if (onReversed) onReversed();
      } catch (err) {
        showToast(err.message || 'Erro ao estornar venda.', 'error');
      }
    };

    document.body.appendChild(modal);
  };

  render();
}
