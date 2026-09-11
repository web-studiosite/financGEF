/**
 * GEF - GESTÃO FINANCEIRA | CONTROLE DE CAIXA & FECHAMENTO CEGO
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { openBlindClosingModal } from '../../js/components/blind-closing-modal.js';
import { showToast } from '../../js/components/toast.js';

export function initCaixaModule(container) {
  const storeId = db.getCurrentStoreId();
  const currentUser = auth.getCurrentUser();

  const render = () => {
    const activeSession = db.getActiveCashSession(storeId);
    const sessions = db.getCashSessions(storeId);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 20px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">Frente de Caixa & Fechamento Cego</h2>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Abertura de gaveta, suprimento de troco, sangria de segurança e conferência cega antifraude.
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            ${activeSession ? `
              <button class="btn btn-secondary" id="btn-caixa-sangria" style="border-color: #f59e0b; color: #fbbf24;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="5" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                <span>Sangria (Retirada)</span>
              </button>
              <button class="btn btn-secondary" id="btn-caixa-suprimento" style="border-color: #3b82f6; color: #60a5fa;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="19" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                <span>Suprimento (Entrada)</span>
              </button>
              <button class="btn btn-primary" id="btn-caixa-fechar" style="background: #ef4444; border-color: #ef4444;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>
                <span>Fechar Caixa Cego</span>
              </button>
            ` : `
              <button class="btn btn-primary" id="btn-caixa-abrir">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span>Abrir Novo Turno de Caixa</span>
              </button>
            `}
          </div>
        </div>

        <!-- Current Session Status -->
        ${activeSession ? `
          <div class="card" style="background: #111827; border-color: #10b981; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge badge-emerald" style="animation: pulse 2s infinite;">TURNO ABERTO</span>
                  <span style="font-size: 11px; color: #94a3b8; font-family: var(--font-mono);">${activeSession.id}</span>
                </div>
                <h3 style="font-size: 16px; font-weight: 800; color: #f8fafc; margin: 8px 0 4px 0;">
                  Operador: ${activeSession.cashierName}
                </h3>
                <div style="font-size: 11px; color: #94a3b8;">
                  Abertura: ${new Date(activeSession.openedAt).toLocaleString('pt-MZ')} • Fundo Inicial de Troco: <strong style="color: #cbd5e1;">${(activeSession.openingBalance || 0).toFixed(2)} MT</strong>
                </div>
              </div>

              <div style="text-align: right;">
                <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Dinheiro Físico em Gaveta:</div>
                <div style="font-size: 26px; font-weight: 900; font-family: var(--font-mono); color: #34d399;">
                  ${(activeSession.cashInDrawer || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 16px;">MT</span>
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                  Total acumulado de vendas em numerário + suprimentos - sangrias
                </div>
              </div>
            </div>

            <!-- Movements breakdown -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #1f2937;">
              <div style="background: #0f172a; padding: 8px 12px; border-radius: 8px;">
                <div style="font-size: 10px; color: #94a3b8;">Fundo de Troco</div>
                <div style="font-weight: 800; color: #cbd5e1; font-family: var(--font-mono);">${(activeSession.openingBalance || 0).toFixed(2)} MT</div>
              </div>
              <div style="background: #0f172a; padding: 8px 12px; border-radius: 8px;">
                <div style="font-size: 10px; color: #94a3b8;">Vendas em Dinheiro</div>
                <div style="font-weight: 800; color: #34d399; font-family: var(--font-mono);">${(activeSession.cashSales || 0).toFixed(2)} MT</div>
              </div>
              <div style="background: #0f172a; padding: 8px 12px; border-radius: 8px;">
                <div style="font-size: 10px; color: #94a3b8;">Vendas M-Pesa / Cartão</div>
                <div style="font-weight: 800; color: #60a5fa; font-family: var(--font-mono);">${((activeSession.mpesaSales || 0) + (activeSession.emolaSales || 0) + (activeSession.posSales || 0)).toFixed(2)} MT</div>
              </div>
              <div style="background: #0f172a; padding: 8px 12px; border-radius: 8px;">
                <div style="font-size: 10px; color: #94a3b8;">Suprimentos (+Troco)</div>
                <div style="font-weight: 800; color: #38bdf8; font-family: var(--font-mono);">+${(activeSession.totalSupplies || 0).toFixed(2)} MT</div>
              </div>
              <div style="background: #0f172a; padding: 8px 12px; border-radius: 8px;">
                <div style="font-size: 10px; color: #94a3b8;">Sangrias (-Cofre)</div>
                <div style="font-weight: 800; color: #fbbf24; font-family: var(--font-mono);">${(activeSession.totalBleeds || 0).toFixed(2)} MT</div>
              </div>
            </div>
          </div>
        ` : `
          <div class="card" style="text-align: center; padding: 40px; background: #111827;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(234, 88, 12, 0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <h3 style="font-size: 16px; font-weight: 800; color: #f8fafc; margin: 0 0 6px 0;">O Caixa desta loja está Fechado</h3>
            <p style="font-size: 12px; color: #94a3b8; max-width: 400px; margin: 0 auto 16px auto;">
              Para realizar vendas no PDV e registrar movimentações de dinheiro, é necessário abrir o turno e informar o fundo de troco inicial.
            </p>
            <button class="btn btn-primary" id="btn-caixa-abrir-center">
              Abrir Turno de Caixa
            </button>
          </div>
        `}

        <!-- History of Past Sessions -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 20px; border-bottom: 1px solid #1f2937;">
            <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin: 0;">Histórico de Fechamentos de Caixa (Auditoria Cega)</h3>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Sessão</th>
                  <th>Operador</th>
                  <th>Abertura</th>
                  <th>Fechamento</th>
                  <th>Sistema (Gaveta)</th>
                  <th>Declarado (Cego)</th>
                  <th>Diferença (Quebra/Sobra)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${sessions.length === 0 ? `
                  <tr><td colspan="8" style="text-align: center; color: #64748b; padding: 24px;">Nenhuma sessão de caixa encerrada ainda.</td></tr>
                ` : sessions.map(s => {
                  const isOpen = s.status === 'OPEN';
                  const diff = s.difference || 0;
                  return `
                    <tr>
                      <td>
                        <span style="font-weight: 800; font-family: var(--font-mono); color: #f97316;">${s.id}</span>
                      </td>
                      <td>
                        <div style="font-weight: 600; color: #cbd5e1;">${s.cashierName}</div>
                      </td>
                      <td style="font-size: 11px; color: #94a3b8;">
                        ${new Date(s.openedAt).toLocaleString('pt-MZ')}
                      </td>
                      <td style="font-size: 11px; color: #94a3b8;">
                        ${s.closedAt ? new Date(s.closedAt).toLocaleString('pt-MZ') : '-'}
                      </td>
                      <td style="font-family: var(--font-mono); font-weight: 700; color: #cbd5e1;">
                        ${(s.closingExpectedBalance ?? s.cashInDrawer ?? 0).toFixed(2)} MT
                      </td>
                      <td style="font-family: var(--font-mono); font-weight: 800; color: #34d399;">
                        ${s.closingCountedBalance !== undefined ? `${s.closingCountedBalance.toFixed(2)} MT` : '-'}
                      </td>
                      <td>
                        ${s.closingCountedBalance !== undefined ? `
                          <strong style="font-family: var(--font-mono); color: ${diff === 0 ? '#34d399' : diff > 0 ? '#60a5fa' : '#ef4444'};">
                            ${diff > 0 ? `+${diff.toFixed(2)} (Sobra)` : diff < 0 ? `${diff.toFixed(2)} (Quebra)` : '0.00 (Exato)'}
                          </strong>
                        ` : '-'}
                      </td>
                      <td>
                        <span class="badge ${isOpen ? 'badge-emerald' : 'badge-blue'}">
                          ${isOpen ? 'ABERTO' : 'CONCILIADO'}
                        </span>
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

    // Actions
    const openBtn = container.querySelector('#btn-caixa-abrir') || container.querySelector('#btn-caixa-abrir-center');
    if (openBtn) {
      openBtn.onclick = () => openStartSessionModal(() => render());
    }

    const closeBtn = container.querySelector('#btn-caixa-fechar');
    if (closeBtn && activeSession) {
      closeBtn.onclick = () => {
        openBlindClosingModal(activeSession, () => render());
      };
    }

    const sangriaBtn = container.querySelector('#btn-caixa-sangria');
    if (sangriaBtn && activeSession) {
      sangriaBtn.onclick = () => openSangriaModal(activeSession, () => render());
    }

    const suprimentoBtn = container.querySelector('#btn-caixa-suprimento');
    if (suprimentoBtn && activeSession) {
      suprimentoBtn.onclick = () => openSuprimentoModal(activeSession, () => render());
    }
  };

  const openStartSessionModal = (onSuccess) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title">Abertura de Turno de Caixa</h3>
          <button class="modal-close-btn" id="btn-close-csmodal">✕</button>
        </div>
        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Operador / Caixa:</label>
            <input type="text" id="inp-cs-name" value="${currentUser?.fullName || 'Operador de Frente'}" style="width: 100%;" required>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Fundo de Troco Inicial (MT):</label>
            <input type="number" min="0" step="10" id="inp-cs-balance" value="500" style="width: 100%; font-size: 16px; font-weight: 900; font-family: var(--font-mono); color: #34d399;">
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Informe o montante em dinheiro deixado na gaveta para troco.</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-csmodal">Cancelar</button>
          <button class="btn btn-primary" id="btn-confirm-csopen">Abrir Caixa Agora</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-csmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-csmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-confirm-csopen').onclick = () => {
      const name = modal.querySelector('#inp-cs-name').value.trim();
      const initialCash = parseFloat(modal.querySelector('#inp-cs-balance').value) || 0;

      const newSession = {
        id: 'shift-' + Date.now(),
        storeId,
        cashierId: currentUser?.id || 'admin',
        cashierName: name,
        openedAt: new Date().toISOString(),
        openingBalance: initialCash,
        cashInDrawer: initialCash,
        cashSales: 0,
        mpesaSales: 0,
        emolaSales: 0,
        posSales: 0,
        totalSupplies: 0,
        totalBleeds: 0,
        status: 'OPEN'
      };

      db.saveCashSession(newSession);
      showToast('Turno de caixa aberto com sucesso!', 'success');
      modal.remove();
      if (onSuccess) onSuccess();
    };

    document.body.appendChild(modal);
  };

  const openSangriaModal = (session, onSuccess) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 400px;">
        <div class="modal-header" style="border-bottom-color: rgba(245, 158, 11, 0.4);">
          <h3 class="modal-title" style="color: #fbbf24;">Realizar Sangria (Retirada de Caixa)</h3>
          <button class="modal-close-btn" id="btn-close-sgmodal">✕</button>
        </div>
        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 11px; color: #94a3b8;">
            Valor disponível em gaveta: <strong style="color: #34d399;">${session.cashInDrawer.toFixed(2)} MT</strong>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Valor a Retirar (MT):</label>
            <input type="number" min="1" max="${session.cashInDrawer}" step="any" id="inp-sg-val" placeholder="0.00" style="width: 100%; font-size: 16px; font-weight: bold; font-family: var(--font-mono);">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Motivo / Destino:</label>
            <input type="text" id="inp-sg-reason" placeholder="Ex: Recolhimento para o cofre central" style="width: 100%;" required>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-sgmodal">Cancelar</button>
          <button class="btn btn-primary" id="btn-confirm-sangria" style="background: #f59e0b; border-color: #f59e0b;">Efetuar Sangria</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-sgmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-sgmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-confirm-sangria').onclick = () => {
      const val = parseFloat(modal.querySelector('#inp-sg-val').value) || 0;
      const reason = modal.querySelector('#inp-sg-reason').value.trim();

      if (val <= 0 || val > session.cashInDrawer) {
        showToast('Valor inválido ou maior que o saldo em gaveta.', 'error');
        return;
      }
      if (!reason) {
        showToast('Informe o motivo da sangria.', 'error');
        return;
      }

      session.cashInDrawer -= val;
      session.totalBleeds = (session.totalBleeds || 0) + val;
      db.saveCashSession(session);
      showToast(`Sangria de ${val.toFixed(2)} MT efetuada com sucesso!`, 'success');
      modal.remove();
      if (onSuccess) onSuccess();
    };

    document.body.appendChild(modal);
  };

  const openSuprimentoModal = (session, onSuccess) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 400px;">
        <div class="modal-header" style="border-bottom-color: rgba(59, 130, 246, 0.4);">
          <h3 class="modal-title" style="color: #60a5fa;">Realizar Suprimento (Entrada de Troco)</h3>
          <button class="modal-close-btn" id="btn-close-spmodal">✕</button>
        </div>
        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Valor a Adicionar (MT):</label>
            <input type="number" min="1" step="any" id="inp-sp-val" placeholder="0.00" style="width: 100%; font-size: 16px; font-weight: bold; font-family: var(--font-mono);">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Origem / Motivo:</label>
            <input type="text" id="inp-sp-reason" placeholder="Ex: Reforço de moedas e notas de 20 MT" style="width: 100%;" required>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-spmodal">Cancelar</button>
          <button class="btn btn-primary" id="btn-confirm-suprimento">Efetuar Suprimento</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-spmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-spmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-confirm-suprimento').onclick = () => {
      const val = parseFloat(modal.querySelector('#inp-sp-val').value) || 0;
      const reason = modal.querySelector('#inp-sp-reason').value.trim();

      if (val <= 0) {
        showToast('Valor de suprimento deve ser maior que zero.', 'error');
        return;
      }

      session.cashInDrawer += val;
      session.totalSupplies = (session.totalSupplies || 0) + val;
      db.saveCashSession(session);
      showToast(`Suprimento de ${val.toFixed(2)} MT adicionado ao caixa!`, 'success');
      modal.remove();
      if (onSuccess) onSuccess();
    };

    document.body.appendChild(modal);
  };

  render();
}
