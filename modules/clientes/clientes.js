/**
 * GEF - GESTÃO FINANCEIRA | CLIENTES & CRÉDITO (FIADO)
 * JavaScript Puro (Vanilla JS)
 * 
 * Recursos implementados:
 * - Cadastro com valor de mensalidade manual e controle de expiração
 * - Alerta de renovação quando faltarem 5 dias para expirar
 * - Bloqueio automático de concessão de fiado na data de vencimento
 * - Botão "Cobrar" com relatório detalhado de cobrança e envio direto via WhatsApp/SMS
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';
import { i18n } from '../../js/core/i18n.js';

export function initClientesModule(container) {
  const storeId = db.getCurrentStoreId();
  let customers = db.getCustomers(storeId);
  let searchTerm = '';

  const checkSubscriptionStatus = (customer) => {
    if (!customer.subscriptionEndDate) return null;
    const now = new Date();
    const end = new Date(customer.subscriptionEndDate);
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      isExpired: diffDays <= 0,
      daysRemaining: diffDays,
      isNearExpiry: diffDays > 0 && diffDays <= 5,
      dateFormatted: end.toLocaleDateString('pt-PT')
    };
  };

  const render = () => {
    customers = db.getCustomers(storeId);

    const filtered = customers.filter(c => {
      const matchSearch = !searchTerm || 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.document || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });

    const totalReceivable = customers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
    const totalCreditLimit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    const customersInDebt = customers.filter(c => (c.currentDebt || 0) > 0).length;

    // Clientes com assinatura vencendo em até 5 dias
    const expiringSoonCount = customers.filter(c => {
      const s = checkSubscriptionStatus(c);
      return s && s.isNearExpiry;
    }).length;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 20px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">Clientes, Fiado & Gestão de Mensalidades</h2>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Controle rigoroso de limites de crédito para mestres de obra, cobranças via WhatsApp/SMS e renovação de assinaturas.
            </div>
          </div>
          <button class="btn btn-primary" id="btn-create-customer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            <span>Novo Cliente</span>
          </button>
        </div>

        ${expiringSoonCount > 0 ? `
          <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 8px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; color: #fde68a; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span><strong>Lembrete de Renovação:</strong> Há <strong>${expiringSoonCount}</strong> cliente(s) com mensalidade vencendo nos próximos 5 dias.</span>
            </div>
            <span class="badge badge-amber" style="font-size: 10px;">Atenção Necessária</span>
          </div>
        ` : ''}

        <!-- Metrics -->
        <div class="metrics-grid">
          <div class="card metric-card">
            <span class="metric-title">Total a Receber (Fiado Ativo)</span>
            <div class="metric-value" style="color: #fbbf24;">
              ${i18n.formatMoney(totalReceivable)}
            </div>
            <div class="metric-sub">${customersInDebt} clientes com débitos pendentes de quitação</div>
          </div>

          <div class="card metric-card">
            <span class="metric-title">Limite Total de Crédito Concedido</span>
            <div class="metric-value" style="color: #60a5fa;">
              ${i18n.formatMoney(totalCreditLimit)}
            </div>
            <div class="metric-sub">Teto de risco autorizado em carteira</div>
          </div>

          <div class="card metric-card">
            <span class="metric-title">Índice de Utilização do Crédito</span>
            <div class="metric-value" style="color: #34d399;">
              ${totalCreditLimit > 0 ? ((totalReceivable / totalCreditLimit) * 100).toFixed(1) : '0'}%
            </div>
            <div class="metric-sub">Margem média comprometida no fiado</div>
          </div>
        </div>

        <!-- Filter Bar Card -->
        <div class="card" style="padding: 12px 16px; display: flex; gap: 10px; align-items: center;">
          <input 
            type="text" 
            id="input-cust-search" 
            placeholder="Buscar por nome, NUIT ou telefone do cliente..." 
            value="${searchTerm}"
            style="flex: 1; font-size: 12px;"
          >
          <button class="btn btn-secondary" id="btn-cust-clear" style="padding: 6px 12px; font-size: 11px;">
            Limpar
          </button>
        </div>

        <!-- Customers Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>NUIT / Doc</th>
                  <th>Telefone</th>
                  <th>Mensalidade</th>
                  <th>Limite Autorizado</th>
                  <th>Dívida Atual (Fiado)</th>
                  <th>Status & Trava</th>
                  <th style="text-align: right;">Ações de Cobrança</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr><td colspan="8" style="text-align: center; color: #64748b; padding: 32px;">Nenhum cliente cadastrado.</td></tr>
                ` : filtered.map(c => {
                  const limit = c.creditLimit || 0;
                  const debt = c.currentDebt || 0;
                  const available = Math.max(0, limit - debt);
                  const isOver = debt >= limit && limit > 0;
                  const subStatus = checkSubscriptionStatus(c);

                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 700; color: #f8fafc;">${c.name}</div>
                        <div style="font-size: 10px; color: #94a3b8;">${c.address || 'Maputo'}</div>
                      </td>
                      <td>
                        <span style="font-family: var(--font-mono); color: #cbd5e1;">${c.document || c.taxId || 'Não informado'}</span>
                      </td>
                      <td>
                        <span style="font-size: 11px; color: #cbd5e1;">${c.phone || '-'}</span>
                      </td>
                      <td>
                        ${c.subscriptionFee ? `
                          <div style="font-size: 11px; font-weight: 700; color: #38bdf8;">${i18n.formatMoney(c.subscriptionFee)}</div>
                          ${subStatus ? `
                            <div style="font-size: 9px; color: ${subStatus.isExpired ? '#f87171' : subStatus.isNearExpiry ? '#fbbf24' : '#94a3b8'};">
                              ${subStatus.isExpired ? '⚠ Vencida em ' + subStatus.dateFormatted : subStatus.isNearExpiry ? `⏰ Vence em ${subStatus.daysRemaining}d` : 'Até ' + subStatus.dateFormatted}
                            </div>
                          ` : ''}
                        ` : `
                          <span style="font-size: 10px; color: #64748b;">Sem mensalidade</span>
                        `}
                      </td>
                      <td style="font-family: var(--font-mono); color: #cbd5e1;">
                        ${i18n.formatMoney(limit)}
                      </td>
                      <td>
                        <strong style="color: ${debt > 0 ? '#fbbf24' : '#64748b'}; font-family: var(--font-mono); font-size: 13px;">
                          ${i18n.formatMoney(debt)}
                        </strong>
                      </td>
                      <td>
                        ${subStatus?.isExpired ? `
                          <span class="badge badge-red" title="Assinatura vencida - Trava ativada">TRAVA ATIVA (VENCIDO)</span>
                        ` : subStatus?.isNearExpiry ? `
                          <span class="badge badge-amber" title="Faltam ${subStatus.daysRemaining} dias para expirar">RENOVAÇÃO (5 DIAS)</span>
                        ` : isOver ? `
                          <span class="badge badge-red">LIMITE ESGOTADO</span>
                        ` : debt > 0 ? `
                          <span class="badge badge-amber">COM DÉBITO</span>
                        ` : `
                          <span class="badge badge-emerald">REGULAR</span>
                        `}
                      </td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end; align-items: center;">
                          ${debt > 0 ? `
                            <!-- Botão Cobrar Obrigatório -->
                            <button 
                              class="btn btn-warning btn-charge-debt" 
                              data-cust-id="${c.id}" 
                              style="padding: 4px 8px; font-size: 10px; background: #ea580c; border-color: #ea580c; color: white; display: inline-flex; align-items: center; gap: 4px;"
                              title="Gerar relatório de cobrança e enviar WhatsApp/SMS"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                              <span>Cobrar</span>
                            </button>
                            <!-- Botão Receber Pagamento -->
                            <button class="btn btn-primary btn-pay-debt" data-cust-id="${c.id}" style="padding: 4px 8px; font-size: 10px; background: #10b981; border-color: #10b981;">
                              Receber
                            </button>
                          ` : ''}
                          <button class="btn btn-secondary btn-edit-cust" data-cust-id="${c.id}" style="padding: 4px 8px; font-size: 10px;">
                            Editar
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

    // Filter events
    const sInp = container.querySelector('#input-cust-search');
    sInp.oninput = (e) => {
      searchTerm = e.target.value;
      render();
      const ref = container.querySelector('#input-cust-search');
      if (ref) {
        ref.focus();
        ref.setSelectionRange(searchTerm.length, searchTerm.length);
      }
    };

    container.querySelector('#btn-cust-clear').onclick = () => {
      searchTerm = '';
      render();
    };

    // Create
    container.querySelector('#btn-create-customer').onclick = () => {
      openCustomerModal(null, () => render());
    };

    // Edit
    container.querySelectorAll('.btn-edit-cust').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-cust-id');
        const c = customers.find(item => item.id === id);
        if (c) openCustomerModal(c, () => render());
      };
    });

    // Pay Debt
    container.querySelectorAll('.btn-pay-debt').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-cust-id');
        const c = customers.find(item => item.id === id);
        if (c) openPayDebtModal(c, () => render());
      };
    });

    // Charge Debt (Cobrar)
    container.querySelectorAll('.btn-charge-debt').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-cust-id');
        const c = customers.find(item => item.id === id);
        if (c) openChargeDebtModal(c);
      };
    });
  };

  /**
   * Modal de Cadastro / Edição de Cliente com Mensalidade Manual e Trava
   */
  const openCustomerModal = (customer, onSuccess) => {
    const isEdit = !!customer;
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</h3>
          <button class="modal-close-btn" id="btn-close-cmodal">✕</button>
        </div>
        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Nome Completo / Razão Social:</label>
            <input type="text" id="inp-c-name" value="${customer?.name || ''}" placeholder="Ex: Mestre Armando Construções" required style="width: 100%;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">NUIT / Documento:</label>
              <input type="text" id="inp-c-doc" value="${customer?.document || customer?.taxId || ''}" placeholder="Ex: 400123987" style="width: 100%; font-family: var(--font-mono);">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Telefone / WhatsApp (Cobrança):</label>
              <input type="text" id="inp-c-phone" value="${customer?.phone || ''}" placeholder="+258 84 000 0000" style="width: 100%;">
            </div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Endereço / Local habitual da obra:</label>
            <input type="text" id="inp-c-address" value="${customer?.address || ''}" placeholder="Ex: Bairro Triunfo, Parcela 15" style="width: 100%;">
          </div>

          <!-- Limite de Crédito Fiado -->
          <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
            <label style="font-size: 11px; font-weight: 700; color: #ea580c; text-transform: uppercase; display: block; margin-bottom: 4px;">Limite de Crédito Autorizado (${i18n.getCurrency()}):</label>
            <input type="number" min="0" step="500" id="inp-c-limit" value="${customer?.creditLimit || 0}" style="width: 100%; font-size: 16px; font-weight: 900; font-family: var(--font-mono); color: #34d399;">
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
              Valor máximo acumulado permitido para compras fiado.
            </div>
          </div>

          <!-- Seção de Mensalidade & Trava Automática de Vencimento -->
          <div style="background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #3b82f6;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 800; color: #60a5fa; text-transform: uppercase;">Contrato de Mensalidade / Assinatura</span>
              <span style="font-size: 9px; color: #93c5fd; background: rgba(59, 130, 246, 0.15); padding: 2px 6px; border-radius: 4px;">Lembrete aos 5 dias</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 10px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 2px;">Valor Mensal Manual (${i18n.getCurrency()}):</label>
                <!-- Campo para inserção manual da mensalidade -->
                <input 
                  type="number" 
                  min="0" 
                  step="any" 
                  id="inp-c-sub-fee" 
                  value="${customer?.subscriptionFee || ''}" 
                  placeholder="Ex: 2500.00" 
                  style="width: 100%; font-size: 13px; font-weight: bold; color: #38bdf8;"
                >
              </div>
              <div>
                <label style="font-size: 10px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 2px;">Data Fim / Vencimento:</label>
                <input 
                  type="date" 
                  id="inp-c-sub-end" 
                  value="${customer?.subscriptionEndDate || ''}" 
                  style="width: 100%; font-size: 12px;"
                >
              </div>
            </div>
            <div style="font-size: 9px; color: #94a3b8; margin-top: 6px;">
              * O sistema ativará automaticamente as travas de bloqueio no dia em que a subscrição terminar, enviando alerta de renovação nos 5 dias prévios.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-cmodal">Cancelar</button>
          <button class="btn btn-primary" id="btn-save-cust">${isEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-cmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-cmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-save-cust').onclick = () => {
      const name = modal.querySelector('#inp-c-name').value.trim();
      if (!name) {
        showToast('Nome do cliente é obrigatório.', 'error');
        return;
      }

      const subFeeRaw = modal.querySelector('#inp-c-sub-fee').value;
      const subFee = subFeeRaw !== '' ? parseFloat(subFeeRaw) : null;
      const subEnd = modal.querySelector('#inp-c-sub-end').value || null;

      const saved = {
        id: customer?.id || 'cust-' + Date.now(),
        storeId,
        name,
        document: modal.querySelector('#inp-c-doc').value.trim(),
        taxId: modal.querySelector('#inp-c-doc').value.trim(),
        phone: modal.querySelector('#inp-c-phone').value.trim(),
        address: modal.querySelector('#inp-c-address').value.trim(),
        creditLimit: parseFloat(modal.querySelector('#inp-c-limit').value) || 0,
        subscriptionFee: subFee,
        subscriptionEndDate: subEnd,
        currentDebt: customer?.currentDebt || 0
      };

      db.saveCustomer(saved);
      showToast(`Cliente ${saved.name} salvo com sucesso!`, 'success');
      modal.remove();
      if (onSuccess) onSuccess();
    };

    document.body.appendChild(modal);
  };

  /**
   * Modal de Cobrança de Fiado (WhatsApp / SMS / Relatório de Cobrança)
   */
  const openChargeDebtModal = (customer) => {
    const store = db.getCurrentStore();
    const sales = db.getSales(storeId).filter(s => 
      s.customerId === customer.id && 
      (s.paymentMethod === 'A_PRAZO' || s.paymentMethod === 'FIADO')
    );

    const storeName = store.tradeName || store.name || 'GEF Ferragens';
    const currency = i18n.getCurrency();
    const totalDebtFormatted = i18n.formatMoney(customer.currentDebt);

    // Mensagem formatada para WhatsApp / SMS
    const chargeMessage = `Prezado(a) ${customer.name}, esperamos que esteja bem.\n\n` +
      `Informamos que consta em aberto na *${storeName}* um saldo pendente de *${totalDebtFormatted}* referente a compras a prazo (fiado) de materiais de construção.\n\n` +
      `Solicitamos a gentileza de regularizar a sua conta via M-Pesa, e-Mola ou no nosso balcão para liberação de novo crédito na obra.\n\n` +
      `Contacto da Loja: ${store.phone || '+258 84 000 0000'}\n` +
      `Agradecemos desde já a sua preferência e colaboração!`;

    const cleanPhone = (customer.phone || '').replace(/[^\d+]/g, '');
    const encodedMsg = encodeURIComponent(chargeMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
    const smsUrl = `sms:${cleanPhone}?body=${encodedMsg}`;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 500px;">
        <div class="modal-header" style="border-bottom-color: rgba(234, 88, 12, 0.4);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <h3 class="modal-title" style="color: #fb923c;">Relatório de Cobrança de Fiado</h3>
          </div>
          <button class="modal-close-btn" id="btn-close-chargemodal">✕</button>
        </div>

        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
          <!-- Informações do Cliente -->
          <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; font-size: 14px; color: #f8fafc;">${customer.name}</div>
              <div style="font-size: 11px; color: #94a3b8;">Tel: <span style="color: #38bdf8;">${customer.phone || 'Sem telefone'}</span> | Doc: ${customer.document || 'N/A'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Dívida a Cobrar</div>
              <div style="font-size: 18px; font-weight: 900; color: #fbbf24; font-family: var(--font-mono);">${totalDebtFormatted}</div>
            </div>
          </div>

          <!-- Itens a Cobrar / Extrato Recente -->
          <div>
            <div style="font-size: 11px; font-weight: 800; color: #cbd5e1; margin-bottom: 6px; text-transform: uppercase;">
              Itens a Cobrar (Histórico de Compras Fiado):
            </div>
            <div style="max-height: 120px; overflow-y: auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px;">
              ${sales.length === 0 ? `
                <div style="font-size: 11px; color: #94a3b8; text-align: center; padding: 8px;">Dívida consolidada em carteira anterior: ${totalDebtFormatted}</div>
              ` : `
                <table style="width: 100%; font-size: 10px; color: #cbd5e1;">
                  <thead>
                    <tr style="color: #94a3b8; border-bottom: 1px solid #334155;">
                      <th style="text-align: left; padding: 2px;">Recibo</th>
                      <th style="text-align: left; padding: 2px;">Data</th>
                      <th style="text-align: right; padding: 2px;">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sales.map(s => `
                      <tr style="border-bottom: 1px solid #1e293b;">
                        <td style="padding: 3px 2px; font-family: monospace;">${s.code || s.id.slice(0, 8)}</td>
                        <td style="padding: 3px 2px;">${new Date(s.createdAt || s.timestamp).toLocaleDateString('pt-PT')}</td>
                        <td style="padding: 3px 2px; text-align: right; font-weight: bold; color: #fbbf24;">${i18n.formatMoney(s.total || s.totalNet)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `}
            </div>
          </div>

          <!-- Mensagem Pronta de Notificação -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1;">Mensagem de Cobrança:</label>
              <button type="button" id="btn-copy-msg" style="background: none; border: none; color: #38bdf8; font-size: 10px; cursor: pointer; text-decoration: underline;">
                Copiar Mensagem
              </button>
            </div>
            <textarea id="charge-text-preview" rows="5" style="width: 100%; font-size: 11px; background: #0b0f19; border: 1px solid #334155; color: #e2e8f0; padding: 8px; border-radius: 6px; resize: vertical;">${chargeMessage}</textarea>
          </div>

          <!-- Ações de Envio Direto -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <a 
              href="${whatsappUrl}" 
              target="_blank" 
              rel="noopener noreferrer" 
              id="link-send-whatsapp"
              class="btn" 
              style="background: #22c55e; border-color: #22c55e; color: #fff; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; font-size: 12px; font-weight: 800; border-radius: 8px;"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span>Enviar WhatsApp</span>
            </a>

            <a 
              href="${smsUrl}" 
              id="link-send-sms"
              class="btn btn-secondary" 
              style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; font-size: 12px; font-weight: 800; border-radius: 8px;"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <span>Enviar via SMS</span>
            </a>
          </div>
        </div>

        <div class="modal-footer" style="display: flex; justify-content: space-between;">
          <button class="btn btn-secondary" id="btn-print-charge" style="font-size: 11px;">
            🖨 Imprimir Extrato
          </button>
          <button class="btn btn-secondary" id="btn-close-charge">Fechar</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-chargemodal').onclick = () => modal.remove();
    modal.querySelector('#btn-close-charge').onclick = () => modal.remove();

    // Copiar
    modal.querySelector('#btn-copy-msg').onclick = () => {
      const txt = modal.querySelector('#charge-text-preview').value;
      navigator.clipboard.writeText(txt).then(() => {
        showToast('Mensagem de cobrança copiada para a área de transferência!', 'success');
      }).catch(() => {
        showToast('Texto selecionado, pressione Ctrl+C', 'info');
      });
    };

    // Imprimir
    modal.querySelector('#btn-print-charge').onclick = () => {
      window.print();
    };

    document.body.appendChild(modal);
  };

  /**
   * Modal de Amortização / Pagamento de Fiado
   */
  const openPayDebtModal = (customer, onSuccess) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 420px;">
        <div class="modal-header" style="border-bottom-color: rgba(16, 185, 129, 0.4);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <h3 class="modal-title" style="color: #6ee7b7;">Receber Pagamento de Fiado</h3>
          </div>
          <button class="modal-close-btn" id="btn-close-pdmodal">✕</button>
        </div>

        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div style="background: #1e293b; padding: 10px; border-radius: 8px; border: 1px solid #334155;">
            <div style="font-size: 12px; font-weight: bold; color: #fff;">${customer.name}</div>
            <div style="font-size: 11px; color: #94a3b8;">Dívida Pendente: <strong style="color: #fbbf24;">${i18n.formatMoney(customer.currentDebt)}</strong></div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Valor a Amortizar (${i18n.getCurrency()}):</label>
            <input type="number" min="1" max="${customer.currentDebt}" step="any" id="inp-pd-val" value="${customer.currentDebt}" style="width: 100%; font-size: 18px; font-weight: 900; font-family: var(--font-mono); color: #34d399;">
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Forma de Recebimento:</label>
            <select id="sel-pd-method" style="width: 100%;">
              <option value="DINHEIRO">Dinheiro Físico (Entra no Caixa Ativo)</option>
              <option value="M-PESA">M-Pesa (Vodacom)</option>
              <option value="E-MOLA">e-Mola (Movitel)</option>
              <option value="POS_CARTAO">Cartão POS / TPA</option>
              <option value="TRANSFERENCIA">Transferência Bancária</option>
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-pdmodal">Cancelar</button>
          <button class="btn btn-primary" id="btn-confirm-pay" style="background: #10b981; border-color: #10b981;">
            Confirmar Recebimento
          </button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-pdmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-pdmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-confirm-pay').onclick = () => {
      const val = parseFloat(modal.querySelector('#inp-pd-val').value) || 0;
      const method = modal.querySelector('#sel-pd-method').value;

      if (val <= 0 || val > customer.currentDebt) {
        showToast('Valor de amortização inválido.', 'error');
        return;
      }

      // Reduz a dívida
      customer.currentDebt = Math.max(0, customer.currentDebt - val);
      db.saveCustomer(customer);

      // Se for dinheiro, soma ao caixa ativo
      if (method === 'DINHEIRO') {
        const activeSession = db.getActiveCashSession(storeId);
        if (activeSession) {
          activeSession.cashInDrawer += val;
          activeSession.cashSales = (activeSession.cashSales || 0) + val;
          db.saveCashSession(activeSession);
        }
      }

      showToast(`Recebimento de ${i18n.formatMoney(val)} efetuado com sucesso! Saldo restante: ${i18n.formatMoney(customer.currentDebt)}`, 'success');
      modal.remove();
      if (onSuccess) onSuccess();
    };

    document.body.appendChild(modal);
  };

  render();
}
