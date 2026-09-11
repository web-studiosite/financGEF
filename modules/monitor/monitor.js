/**
 * GEF - GESTÃO FINANCEIRA | MÓDULO MONITOR SAAS & TRAVA LRS
 * JavaScript Puro (Vanilla JS)
 * Exclusivo Superadmin Global (Independente de Loja)
 * 
 * Atualizações:
 * - Edição manual de mensalidade por filial
 * - Trava RLS automática na data exata de expiração
 * - Alerta de renovação quando restarem 5 dias
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';
import { normalizeRole } from '../../js/core/permissions.js';
import { i18n } from '../../js/core/i18n.js';

export function initMonitorModule(container) {
  const currentUser = auth.getCurrentUser();
  const userRole = currentUser ? normalizeRole(currentUser.role, currentUser.id) : '';

  const render = () => {
    if (userRole !== 'SUPERADMIN') {
      container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 40px auto; text-align: center; padding: 36px 24px;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: #f87171;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0 0 8px 0;">Console Exclusivo de Superadmin</h2>
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0;">
            O Monitor SaaS Global e o controle de travas LRS são independentes de filiais e restritos exclusivamente ao Super Administrador da plataforma. O perfil atual (<strong>${userRole || 'Usuário'}</strong>) visualiza apenas os módulos operacionais da sua loja.
          </p>
        </div>
      `;
      return;
    }

    const stores = db.getStores();
    const activeStores = stores.filter(s => {
      const check = db.checkStoreLock(s.id);
      return !check.isLocked;
    }).length;
    const lockedStores = stores.length - activeStores;
    const totalRevenueMRR = stores.reduce((sum, s) => sum + (s.valor_mensalidade || 4500), 0);

    // Lojas com licença vencendo em até 5 dias
    const nearExpiryStores = stores.filter(s => {
      const check = db.checkStoreLock(s.id);
      return !check.isLocked && check.daysRemaining <= 5 && check.daysRemaining >= 0;
    }).length;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px;">
                Console Central de Governança SaaS
              </div>
              <h2 style="font-size: 18px; font-weight: 900; color: #f8fafc; margin: 2px 0 0 0;">
                Monitor Global de Lojas & Trava LRS
              </h2>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                Superadmin independente de filial • Controle de licenciamento, adimplência e travas operacionais.
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary" id="btn-sync-all-licenses">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                <span>Verificar Licenças</span>
              </button>
            </div>
          </div>
        </div>

        ${nearExpiryStores > 0 ? `
          <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; color: #fde68a; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span><strong>Aviso de Renovação LRS:</strong> ${nearExpiryStores} filial(is) com subscrição expirando nos próximos 5 dias. As travas automáticas serão ativadas no dia do término.</span>
            </div>
            <span class="badge badge-amber" style="font-size: 10px;">5 Dias Restantes</span>
          </div>
        ` : ''}

        <!-- Metrics Cards -->
        <div class="metrics-grid">
          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Total de Filiais / Lojas</div>
            <div style="font-size: 24px; font-weight: 900; color: #f8fafc; font-family: var(--font-mono); margin-top: 4px;">
              ${stores.length}
            </div>
            <div style="font-size: 10px; color: #34d399; margin-top: 2px;">${activeStores} em operação normal</div>
          </div>

          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Lojas Bloqueadas / Travadas</div>
            <div style="font-size: 24px; font-weight: 900; color: #f87171; font-family: var(--font-mono); margin-top: 4px;">
              ${lockedStores}
            </div>
            <div style="font-size: 10px; color: #ef4444; margin-top: 2px;">Com aviso LRS ou suspensão financeira</div>
          </div>

          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Receita Recorrente SaaS (MRR)</div>
            <div style="font-size: 24px; font-weight: 900; color: #60a5fa; font-family: var(--font-mono); margin-top: 4px;">
              ${i18n.formatMoney(totalRevenueMRR)} <span style="font-size: 12px; color: #3b82f6;">/mês</span>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Faturamento de licenças de software</div>
          </div>
        </div>

        <!-- Stores Governance Table Card -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 16px; border-bottom: 1px solid #1f2937;">
            <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin: 0;">Status de Licenças das Lojas & Trava LRS</h3>
          </div>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Loja / Filial</th>
                  <th>Cidade / Província</th>
                  <th>Mensalidade Manual</th>
                  <th>Fim do Período / Expiração</th>
                  <th>Dias Restantes</th>
                  <th>Status de Acesso</th>
                  <th style="text-align: right;">Ações de Controle</th>
                </tr>
              </thead>
              <tbody>
                ${stores.map(s => {
                  const check = db.checkStoreLock(s.id);
                  const isLocked = check.isLocked;
                  const days = check.daysRemaining;
                  const isNear = !isLocked && days <= 5 && days >= 0;

                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 700; color: #f8fafc;">${s.name}</div>
                        <div style="font-size: 10px; color: #94a3b8;">ID: ${s.id} ${s.isHeadquarters ? '• <span class="badge badge-amber" style="font-size: 8px;">MATRIZ</span>' : ''}</div>
                      </td>
                      <td>${s.city || 'Maputo'}</td>
                      <td style="font-family: var(--font-mono); font-weight: 700; color: #38bdf8;">
                        ${i18n.formatMoney(s.valor_mensalidade || 4500)}
                      </td>
                      <td style="font-size: 11px; color: #cbd5e1;">
                        ${s.data_fim_teste ? s.data_fim_teste.split('T')[0] : 'Licença Permanente'}
                      </td>
                      <td>
                        <strong style="font-family: var(--font-mono); color: ${days <= 0 ? '#f87171' : days <= 5 ? '#fbbf24' : '#34d399'};">
                          ${days >= 900 ? 'Ilimitado' : days <= 0 ? 'Expirado' : days + ' dias'}
                        </strong>
                      </td>
                      <td>
                        ${isLocked ? `
                          <span class="badge badge-red">TRAVA ATIVA (BLOQUEADO)</span>
                        ` : isNear ? `
                          <span class="badge badge-amber">RENOVAÇÃO (5 DIAS)</span>
                        ` : `
                          <span class="badge badge-emerald">ACESSO LIBERADO</span>
                        `}
                      </td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                          <button class="btn btn-secondary btn-edit-store-sub" data-id="${s.id}" style="padding: 4px 8px; font-size: 10px;" title="Alterar valor manual de mensalidade ou vigência">
                            Editar Mensalidade
                          </button>
                          <button class="btn btn-secondary btn-renew-store" data-id="${s.id}" style="padding: 4px 8px; font-size: 10px; color: #34d399; border-color: #10b981;">
                            +30 Dias
                          </button>
                          <button class="btn btn-secondary btn-toggle-lock" data-id="${s.id}" style="padding: 4px 8px; font-size: 10px; color: ${isLocked ? '#34d399' : '#f87171'}; border-color: ${isLocked ? '#34d399' : '#ef4444'};">
                            ${isLocked ? 'Desbloquear' : 'Travar'}
                          </button>
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

    // Events
    container.querySelector('#btn-sync-all-licenses').onclick = () => {
      showToast('Sincronização de licenças concluída com sucesso.', 'success');
      render();
    };

    container.querySelectorAll('.btn-renew-store').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const s = stores.find(st => st.id === id);
        if (s) {
          const currentExpiry = s.data_fim_teste ? new Date(s.data_fim_teste) : new Date();
          const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
          baseDate.setDate(baseDate.getDate() + 30);
          s.data_fim_teste = baseDate.toISOString().split('T')[0];
          s.acesso_ativo = true;
          db.saveStore(s);
          showToast(`Licença da loja ${s.name} renovada por mais 30 dias!`, 'success');
          render();
        }
      };
    });

    container.querySelectorAll('.btn-toggle-lock').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const s = stores.find(st => st.id === id);
        if (s) {
          const newState = s.acesso_ativo === false ? true : false;
          s.acesso_ativo = newState;
          s.motivo_bloqueio = newState ? '' : 'Suspensão temporária por pendência financeira SaaS.';
          db.saveStore(s);
          showToast(`Loja ${s.name} agora está ${newState ? 'LIBERADA' : 'BLOQUEADA (TRAVADA)'}!`, newState ? 'success' : 'error');
          render();
        }
      };
    });

    container.querySelectorAll('.btn-edit-store-sub').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const s = stores.find(st => st.id === id);
        if (s) openEditStoreSubModal(s, () => render());
      };
    });
  };

  const openEditStoreSubModal = (store, onSuccess) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="modal-title">Configurar Licença & Mensalidade da Loja</h3>
          <button class="modal-close-btn" id="btn-close-submodal">✕</button>
        </div>
        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Filial:</label>
            <input type="text" value="${store.name}" disabled style="width: 100%; opacity: 0.7;">
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #ea580c; display: block; margin-bottom: 4px;">Valor de Mensalidade Manual (${i18n.getCurrency()}):</label>
            <!-- Inserção manual de mensalidade -->
            <input 
              type="number" 
              step="any" 
              min="0" 
              id="inp-store-sub-val" 
              value="${store.valor_mensalidade || 4500}" 
              style="width: 100%; font-size: 16px; font-weight: 900; font-family: var(--font-mono); color: #38bdf8;"
            >
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Data de Fim da Subscrição / Teste:</label>
            <input 
              type="date" 
              id="inp-store-sub-date" 
              value="${store.data_fim_teste ? store.data_fim_teste.split('T')[0] : ''}" 
              style="width: 100%;"
            >
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
              No dia exato desta data, o sistema ativará as travas de acesso automaticamente.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-submodal">Cancelar</button>
          <button class="btn btn-primary" id="btn-save-substore">Salvar Alterações</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-submodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-submodal').onclick = () => modal.remove();
    modal.querySelector('#btn-save-substore').onclick = () => {
      const val = parseFloat(modal.querySelector('#inp-store-sub-val').value) || 0;
      const date = modal.querySelector('#inp-store-sub-date').value;

      store.valor_mensalidade = val;
      if (date) {
        store.data_fim_teste = date;
        const isFuture = new Date(date).getTime() > Date.now();
        store.acesso_ativo = isFuture;
      }

      db.saveStore(store);
      showToast(`Licença da loja ${store.name} atualizada com sucesso!`, 'success');
      modal.remove();
      if (onSuccess) onSuccess();
    };

    document.body.appendChild(modal);
  };

  render();
}
