/**
 * GEF - GESTÃO FINANCEIRA | MÓDULO DE EMBAIXADORES & PARCEIROS
 * JavaScript Puro (Vanilla JS)
 * Suporta visão do Embaixador (cadastro de novas lojas, tempo de comissão e extrato)
 * e do Superadmin (gestão global e liquidação com valor da comissão zerado).
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';
import { normalizeRole } from '../../js/core/permissions.js';

export function initEmbaixadoresModule(container) {
  const currentUser = auth.getCurrentUser();
  const userRole = currentUser ? normalizeRole(currentUser.role, currentUser.id) : 'EMBAIXADOR';
  const isSuperadmin = userRole === 'SUPERADMIN';

  // State to toggle between superadmin view and previewing an ambassador
  let previewAmbassadorId = null;

  const render = () => {
    // Role-based visibility enforcement
    if (!isSuperadmin && userRole !== 'EMBAIXADOR') {
      container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 40px auto; text-align: center; padding: 36px 24px;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; color: #f87171;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0 0 8px 0;">Módulo de Acesso Restrito</h2>
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0;">
            O Portal de Embaixadores é reservado exclusivamente a parceiros credenciados e à administração central da plataforma. O seu perfil atual (<strong>${userRole}</strong>) visualiza apenas as rotinas pertinentes à sua função.
          </p>
          <div style="font-size: 11px; color: #64748b;">
            Utilize o menu lateral para acessar os módulos da sua loja.
          </div>
        </div>
      `;
      return;
    }

    const ambassadors = db.getAmbassadors();

    if (isSuperadmin && !previewAmbassadorId) {
      renderSuperadminView(container, ambassadors);
    } else {
      // Find current ambassador profile or previewed one
      let myProfile;
      if (previewAmbassadorId) {
        myProfile = ambassadors.find(a => a.id === previewAmbassadorId) || ambassadors[0];
      } else {
        myProfile = ambassadors.find(a => a.id === currentUser?.id || a.email === currentUser?.email) || ambassadors[0];
      }
      renderAmbassadorPortal(container, myProfile, isSuperadmin);
    }
  };

  // --- 1. VISÃO DO EMBAIXADOR (PORTAL DO PARCEIRO) ---
  const renderAmbassadorPortal = (target, amb, isSuperadminSimulating = false) => {
    const stores = amb.registeredStores || [];
    const payouts = amb.payoutHistory || [];
    const activeStores = stores.filter(s => s.paymentStatus === 'PAGO').length;
    const pendingCommissions = amb.pendingCommissions || 0;
    const paidCommissions = amb.paidCommissions || 0;

    target.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${isSuperadminSimulating ? `
          <!-- Bar when Super Admin is simulating ambassador view -->
          <div class="card" style="background: rgba(234, 88, 12, 0.15); border: 1px solid #ea580c; display: flex; justify-content: space-between; align-items: center; padding: 10px 16px;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #fed7aa; font-weight: 700;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16"/></svg>
              <span>Visualizando como Embaixador: <strong>${amb.name}</strong> (${amb.code})</span>
            </div>
            <button class="btn btn-secondary" id="btn-exit-preview" style="padding: 4px 10px; font-size: 11px;">
              Voltar ao Painel Super Admin
            </button>
          </div>
        ` : ''}

        <!-- Header Card -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.5px;">
                Programa Oficial de Embaixadores & Expansão SaaS GEF
              </div>
              <h2 style="font-size: 18px; font-weight: 900; color: #f8fafc; margin: 2px 0 0 0;">
                Painel do Embaixador: ${amb.name}
              </h2>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                Cadastre novas lojas de ferragens e receba comissão recorrente durante toda a vigência do contrato.
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="badge badge-emerald">PARCEIRO CREDENCIADO</span>
            </div>
          </div>
        </div>

        <!-- Ambassador Credentials & Details Card -->
        <div class="card" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-color: #3b82f6;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div>
              <div style="font-size: 11px; color: #93c5fd; font-weight: 700; text-transform: uppercase;">
                Seu Código de Embaixador Oficial:
              </div>
              <div style="font-size: 24px; font-weight: 900; color: #ffffff; font-family: var(--font-mono); letter-spacing: 1px; margin: 4px 0;">
                ${amb.code}
              </div>
              <div style="font-size: 11px; color: #cbd5e1;">
                Taxa de comissão contratada: <strong style="color: #34d399;">${amb.commissionRate}%</strong> sobre a mensalidade de cada loja cadastrada.
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                Destino das liquidações: <strong style="color: #f8fafc;">${amb.paymentDetails || 'M-Pesa (+258 84 764 0849)'}</strong>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="font-size: 11px; color: #94a3b8;">Link de credenciamento do embaixador:</div>
              <div style="display: flex; gap: 8px;">
                <input type="text" readonly value="https://gef.co.mz/adesao?embaixador=${amb.code}" id="inp-ref-link" style="font-size: 11px; width: 280px; font-family: var(--font-mono); background: #020617; border-color: #334155; color: #93c5fd;">
                <button class="btn btn-primary" id="btn-copy-ref-link" style="padding: 6px 14px; font-size: 11px;">
                  Copiar Link
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Metrics Grid Cards -->
        <div class="metrics-grid">
          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Lojas Cadastradas por Mim</div>
            <div style="font-size: 24px; font-weight: 900; color: #f8fafc; font-family: var(--font-mono); margin-top: 4px;">
              ${stores.length}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Ferragens e depósitos angariados</div>
          </div>

          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Lojas com Pagamento em Dia</div>
            <div style="font-size: 24px; font-weight: 900; color: #34d399; font-family: var(--font-mono); margin-top: 4px;">
              ${activeStores}
            </div>
            <div style="font-size: 10px; color: #10b981; margin-top: 2px;">Gerando comissões ativas</div>
          </div>

          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Comissão a Receber (Saldo Disponível)</div>
            <div style="font-size: 24px; font-weight: 900; color: ${pendingCommissions === 0 ? '#34d399' : '#fbbf24'}; font-family: var(--font-mono); margin-top: 4px;">
              ${pendingCommissions.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 12px; color: ${pendingCommissions === 0 ? '#10b981' : '#f59e0b'};">MT</span>
            </div>
            <div style="font-size: 10px; color: ${pendingCommissions === 0 ? '#10b981' : '#f59e0b'}; margin-top: 2px;">
              ${pendingCommissions === 0 ? '✓ Saldo ZERADO (Totalmente liquidado)' : 'Aguardando liquidação pelo Super Admin'}
            </div>
          </div>

          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Total de Comissões Já Recebidas</div>
            <div style="font-size: 24px; font-weight: 900; color: #60a5fa; font-family: var(--font-mono); margin-top: 4px;">
              ${paidCommissions.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 12px; color: #3b82f6;">MT</span>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Já transferidas via M-Pesa / Banco</div>
          </div>
        </div>

        <!-- FORM: Cadastro de Novas Lojas pelo Embaixador -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #1f2937; padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg>
              <h3 style="font-size: 15px; font-weight: 800; color: #f8fafc; margin: 0;">
                Cadastrar Nova Loja Parceira
              </h3>
            </div>
            <span style="font-size: 11px; color: #94a3b8;">Cadastre ferragens indicadas para começar a faturar</span>
          </div>

          <form id="form-add-referred-store" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Nome da Loja / Ferragem: *</label>
                <input type="text" id="inp-ns-name" placeholder="Ex: Ferragens Progresso da Beira, Lda" required style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Nome do Proprietário / Responsável: *</label>
                <input type="text" id="inp-ns-owner" placeholder="Ex: Armando Macamo" required style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Telefone / WhatsApp do Proprietário: *</label>
                <input type="text" id="inp-ns-phone" placeholder="+258 84 000 0000" required style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Cidade / Província: *</label>
                <input type="text" id="inp-ns-city" placeholder="Ex: Beira, Sofala" required style="width: 100%;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Plano da Mensalidade SaaS: *</label>
                <select id="sel-ns-plan" style="width: 100%;">
                  <option value="2500">Plano Básico – 2.500,00 MT/mês</option>
                  <option value="3500" selected>Plano Profissional – 3.500,00 MT/mês</option>
                  <option value="4500">Plano Empresarial – 4.500,00 MT/mês</option>
                  <option value="6000">Plano Rede Multi-Lojas – 6.000,00 MT/mês</option>
                </select>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Tempo de Vigência da Comissão: *</label>
                <select id="sel-ns-duration" style="width: 100%;">
                  <option value="12" selected>12 Meses (1 Ano de comissão mensal)</option>
                  <option value="24">24 Meses (2 Anos de comissão mensal)</option>
                  <option value="36">36 Meses (3 Anos de comissão mensal)</option>
                  <option value="999">Contrato Vitalício (Enquanto a loja pagar)</option>
                </select>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Sua Comissão Mensal Estimada:</label>
                <div id="disp-calc-commission" style="font-size: 14px; font-weight: 800; color: #34d399; font-family: var(--font-mono); padding: 8px 12px; background: #0f172a; border-radius: 6px; border: 1px solid #334155;">
                  525,00 MT / mês (${amb.commissionRate}%)
                </div>
              </div>
              <div style="display: flex; align-items: flex-end;">
                <button type="submit" class="btn btn-primary" id="btn-save-new-store" style="width: 100%; padding: 10px 16px; font-weight: 800; background: #10b981; border-color: #10b981;">
                  + Cadastrar Nova Loja & Iniciar Comissão
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- TABLE: Situação de Pagamento das Lojas e Tempo de Comissão -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 16px; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin: 0;">
                Lojas Cadastradas por Mim, Situação de Pagamento & Tempo de Comissão
              </h3>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                Acompanhe o estado de pagamento de cada filial e a vigência temporal da sua comissão.
              </div>
            </div>
            <span class="badge badge-blue">${stores.length} LOJAS REGISTRADAS</span>
          </div>

          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Loja / Ferragem</th>
                  <th>Proprietário / Telefone</th>
                  <th>Mensalidade (MT)</th>
                  <th>Situação de Pagamento da Loja</th>
                  <th>Quanto Tempo de Comissão</th>
                  <th>Comissão Recebida (MT/mês)</th>
                  <th>Total Gerado (MT)</th>
                </tr>
              </thead>
              <tbody>
                ${stores.length === 0 ? `
                  <tr><td colspan="7" style="text-align: center; color: #64748b; padding: 28px;">Nenhuma loja cadastrada ainda. Utilize o formulário acima para registrar sua primeira loja indicada.</td></tr>
                ` : stores.map(s => {
                  const isPaid = s.paymentStatus === 'PAGO';
                  const isPending = s.paymentStatus === 'PENDENTE';
                  const statusBadge = isPaid 
                    ? `<span class="badge badge-emerald">✓ PAGO / EM DIA</span>`
                    : isPending
                      ? `<span class="badge badge-amber">⏳ PENDENTE</span>`
                      : `<span class="badge badge-red">✕ ATRASADO / BLOQUEADO</span>`;

                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 800; color: #f8fafc;">${s.name}</div>
                        <div style="font-size: 11px; color: #94a3b8;">${s.city || 'Maputo'} • Cadastrada em ${s.registeredAt ? s.registeredAt.split('T')[0] : '2026'}</div>
                      </td>
                      <td>
                        <div style="font-weight: 700; color: #cbd5e1;">${s.ownerName || 'Responsável'}</div>
                        <div style="font-size: 11px; font-family: var(--font-mono); color: #94a3b8;">${s.phone || '+258 84 ...'}</div>
                      </td>
                      <td style="font-family: var(--font-mono); font-weight: 700; color: #f8fafc;">
                        ${(s.monthlyFee || 3500).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </td>
                      <td>
                        <div>${statusBadge}</div>
                        <div style="font-size: 10px; color: #94a3b8; margin-top: 3px;">
                          Último: ${s.lastPaymentDate || '01/09/2026'} | Prox: ${s.nextDueDate || '01/10/2026'}
                        </div>
                      </td>
                      <td>
                        <div style="font-weight: 800; color: #60a5fa; font-size: 12px;">
                          ${s.commissionDurationText || (s.contractDurationMonths ? `${s.contractDurationMonths} meses` : '12 meses')}
                        </div>
                        <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">
                          ${s.monthsActive ? `Ativa há ${s.monthsActive} meses` : 'Vigência em andamento'}
                        </div>
                      </td>
                      <td>
                        <strong style="color: #34d399; font-family: var(--font-mono); font-size: 13px;">
                          +${(s.monthlyCommission || (s.monthlyFee * amb.commissionRate / 100) || 525).toFixed(2)} MT/mês
                        </strong>
                        <div style="font-size: 10px; color: #94a3b8;">Taxa: ${s.commissionRate || amb.commissionRate}%</div>
                      </td>
                      <td style="font-family: var(--font-mono); font-weight: 800; color: #f8fafc;">
                        ${(s.totalCommissionEarned || (s.monthlyCommission * (s.monthsActive || 1)) || 1575).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- TABLE: Extrato de Pagamentos Realizados pelo Super Admin -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 16px; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin: 0;">
                Extrato de Comissões Pagas pelo Super Administrador
              </h3>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                Histórico de transferências liquidadas e comprovantes gerados pelo Super Admin.
              </div>
            </div>
            <span class="badge badge-emerald">${payouts.length} LIQUIDAÇÕES</span>
          </div>

          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nº da Liquidação</th>
                  <th>Data & Hora</th>
                  <th>Valor Pago</th>
                  <th>Forma de Transferência</th>
                  <th>Recibo / Comprovante</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${payouts.length === 0 ? `
                  <tr><td colspan="6" style="text-align: center; color: #64748b; padding: 24px;">Nenhuma liquidação registrada ainda.</td></tr>
                ` : payouts.map(p => `
                  <tr>
                    <td><strong>${p.id}</strong></td>
                    <td style="font-size: 11px; color: #cbd5e1;">${p.date}</td>
                    <td style="color: #34d399; font-weight: 900; font-family: var(--font-mono); font-size: 13px;">
                      ${p.amount.toFixed(2)} MT
                    </td>
                    <td>${p.method}</td>
                    <td>
                      <span style="font-family: var(--font-mono); color: #cbd5e1; background: #0f172a; padding: 2px 6px; border-radius: 4px; font-size: 11px;">
                        ${p.receipt}
                      </span>
                    </td>
                    <td><span class="badge badge-emerald">${p.status || 'LIQUIDADO'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Events
    const btnExit = target.querySelector('#btn-exit-preview');
    if (btnExit) {
      btnExit.onclick = () => {
        previewAmbassadorId = null;
        render();
      };
    }

    target.querySelector('#btn-copy-ref-link').onclick = () => {
      const link = target.querySelector('#inp-ref-link').value;
      navigator.clipboard.writeText(link).then(() => {
        showToast('Link de credenciamento copiado com sucesso!', 'success');
      }).catch(() => {
        showToast('Link copiado: ' + link, 'info');
      });
    };

    // Calculate commission display on plan change
    const selPlan = target.querySelector('#sel-ns-plan');
    const dispCalc = target.querySelector('#disp-calc-commission');
    selPlan.onchange = () => {
      const fee = parseFloat(selPlan.value) || 3500;
      const comm = (fee * amb.commissionRate) / 100;
      dispCalc.textContent = `${comm.toFixed(2)} MT / mês (${amb.commissionRate}%)`;
    };

    // Form submit: Cadastrar Nova Loja
    const formNewStore = target.querySelector('#form-add-referred-store');
    formNewStore.onsubmit = (e) => {
      e.preventDefault();
      const name = target.querySelector('#inp-ns-name').value.trim();
      const ownerName = target.querySelector('#inp-ns-owner').value.trim();
      const phone = target.querySelector('#inp-ns-phone').value.trim();
      const city = target.querySelector('#inp-ns-city').value.trim();
      const monthlyFee = parseFloat(target.querySelector('#sel-ns-plan').value) || 3500;
      const contractDurationMonths = parseInt(target.querySelector('#sel-ns-duration').value) || 12;

      if (!name || !ownerName || !phone || !city) {
        showToast('Por favor, preencha todos os campos obrigatórios da nova loja.', 'error');
        return;
      }

      try {
        const newStore = db.addAmbassadorReferredStore(amb.id, {
          name,
          ownerName,
          phone,
          city,
          monthlyFee,
          contractDurationMonths,
          commissionRate: amb.commissionRate,
          paymentStatus: 'PAGO'
        });

        showToast(`Loja ${name} cadastrada com sucesso! Comissão inicial adicionada ao seu saldo.`, 'success');
        render();
      } catch (err) {
        showToast('Erro ao cadastrar loja: ' + err.message, 'error');
      }
    };
  };

  // --- 2. VISÃO DO SUPERADMIN (GESTÃO DE EMBAIXADORES & LIQUIDAÇÃO DE COMISSÕES) ---
  const renderSuperadminView = (target, ambassadors) => {
    const totalAmbassadors = ambassadors.length;
    const totalStoresReferred = ambassadors.reduce((sum, a) => sum + (a.registeredStores ? a.registeredStores.length : 0), 0);
    const totalCommissionsPending = ambassadors.reduce((sum, a) => sum + (a.pendingCommissions || 0), 0);
    const totalCommissionsPaid = ambassadors.reduce((sum, a) => sum + (a.paidCommissions || 0), 0);

    target.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px;">
                Governança Global SaaS • Superadmin Independente
              </div>
              <h2 style="font-size: 18px; font-weight: 900; color: #f8fafc; margin: 2px 0 0 0;">
                Gestão Estratégica de Embaixadores & Liquidação de Comissões
              </h2>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                Cadastre parceiros, acompanhe lojas angariadas e efetue liquidações de comissões via M-Pesa / e-Mola / Banco.
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary" id="btn-create-ambassador">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                <span>+ Novo Embaixador</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Metrics Grid in Cards -->
        <div class="metrics-grid">
          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Embaixadores Cadastrados</div>
            <div style="font-size: 24px; font-weight: 900; color: #f8fafc; font-family: var(--font-mono); margin-top: 4px;">
              ${totalAmbassadors}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Parceiros comerciais ativos</div>
          </div>

          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Total de Lojas Angariadas</div>
            <div style="font-size: 24px; font-weight: 900; color: #60a5fa; font-family: var(--font-mono); margin-top: 4px;">
              ${totalStoresReferred}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Novas filiais contratadas via embaixadores</div>
          </div>

          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Comissões Pendentes a Pagar</div>
            <div style="font-size: 24px; font-weight: 900; color: #fbbf24; font-family: var(--font-mono); margin-top: 4px;">
              ${totalCommissionsPending.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 12px; color: #f59e0b;">MT</span>
            </div>
            <div style="font-size: 10px; color: #f59e0b; margin-top: 2px;">Aguardando clique de "Efetuar Pagamento"</div>
          </div>

          <div class="card">
            <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Comissões Já Liquidadas</div>
            <div style="font-size: 24px; font-weight: 900; color: #34d399; font-family: var(--font-mono); margin-top: 4px;">
              ${totalCommissionsPaid.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 12px; color: #10b981;">MT</span>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Valores já pagos e zerados</div>
          </div>
        </div>

        <!-- Ambassadors Management Table Card -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 16px; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin: 0;">
              Embaixadores, Lojas Cadastradas & Liquidação de Comissões
            </h3>
            <span style="font-size: 11px; color: #94a3b8;">Clique em "Efetuar Pagamento" para zerar a comissão do embaixador</span>
          </div>

          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Embaixador</th>
                  <th>Dados de Pagamento</th>
                  <th>Código de Indicação</th>
                  <th>Lojas Cadastradas</th>
                  <th>Taxa (%)</th>
                  <th>Comissão Pendente (Saldo)</th>
                  <th>Total Já Pago</th>
                  <th style="text-align: right;">Ações do Super Admin</th>
                </tr>
              </thead>
              <tbody>
                ${ambassadors.map(a => {
                  const storesCount = a.registeredStores ? a.registeredStores.length : (a.totalStores || 0);
                  const pending = a.pendingCommissions || 0;
                  const paid = a.paidCommissions || 0;

                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 800; color: #f8fafc;">${a.name}</div>
                        <div style="font-size: 11px; color: #94a3b8;">${a.phone} • ${a.email}</div>
                      </td>
                      <td>
                        <div style="font-size: 11px; color: #34d399; font-weight: 700;">${a.paymentDetails || 'M-Pesa'}</div>
                      </td>
                      <td>
                        <span style="font-family: var(--font-mono); font-weight: 800; color: #60a5fa; background: #1e293b; padding: 2px 6px; border-radius: 4px;">
                          ${a.code}
                        </span>
                      </td>
                      <td>
                        <strong style="color: #f8fafc;">${storesCount} lojas</strong>
                        <div style="font-size: 10px; color: #94a3b8;">${(a.registeredStores || []).filter(s => s.paymentStatus === 'PAGO').length} ativas/em dia</div>
                      </td>
                      <td style="font-family: var(--font-mono); font-weight: 700;">
                        ${a.commissionRate}%
                      </td>
                      <td>
                        <strong style="color: ${pending > 0 ? '#fbbf24' : '#34d399'}; font-family: var(--font-mono); font-size: 14px;">
                          ${pending.toFixed(2)} MT
                        </strong>
                        <div style="font-size: 10px; color: ${pending > 0 ? '#f59e0b' : '#10b981'};">
                          ${pending === 0 ? '✓ ZERADO (Em dia)' : 'Pendente de liquidação'}
                        </div>
                      </td>
                      <td style="font-family: var(--font-mono); color: #cbd5e1; font-weight: 700;">
                        ${paid.toFixed(2)} MT
                      </td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                          ${pending > 0 ? `
                            <button class="btn btn-primary btn-payout-amb" data-id="${a.id}" style="padding: 5px 10px; font-size: 11px; background: #10b981; border-color: #10b981; font-weight: 800;">
                              Efetuar Pagamento
                            </button>
                          ` : `
                            <span class="badge badge-emerald" style="font-size: 9px; padding: 4px 8px;">COMISSÃO ZERADA</span>
                          `}
                          <button class="btn btn-secondary btn-simulate-amb" data-id="${a.id}" style="padding: 5px 8px; font-size: 11px;" title="Ver Portal do Embaixador">
                            Simular Visão
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
    target.querySelector('#btn-create-ambassador').onclick = () => {
      openCreateAmbassadorModal(() => render());
    };

    // Payout modal (Efetuar Pagamento)
    target.querySelectorAll('.btn-payout-amb').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const amb = ambassadors.find(a => a.id === id);
        if (amb) openPayoutModal(amb, () => render());
      };
    });

    // Simulate view
    target.querySelectorAll('.btn-simulate-amb').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        previewAmbassadorId = id;
        render();
      };
    });
  };

  // Payout Modal: O valor da comissão deve ser ZERADO quando o role super administrador clicar em efetuar pagamento
  const openPayoutModal = (amb, onSuccess) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 460px; border-color: #10b981; box-shadow: 0 25px 50px -12px rgba(16, 185, 129, 0.3);">
        <div class="modal-header" style="background: rgba(16, 185, 129, 0.12); border-bottom-color: rgba(16, 185, 129, 0.3);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(16, 185, 129, 0.2); display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3 class="modal-title" style="color: #6ee7b7; font-size: 15px;">Liquidar Comissão de Embaixador</h3>
          </div>
          <button class="modal-close-btn" id="btn-close-pomodal">✕</button>
        </div>

        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
          <div class="card" style="padding: 12px; background: #1e293b; border-color: #334155;">
            <div style="font-size: 14px; font-weight: 800; color: #fff;">${amb.name}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Código: <strong style="color: #60a5fa;">${amb.code}</strong></div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
              Saldo Pendente a Liquidar: <strong style="color: #fbbf24; font-size: 14px; font-family: var(--font-mono);">${amb.pendingCommissions.toFixed(2)} MT</strong>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Destino Cadastrado: <strong style="color: #34d399;">${amb.paymentDetails || 'M-Pesa (+258 84 764 0849)'}</strong>
            </div>
          </div>

          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 10px; border-radius: 6px; font-size: 11px; color: #a7f3d0; line-height: 1.4;">
            <strong>Regra de Pagamento:</strong> Ao confirmar esta liquidação, <strong>o valor da comissão deste embaixador será ZERADO (0,00 MT)</strong> e registrado no extrato do parceiro.
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Valor a Liquidar (MT):</label>
            <input type="number" min="1" max="${amb.pendingCommissions}" step="any" id="inp-po-val" value="${amb.pendingCommissions}" style="width: 100%; font-size: 18px; font-weight: 900; font-family: var(--font-mono); color: #34d399;">
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Meio de Liquidação:</label>
            <select id="sel-po-method" style="width: 100%;">
              <option value="M-Pesa (Vodacom)">M-Pesa (Vodacom +258 84 764 0849)</option>
              <option value="e-Mola (Movitel)">e-Mola / Esmola (+258 87 309 1444)</option>
              <option value="Millennium bim (Conta 863896066)">Millennium bim (Conta 863896066)</option>
              <option value="Transferência Bancária (BCI/Standard)">Transferência Bancária</option>
              <option value="Dinheiro Físico">Dinheiro Físico</option>
            </select>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Nº de Transação / Comprovante:</label>
            <input type="text" id="inp-po-ref" placeholder="Ex: MP260910.8841.B09" style="width: 100%; font-family: var(--font-mono);">
          </div>
        </div>

        <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
          <button class="btn btn-secondary" id="btn-cancel-pomodal">Cancelar</button>
          <button class="btn btn-primary" id="btn-confirm-po" style="background: #10b981; border-color: #10b981; font-weight: 800; padding: 8px 16px;">
            Confirmar Pagamento & Zerar Saldo
          </button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-pomodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-pomodal').onclick = () => modal.remove();
    modal.querySelector('#btn-confirm-po').onclick = () => {
      const val = parseFloat(modal.querySelector('#inp-po-val').value) || 0;
      const method = modal.querySelector('#sel-po-method').value;
      const ref = modal.querySelector('#inp-po-ref').value.trim() || 'MP-' + Math.floor(100000 + Math.random() * 900000);

      if (val <= 0 || val > amb.pendingCommissions) {
        showToast('Valor de pagamento inválido.', 'error');
        return;
      }

      // Executes payment and ZEROS the commission
      db.payAmbassadorCommission(amb.id, val, method, ref);
      showToast(`Pagamento de ${val.toFixed(2)} MT efetuado com sucesso! A comissão de ${amb.name} foi ZERADA.`, 'success');
      modal.remove();
      if (onSuccess) onSuccess();
    };

    document.body.appendChild(modal);
  };

  // Create Ambassador Modal
  const openCreateAmbassadorModal = (onSuccess) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="modal-title">Cadastrar Novo Embaixador Parceiro</h3>
          <button class="modal-close-btn" id="btn-close-camodal">✕</button>
        </div>
        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Nome Completo do Parceiro: *</label>
            <input type="text" id="inp-ca-name" placeholder="Ex: Eng. Bernardo Cossa" required style="width: 100%;">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Telefone / WhatsApp: *</label>
              <input type="text" id="inp-ca-phone" placeholder="+258 84 000 0000" style="width: 100%;">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Taxa Comissão (%): *</label>
              <input type="number" id="inp-ca-rate" value="15.0" step="1" min="1" max="50" style="width: 100%;">
            </div>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Email Corporativo:</label>
            <input type="email" id="inp-ca-email" placeholder="parceiro@exemplo.co.mz" style="width: 100%;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Dados para Pagamento M-Pesa / Banco:</label>
            <input type="text" id="inp-ca-paydetails" placeholder="Ex: M-Pesa +258 84 123 4567 ou Millennium bim" style="width: 100%;">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-camodal">Cancelar</button>
          <button class="btn btn-primary" id="btn-save-amb">Cadastrar Embaixador</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-camodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-camodal').onclick = () => modal.remove();
    modal.querySelector('#btn-save-amb').onclick = () => {
      const name = modal.querySelector('#inp-ca-name').value.trim();
      const phone = modal.querySelector('#inp-ca-phone').value.trim();
      const email = modal.querySelector('#inp-ca-email').value.trim();
      const rate = parseFloat(modal.querySelector('#inp-ca-rate').value) || 15.0;
      const payDetails = modal.querySelector('#inp-ca-paydetails').value.trim();

      if (!name) {
        showToast('Nome do embaixador é obrigatório.', 'error');
        return;
      }

      const slug = name.split(' ')[0].toUpperCase();
      const newAmb = {
        id: 'amb-' + Date.now(),
        name,
        email: email || `${slug.toLowerCase()}@gefparceiros.co.mz`,
        phone: phone || '+258 84 000 0000',
        code: `GEF-${slug}-${new Date().getFullYear()}`,
        commissionRate: rate,
        status: 'ATIVO',
        totalStores: 0,
        activeStores: 0,
        pendingCommissions: 0,
        paidCommissions: 0,
        paymentDetails: payDetails || `M-Pesa: ${phone}`,
        registeredStores: [],
        payoutHistory: []
      };

      db.saveAmbassador(newAmb);
      showToast(`Embaixador ${name} cadastrado com o código ${newAmb.code}!`, 'success');
      modal.remove();
      if (onSuccess) onSuccess();
    };

    document.body.appendChild(modal);
  };

  render();
}
