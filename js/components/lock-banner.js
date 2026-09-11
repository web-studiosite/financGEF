/**
 * GEF - GESTÃO FINANCEIRA | SAAS & STORE LOCK ENGINE (TRAVA LRS)
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../core/database.js';
import { auth } from '../core/auth.js';
import { showToast } from './toast.js';
import { normalizeRole } from '../core/permissions.js';

export function checkAndRenderLockBanner(container, onNavigate) {
  const currentUser = auth.getCurrentUser();
  const userRole = currentUser ? normalizeRole(currentUser.role, currentUser.id) : 'CASHIER';

  // REGRA CRÍTICA: O Superadmin é 100% independente de qualquer loja.
  // Ao bloquear uma filial, o Superadmin NUNCA perde o acesso ao sistema!
  if (userRole === 'SUPERADMIN') {
    return;
  }

  const lockStatus = db.checkStoreLock();

  // If user is locked out of this store
  if (lockStatus.isLocked) {
    renderLockModal(lockStatus, userRole, onNavigate);
    return;
  }

  // Warning banner if expiring soon (<= 5 days)
  if (lockStatus.daysRemaining <= 5 && lockStatus.daysRemaining >= 0) {
    renderTrialBanner(container, lockStatus.daysRemaining);
  }
}

function renderTrialBanner(container, daysRemaining) {
  let banner = document.getElementById('gef-trial-warning-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'gef-trial-warning-banner';
    banner.className = 'trial-warning-banner';
    container.prepend(banner);
  }

  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17"/></svg>
        <span>
          <strong>Atenção:</strong> O período de subscrição desta loja expira em 
          <span style="color: #f59e0b; font-weight: 800;">${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}</span>. 
          Regularize a sua anuidade ou mensalidade para evitar o bloqueio do PDV.
        </span>
      </div>
      <button class="btn btn-secondary" id="btn-banner-instructions" style="padding: 3px 8px; font-size: 11px; border-color: #f59e0b; color: #fde68a;">
        Dados Bancários / M-Pesa
      </button>
    </div>
  `;

  banner.querySelector('#btn-banner-instructions').onclick = () => {
    openPaymentInstructionsModal();
  };
}

export function renderLockModal(lockStatus, userRole, onNavigate) {
  let modalEl = document.getElementById('active-lock-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'active-lock-modal';
    modalEl.className = 'modal-backdrop';
    document.body.appendChild(modalEl);
  }

  modalEl.innerHTML = `
    <div class="modal-dialog" style="max-width: 540px; border-color: #ef4444; box-shadow: 0 25px 50px -12px rgba(239, 68, 68, 0.35);">
      <div class="modal-header" style="background: rgba(239, 68, 68, 0.12); border-bottom-color: rgba(239, 68, 68, 0.3);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div>
            <h3 class="modal-title" style="color: #fca5a5; font-size: 16px;">Sistema Bloqueado - Licença Expirada</h3>
            <div style="font-size: 11px; color: #94a3b8;">Acesso temporariamente suspenso para esta filial</div>
          </div>
        </div>
      </div>

      <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
        <div style="text-align: center; padding: 14px; background: #1e293b; border-radius: 12px; border: 1px solid #334155;">
          <div style="font-size: 14px; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">
            ${lockStatus.store?.name || 'Filial GEF Ferragens'}
          </div>
          <p style="font-size: 12px; color: #fca5a5; line-height: 1.5; margin: 0;">
            ${lockStatus.reason || 'A mensalidade ou período de assinatura desta unidade expirou.'}
          </p>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
            As operações de Frente de Caixa (PDV), Emissão de Recibos e Estoque estão travadas até a liquidação.
          </div>
        </div>

        <!-- Instruções de Pagamento e Abertura do Sistema -->
        <div class="card" style="background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; padding: 14px; border-radius: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="font-size: 11px; font-weight: 800; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px;">
              Instruções para Pagamento e Abertura do Sistema
            </div>
            <button class="btn btn-secondary" id="btn-modal-copy-all" style="padding: 2px 8px; font-size: 10px; color: #cbd5e1;">
              Copiar Todas as Contas
            </button>
          </div>
          <div style="font-size: 12px; color: #cbd5e1; line-height: 1.5; margin-bottom: 12px;">
            Para reabertura e liberação imediata do sistema, transfira o valor da mensalidade para uma das seguintes contas oficiais:
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <!-- Millennium bim -->
            <div style="background: #1e293b; border: 1px solid #334155; padding: 10px 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; color: #f97316; font-weight: 800;">Millennium bim (Transferência Bancária)</div>
                <div style="font-size: 14px; font-weight: 800; font-family: var(--font-mono); color: #f8fafc;">863896066</div>
                <div style="font-size: 10px; color: #94a3b8;">Titular: GEF Sistemas Moçambique</div>
              </div>
              <button class="btn btn-secondary btn-copy-account" data-text="863896066" style="padding: 4px 10px; font-size: 11px;">
                Copiar
              </button>
            </div>

            <!-- Mpesa -->
            <div style="background: #1e293b; border: 1px solid #334155; padding: 10px 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; color: #ef4444; font-weight: 800;">M-Pesa (Vodacom)</div>
                <div style="font-size: 14px; font-weight: 800; font-family: var(--font-mono); color: #f8fafc;">+258 847640849</div>
                <div style="font-size: 10px; color: #94a3b8;">Titular: GEF Sistemas Moçambique</div>
              </div>
              <button class="btn btn-secondary btn-copy-account" data-text="+258847640849" style="padding: 4px 10px; font-size: 11px;">
                Copiar
              </button>
            </div>

            <!-- Esmola -->
            <div style="background: #1e293b; border: 1px solid #334155; padding: 10px 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; color: #f59e0b; font-weight: 800;">e-Mola / Esmola (Movitel)</div>
                <div style="font-size: 14px; font-weight: 800; font-family: var(--font-mono); color: #f8fafc;">+258 873091444</div>
                <div style="font-size: 10px; color: #94a3b8;">Titular: GEF Sistemas Moçambique</div>
              </div>
              <button class="btn btn-secondary btn-copy-account" data-text="+258873091444" style="padding: 4px 10px; font-size: 11px;">
                Copiar
              </button>
            </div>
          </div>

          <div style="margin-top: 10px; font-size: 11px; color: #94a3b8; line-height: 1.4;">
            Após transferir, envie o comprovativo para o WhatsApp <strong>+258 847640849</strong> para liberação imediata.
          </div>
        </div>

        <!-- Master Code unlock -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 11px; font-weight: 700; color: #cbd5e1;">Possui Chave Mestre de Liberação Emergencial?</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="input-master-code" placeholder="Ex: GEF-SUPERADMIN-2026" style="flex: 1; font-family: var(--font-mono); font-size: 13px; text-transform: uppercase;">
            <button class="btn btn-secondary" id="btn-apply-master-code" style="padding: 0 14px; font-weight: 700; color: #34d399; border-color: #10b981;">
              Desbloquear Loja
            </button>
          </div>
          <span style="font-size: 10px; color: #64748b;">Chave de suporte mestre: GEF-SUPERADMIN-2026</span>
        </div>
      </div>

      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <!-- Botão Voltar à Página de Login Normal -->
        <button class="btn btn-secondary" id="btn-lock-back-to-login" style="display: flex; align-items: center; gap: 6px; color: #94a3b8; border-color: #475569;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          <span>Voltar à Página de Login</span>
        </button>

        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" id="btn-open-payment-info" style="color: #f59e0b; border-color: #f59e0b;">
            Instruções para Pagamento e Abertura
          </button>
          <a href="https://wa.me/258847640849?text=Ol%C3%A1%2C+preciso+de+suporte+para+abertura+da+minha+loja+GEF.+Comprovativo+de+pagamento+anexo." target="_blank" class="btn btn-success" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>WhatsApp (+258 847640849)</span>
          </a>
        </div>
      </div>
    </div>
  `;

  // Voltar à Página de Login Normal
  modalEl.querySelector('#btn-lock-back-to-login').onclick = () => {
    auth.signOut();
    modalEl.remove();
    window.location.reload();
  };

  // Copy accounts
  modalEl.querySelectorAll('.btn-copy-account').forEach(btn => {
    btn.onclick = () => {
      const text = btn.getAttribute('data-text');
      navigator.clipboard.writeText(text);
      showToast(`Conta ${text} copiada para a área de transferência!`, 'success');
    };
  });

  const btnCopyAll = modalEl.querySelector('#btn-modal-copy-all');
  if (btnCopyAll) {
    btnCopyAll.onclick = () => {
      const text = `Contas Oficiais GEF para Pagamento e Abertura:\n- Millennium bim: 863896066\n- M-Pesa: +258 847640849\n- e-Mola / Esmola: +258 873091444\nEnviar comprovativo para +258 847640849`;
      navigator.clipboard.writeText(text);
      showToast('Todas as contas copiadas para a área de transferência!', 'success');
    };
  }

  // Master Code Unlock
  modalEl.querySelector('#btn-apply-master-code').onclick = () => {
    const code = modalEl.querySelector('#input-master-code').value;
    const storeId = db.getCurrentStoreId();
    const result = db.unlockWithMasterCode(storeId, code);
    if (result.success) {
      showToast(result.message, 'success');
      modalEl.remove();
      window.location.reload();
    } else {
      showToast(result.message, 'error');
    }
  };

  modalEl.querySelector('#btn-open-payment-info').onclick = () => {
    openPaymentInstructionsModal();
  };
}

export function openPaymentInstructionsModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.style.zIndex = '9999';

  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 500px;">
      <div class="modal-header">
        <h3 class="modal-title">Instruções para Pagamento e Abertura do Sistema</h3>
        <button class="modal-close-btn" id="btn-close-pay-info">✕</button>
      </div>
      <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
        <div style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
          Para efetuar a renovação da sua mensalidade ou regularizar a sua conta, realize a transferência para uma das contas oficiais abaixo:
        </div>

        <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #f97316; font-size: 13px; display: block; margin-bottom: 2px;">Millennium bim (Transferência Bancária)</strong>
            <div style="font-size: 15px; font-weight: 800; font-family: var(--font-mono); color: #f8fafc;">863896066</div>
            <div style="font-size: 11px; color: #94a3b8;">Titular: GEF Sistemas Moçambique</div>
          </div>
          <button class="btn btn-secondary btn-copy-pi" data-text="863896066" style="padding: 4px 10px; font-size: 11px;">Copiar</button>
        </div>

        <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #ef4444; font-size: 13px; display: block; margin-bottom: 2px;">M-Pesa (Vodacom)</strong>
            <div style="font-size: 15px; font-weight: 800; font-family: var(--font-mono); color: #f8fafc;">+258 847640849</div>
            <div style="font-size: 11px; color: #94a3b8;">Titular: GEF Sistemas Moçambique</div>
          </div>
          <button class="btn btn-secondary btn-copy-pi" data-text="+258847640849" style="padding: 4px 10px; font-size: 11px;">Copiar</button>
        </div>

        <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #f59e0b; font-size: 13px; display: block; margin-bottom: 2px;">e-Mola / Esmola (Movitel)</strong>
            <div style="font-size: 15px; font-weight: 800; font-family: var(--font-mono); color: #f8fafc;">+258 873091444</div>
            <div style="font-size: 11px; color: #94a3b8;">Titular: GEF Sistemas Moçambique</div>
          </div>
          <button class="btn btn-secondary btn-copy-pi" data-text="+258873091444" style="padding: 4px 10px; font-size: 11px;">Copiar</button>
        </div>

        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px; border-radius: 8px; font-size: 11px; color: #a7f3d0; line-height: 1.5;">
          <strong>Passos para abertura imediata:</strong><br>
          1. Efetue a transferência para qualquer uma das 3 contas.<br>
          2. Envie o comprovativo via WhatsApp para <strong>+258 847640849</strong>.<br>
          3. Informe o nome da sua filial. O sistema é liberado imediatamente pela nossa equipe.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="btn-close-pay-info-2" style="width: 100%;">Fechar</button>
      </div>
    </div>
  `;

  modal.querySelectorAll('.btn-copy-pi').forEach(btn => {
    btn.onclick = () => {
      const text = btn.getAttribute('data-text');
      navigator.clipboard.writeText(text);
      showToast(`Conta ${text} copiada!`, 'success');
    };
  });

  modal.querySelector('#btn-close-pay-info').onclick = () => modal.remove();
  modal.querySelector('#btn-close-pay-info-2').onclick = () => modal.remove();
  document.body.appendChild(modal);
}
