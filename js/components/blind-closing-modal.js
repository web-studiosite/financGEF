/**
 * GEF - GESTÃO FINANCEIRA | BLIND CASH CLOSING MODAL (FECHAMENTO CEGO)
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../core/database.js';
import { auth } from '../core/auth.js';
import { showToast } from './toast.js';

export function openBlindClosingModal(session, onClosed, onCancel) {
  const currentSession = session || db.getActiveCashSession();
  if (!currentSession) {
    showToast('Não há sessão de caixa ativa para fechar.', 'warning');
    return;
  }

  const currentUser = auth.getCurrentUser();
  const operator = currentSession.operatorName || currentUser?.fullName || 'Operador';
  const openedAt = new Date(currentSession.openedAt).toLocaleString('pt-MZ');

  const denominations = [
    { value: 1000, label: 'Nota 1.000 MT' },
    { value: 500, label: 'Nota 500 MT' },
    { value: 200, label: 'Nota 200 MT' },
    { value: 100, label: 'Nota 100 MT' },
    { value: 50, label: 'Nota 50 MT' },
    { value: 20, label: 'Nota 20 MT' },
    { value: 10, label: 'Moeda 10 MT' },
    { value: 5, label: 'Moeda 5 MT' },
    { value: 2, label: 'Moeda 2 MT' },
    { value: 1, label: 'Moeda 1 MT' }
  ];

  const counts = {};
  denominations.forEach(d => counts[d.value] = 0);
  let directValue = 0;
  let useDenominations = true;
  let isFinalized = false;
  let closingResult = null;

  const modalEl = document.createElement('div');
  modalEl.className = 'modal-backdrop';
  modalEl.id = 'active-blind-closing-modal';

  const calculateTotalCounted = () => {
    if (!useDenominations) return directValue;
    return Object.entries(counts).reduce((sum, [val, qty]) => sum + (Number(val) * Number(qty)), 0);
  };

  const render = () => {
    const totalCounted = calculateTotalCounted();

    if (isFinalized && closingResult) {
      // Divergence result view
      const diff = closingResult.difference;
      let statusColor = '#10b981';
      let statusText = 'Batimento Perfeito (Sem Divergências)';
      if (diff > 0) {
        statusColor = '#3b82f6';
        statusText = `Sobra de Caixa: +${diff.toFixed(2)} MT`;
      } else if (diff < 0) {
        statusColor = '#ef4444';
        statusText = `Falta de Caixa: ${diff.toFixed(2)} MT`;
      }

      modalEl.innerHTML = `
        <div class="modal-dialog" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title">Resultado do Fechamento de Caixa</h3>
            <button class="modal-close-btn" id="btn-result-close">✕</button>
          </div>
          <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
            <div style="text-align: center; padding: 16px; background: rgba(15, 23, 42, 0.8); border-radius: 12px; border: 1px solid #334155;">
              <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Status do Fechamento</span>
              <div style="font-size: 20px; font-weight: 900; color: ${statusColor}; margin-top: 4px;">${statusText}</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div style="padding: 12px; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
                <span style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700;">Esperado pelo Sistema</span>
                <div style="font-size: 18px; font-weight: 800; font-family: var(--font-mono); color: #fff; margin-top: 2px;">
                  ${closingResult.expected_cash.toFixed(2)} MT
                </div>
              </div>

              <div style="padding: 12px; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
                <span style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700;">Contagem Física</span>
                <div style="font-size: 18px; font-weight: 800; font-family: var(--font-mono); color: #fff; margin-top: 2px;">
                  ${closingResult.counted_cash.toFixed(2)} MT
                </div>
              </div>
            </div>

            <div style="padding: 12px; background: #0f172a; border-radius: 8px; border: 1px dashed #334155; font-size: 12px; color: #94a3b8;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Operador Responsável:</span>
                <strong style="color: #fff;">${operator}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Data de Abertura:</span>
                <span style="color: #fff;">${openedAt}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Data de Fechamento:</span>
                <span style="color: #fff;">${new Date().toLocaleString('pt-MZ')}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" id="btn-result-finish" style="width: 100%;">
              Concluir e Retornar
            </button>
          </div>
        </div>
      `;

      modalEl.querySelector('#btn-result-close').onclick = () => {
        modalEl.remove();
        if (onClosed) onClosed();
      };
      modalEl.querySelector('#btn-result-finish').onclick = () => {
        modalEl.remove();
        if (onClosed) onClosed();
      };
      return;
    }

    modalEl.innerHTML = `
      <div class="modal-dialog" style="max-width: 560px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="12" r="3"/><line x1="3" x2="3" y1="9" y2="9"/><line x1="21" x2="21" y1="9" y2="9"/></svg>
            <div>
              <h3 class="modal-title">Fechamento Cego de Caixa</h3>
              <div style="font-size: 11px; color: #94a3b8;">Operador: ${operator} • Aberto em ${openedAt}</div>
            </div>
          </div>
          <button class="modal-close-btn" id="btn-blind-close">✕</button>
        </div>

        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
          <!-- Security Notice -->
          <div class="blind-notice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div style="font-size: 11px; color: #fde68a;">
              <strong>Auditoria Segura:</strong> O saldo calculado pelo sistema permanece <strong>oculto</strong> para evitar indução de contagem. Conte as cédulas e moedas físicas na gaveta.
            </div>
          </div>

          <!-- Mode Toggle -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #cbd5e1; text-transform: uppercase;">Método de Contagem:</span>
            <div style="display: flex; background: #1e293b; padding: 2px; border-radius: 6px; border: 1px solid #334155;">
              <button class="btn" id="btn-mode-denoms" style="padding: 3px 8px; font-size: 10px; background: ${useDenominations ? '#ea580c' : 'transparent'}; color: #fff;">
                Por Cédula / Moeda
              </button>
              <button class="btn" id="btn-mode-direct" style="padding: 3px 8px; font-size: 10px; background: ${!useDenominations ? '#ea580c' : 'transparent'}; color: #fff;">
                Valor Direto (Soma)
              </button>
            </div>
          </div>

          <!-- Inputs -->
          ${useDenominations ? `
            <div class="denomination-grid">
              ${denominations.map(d => `
                <div class="denomination-item">
                  <div style="flex: 1;">
                    <span style="font-size: 11px; font-weight: 700; color: #e2e8f0; display: block;">${d.label}</span>
                    <span style="font-size: 10px; font-family: var(--font-mono); color: #f97316;">
                      ${((counts[d.value] || 0) * d.value).toFixed(2)} MT
                    </span>
                  </div>
                  <input 
                    type="number" 
                    min="0" 
                    step="1" 
                    data-denom="${d.value}" 
                    value="${counts[d.value] || ''}" 
                    placeholder="0" 
                    style="width: 70px; text-align: center; font-family: var(--font-mono); font-weight: bold;"
                  >
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="padding: 16px; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
              <label style="font-size: 12px; font-weight: 600; color: #cbd5e1; display: block; margin-bottom: 6px;">
                Digite o valor total em dinheiro físico contado na gaveta (MT):
              </label>
              <input 
                type="number" 
                step="0.01" 
                id="input-direct-cash" 
                value="${directValue || ''}" 
                placeholder="0.00" 
                style="width: 100%; font-size: 22px; font-weight: 900; font-family: var(--font-mono); text-align: center;"
              >
            </div>
          `}

          <!-- Total Counted Card -->
          <div style="padding: 12px 16px; background: #0f172a; border: 1px solid #334155; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Total Físico Declarado:</span>
            <span style="font-size: 22px; font-weight: 900; font-family: var(--font-mono); color: #34d399;" id="blind-total-display">
              ${totalCounted.toFixed(2)} MT
            </span>
          </div>

          <!-- Notes -->
          <div>
            <label style="font-size: 11px; font-weight: 600; color: #94a3b8; display: block; margin-bottom: 4px;">Observações do Fechamento (Opcional):</label>
            <input type="text" id="input-closing-notes" placeholder="Ex: Cédulas em bom estado, envelope lacrado nº 402." style="width: 100%; font-size: 12px;">
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-closing">Cancelar</button>
          <button class="btn btn-danger" id="btn-confirm-blind-close">
            <span>Confirmar e Encerrar Caixa</span>
          </button>
        </div>
      </div>
    `;

    modalEl.querySelector('#btn-blind-close').onclick = () => {
      modalEl.remove();
      if (onCancel) onCancel();
    };
    modalEl.querySelector('#btn-cancel-closing').onclick = () => {
      modalEl.remove();
      if (onCancel) onCancel();
    };

    const btnDenoms = modalEl.querySelector('#btn-mode-denoms');
    if (btnDenoms) {
      btnDenoms.onclick = () => {
        useDenominations = true;
        render();
      };
    }

    const btnDirect = modalEl.querySelector('#btn-mode-direct');
    if (btnDirect) {
      btnDirect.onclick = () => {
        useDenominations = false;
        render();
      };
    }

    if (useDenominations) {
      modalEl.querySelectorAll('input[data-denom]').forEach(inp => {
        inp.oninput = (e) => {
          const val = Number(inp.getAttribute('data-denom'));
          counts[val] = Math.max(0, parseInt(e.target.value) || 0);
          const totalDisp = modalEl.querySelector('#blind-total-display');
          if (totalDisp) totalDisp.textContent = calculateTotalCounted().toFixed(2) + ' MT';
        };
      });
    } else {
      const directInp = modalEl.querySelector('#input-direct-cash');
      if (directInp) {
        directInp.oninput = (e) => {
          directValue = parseFloat(e.target.value) || 0;
          const totalDisp = modalEl.querySelector('#blind-total-display');
          if (totalDisp) totalDisp.textContent = directValue.toFixed(2) + ' MT';
        };
      }
    }

    modalEl.querySelector('#btn-confirm-blind-close').onclick = () => {
      const total = calculateTotalCounted();
      const notes = modalEl.querySelector('#input-closing-notes')?.value || '';
      try {
        const res = db.closeCashSession(currentSession.id, total, notes);
        closingResult = res;
        isFinalized = true;
        render();
      } catch (err) {
        showToast(err.message || 'Erro ao fechar caixa.', 'error');
      }
    };
  };

  render();
  document.body.appendChild(modalEl);
}
