/**
 * GEF - GESTÃO FINANCEIRA | CONFIGURAÇÕES DO SISTEMA
 * JavaScript Puro (Vanilla JS)
 * 
 * Configurações de Empresa, Hardware, Lojas e Moeda/Idioma
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';
import { i18n, SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES } from '../../js/core/i18n.js';
import { normalizeRole } from '../../js/core/permissions.js';

export function initConfiguracoesModule(container) {
  const render = () => {
    const config = db.getConfig();
    const stores = db.getStores();
    const currentStoreId = db.getCurrentStoreId();
    const currentLang = i18n.getLanguage();
    const currentCurr = i18n.getCurrency();

    const currentUser = auth.getCurrentUser();
    const userRole = currentUser ? normalizeRole(currentUser.role, currentUser.id) : 'CASHIER';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 900px;">
        <!-- Header Card -->
        <div class="card" style="padding: 14px 20px;">
          <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">Configurações Gerais do ERP</h2>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            Dados fiscais da empresa, moeda & idioma, parâmetros de hardware (balança/impressora), lojas e assinatura SaaS.
          </div>
        </div>

        <!-- Section 0: Idioma e Moeda Internacional -->
        <div class="card">
          <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Regionalização: Moeda & Idioma do Sistema
          </h3>
          ${!isAdmin ? `
            <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px;">🔒</span>
              <span style="font-size: 11px; color: #fca5a5; font-weight: 700;">
                Acesso Restrito: Apenas o Administrador da Loja (ADMIN) tem permissão para alterar a Moeda e o Idioma operacional desta filial.
              </span>
            </div>
          ` : `
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 11px; color: #34d399;">
              ✓ Privilégio de Administrador ativo: as mudanças de Moeda e Idioma salvarão para todas as estações e PDVs desta filial.
            </div>
          `}
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Idioma da Interface:</label>
              <select id="cfg-system-lang" style="width: 100%;" ${!isAdmin ? 'disabled' : ''}>
                ${SUPPORTED_LANGUAGES.map(l => `
                  <option value="${l.id}" ${currentLang === l.id ? 'selected' : ''}>
                    ${l.flag} ${l.name}
                  </option>
                `).join('')}
              </select>
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Moeda Oficial de Operação:</label>
              <select id="cfg-system-curr" style="width: 100%;" ${!isAdmin ? 'disabled' : ''}>
                ${SUPPORTED_CURRENCIES.map(c => `
                  <option value="${c.id}" ${currentCurr === c.id ? 'selected' : ''}>
                    ${c.country} (${c.symbol} - ${c.code})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 8px;">
            Formatos monetários ativos: Moçambique (MT), Angola (Kz), Brasil (R$), África do Sul (R) e Estados Unidos ($).
          </div>
        </div>

        <!-- Section 1: Dados da Empresa -->
        <div class="card">
          <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Dados Fiscais & Comerciais
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Razão Social / Nome Fantasia:</label>
              <input type="text" id="cfg-company-name" value="${config.companyName || ''}" style="width: 100%;">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">NUIT / Documento Fiscal:</label>
              <input type="text" id="cfg-nuit" value="${config.nuit || ''}" style="width: 100%; font-family: var(--font-mono);">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Telefone / Linha de Apoio:</label>
              <input type="text" id="cfg-phone" value="${config.phone || ''}" style="width: 100%;">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Endereço Central:</label>
              <input type="text" id="cfg-address" value="${config.address || ''}" style="width: 100%;">
            </div>
          </div>
        </div>

        <!-- Section 2: Hardware (Impressora & Balança) -->
        <div class="card">
          <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
            Parâmetros de Periféricos & Hardware
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Largura do Recibo Térmico:</label>
              <select id="cfg-receipt-width" style="width: 100%;">
                <option value="80mm" ${config.receiptWidth === '80mm' ? 'selected' : ''}>Bobina 80mm (Padrão Comercial)</option>
                <option value="58mm" ${config.receiptWidth === '58mm' ? 'selected' : ''}>Bobina 58mm (Portátil / Mini)</option>
              </select>
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Protocolo da Balança Eletrônica (Serial):</label>
              <select id="cfg-scale-protocol" style="width: 100%;">
                <option value="TOLEDO_PRYT">Toledo Prix (Padrão 9600-8-N-1)</option>
                <option value="FILIZOLA">Filizola Platina</option>
                <option value="URANO">Urano Pop</option>
              </select>
            </div>
            <div style="grid-column: 1 / -1;">
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Mensagem de Rodapé nos Recibos:</label>
              <input type="text" id="cfg-receipt-footer" value="${config.receiptFooter || 'Obrigado pela preferência! Guarde este recibo para conferência na obra.'}" style="width: 100%;">
            </div>
          </div>
        </div>

        <!-- Section 3: Gestão de Lojas e Filiais -->
        <div class="card">
          <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            Filiais & Lojas Ativas
          </h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${stores.map(s => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #0f172a; border-radius: 8px; border: 1px solid #1f2937;">
                <div>
                  <strong style="color: #f8fafc; font-size: 13px;">${s.name}</strong>
                  <div style="font-size: 10px; color: #94a3b8;">${s.address || 'Moçambique'} • Status: <span style="color: #34d399;">ATIVO</span></div>
                </div>
                ${s.id === currentStoreId ? `
                  <span class="badge badge-emerald">LOJA ATIVA</span>
                ` : `
                  <button class="btn btn-secondary btn-switch-store-cfg" data-sid="${s.id}" style="padding: 4px 8px; font-size: 10px;">
                    Alternar para esta
                  </button>
                `}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Save Button Card -->
        <div class="card" style="padding: 16px 20px; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary" id="btn-save-all-config" style="padding: 10px 24px; font-size: 13px; font-weight: bold;">
            Salvar Configurações
          </button>
        </div>
      </div>
    `;

    // Save
    container.querySelector('#btn-save-all-config').onclick = () => {
      let selectedLang = currentLang;
      let selectedCurr = currentCurr;

      if (isAdmin) {
        selectedLang = container.querySelector('#cfg-system-lang').value;
        selectedCurr = container.querySelector('#cfg-system-curr').value;

        i18n.setLanguage(selectedLang);
        i18n.setCurrency(selectedCurr);

        // Explicitly update store record to guarantee persistence across the entire store
        const activeStore = db.getCurrentStore();
        if (activeStore) {
          activeStore.currency = selectedCurr;
          activeStore.language = selectedLang;
          db.saveStore(activeStore);
        }
      }

      const updated = {
        ...config,
        companyName: container.querySelector('#cfg-company-name').value.trim(),
        nuit: container.querySelector('#cfg-nuit').value.trim(),
        phone: container.querySelector('#cfg-phone').value.trim(),
        address: container.querySelector('#cfg-address').value.trim(),
        receiptWidth: container.querySelector('#cfg-receipt-width').value,
        scaleProtocol: container.querySelector('#cfg-scale-protocol').value,
        receiptFooter: container.querySelector('#cfg-receipt-footer').value.trim(),
        currency: selectedCurr,
        language: selectedLang
      };

      db.saveConfig(updated);
      showToast('Configurações salvas! Moeda e idioma atualizados para toda a loja.', 'success');
      
      // Dispatch events and refresh app to reflect new currency/language across all modules
      window.dispatchEvent(new CustomEvent('gef_currency_changed', { detail: selectedCurr }));
      window.dispatchEvent(new CustomEvent('gef_language_changed', { detail: selectedLang }));
      setTimeout(() => {
        window.location.reload();
      }, 600);
    };

    container.querySelectorAll('.btn-switch-store-cfg').forEach(b => {
      b.onclick = () => {
        const sid = b.getAttribute('data-sid');
        db.setCurrentStoreId(sid);
        showToast('Filial alternada!', 'success');
        render();
      };
    });
  };

  render();
}
