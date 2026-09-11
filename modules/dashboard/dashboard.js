/**
 * GEF - GESTÃO FINANCEIRA | DASHBOARD MODULE
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { openReceiptModal } from '../../js/components/receipt-modal.js';

export function initDashboardModule(container, options = {}) {
  const { onNavigate } = options;
  const currentUser = auth.getCurrentUser();

  if (currentUser?.role === 'CASHIER') {
    if (onNavigate) onNavigate('PDV');
    return;
  }
  if (currentUser?.role === 'EMBAIXADOR') {
    if (onNavigate) onNavigate('EMBAIXADORES');
    return;
  }
  if (currentUser?.role === 'SUPERADMIN') {
    if (onNavigate) onNavigate('MONITOR_SAAS');
    return;
  }

  const storeId = db.getCurrentStoreId();
  const currentStore = db.getCurrentStore();
  const stats = db.getDashboardStats(storeId);

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <!-- Welcome & Location Header Card -->
      <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 16px 20px;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px;">
            Visão Geral Operacional
          </div>
          <h2 style="font-size: 20px; font-weight: 900; color: #f8fafc; margin: 2px 0 0 0;">
            ${currentStore ? currentStore.name : 'GEF Ferragens'}
          </h2>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">
            Operador logado: <strong style="color: #cbd5e1;">${currentUser?.fullName}</strong> • Moeda: <strong style="color: #cbd5e1;">Meticais (MT)</strong>
          </div>
        </div>

        <!-- Quick Actions -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-primary" id="btn-quick-pos">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            <span>Novo Pedido (PDV)</span>
          </button>
          <button class="btn btn-secondary" id="btn-quick-quote">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
            <span>Orçamento de Obra</span>
          </button>
          <button class="btn btn-secondary" id="btn-quick-stock">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/></svg>
            <span>Matriz FEFO</span>
          </button>
        </div>
      </div>

      <!-- 4 Core Metrics Grid -->
      <div class="metrics-grid">
        <!-- Metric 1: Patrimônio Real -->
        <div class="card metric-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span class="metric-title">Patrimônio Real em Caixa & Estoque</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(234, 88, 12, 0.1); display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
            </div>
          </div>
          <div class="metric-value" style="color: #f8fafc;">
            ${stats.totalRealEquity.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 14px; color: #ea580c;">MT</span>
          </div>
          <div class="metric-sub">
            Caixa: <strong style="color: #cbd5e1;">${stats.currentCashInDrawer.toLocaleString('pt-MZ')} MT</strong> + Estoque Custo: <strong style="color: #cbd5e1;">${stats.stockCostTotal.toLocaleString('pt-MZ')} MT</strong>
          </div>
        </div>

        <!-- Metric 2: Vendas do Dia -->
        <div class="card metric-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span class="metric-title">Faturamento Hoje</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.1); display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div class="metric-value" style="color: #34d399;">
            ${stats.totalTodaySales.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 14px; color: #10b981;">MT</span>
          </div>
          <div class="metric-sub">
            <strong style="color: #cbd5e1;">${stats.todaySalesCount}</strong> ${stats.todaySalesCount === 1 ? 'venda concluída' : 'vendas concluídas hoje'}
          </div>
        </div>

        <!-- Metric 3: Potencial de Venda Estoque -->
        <div class="card metric-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span class="metric-title">Estoque Valorizado (Venda)</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>
            </div>
          </div>
          <div class="metric-value" style="color: #60a5fa;">
            ${stats.stockSaleValuation.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 14px; color: #3b82f6;">MT</span>
          </div>
          <div class="metric-sub">
            Margem Bruta Projetada: <strong style="color: #10b981;">${stats.projectedProfitMargin}%</strong>
          </div>
        </div>

        <!-- Metric 4: Contas a Receber (Fiado) -->
        <div class="card metric-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span class="metric-title">Crédito a Receber (Fiado)</span>
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(245, 158, 11, 0.1); display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
          </div>
          <div class="metric-value" style="color: #fbbf24;">
            ${stats.totalReceivable.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 14px; color: #f59e0b;">MT</span>
          </div>
          <div class="metric-sub">
            Total concedido a clientes com limite ativo
          </div>
        </div>
      </div>

      <!-- Alerts row in Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
        <!-- Alert 1: Low stock -->
        <div class="card" style="padding: 14px 18px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17"/></svg>
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #f8fafc;">${stats.lowStockCount + stats.outOfStockCount} Itens em Atenção</div>
              <div style="font-size: 11px; color: #94a3b8;">${stats.outOfStockCount} zerados • ${stats.lowStockCount} abaixo do mínimo</div>
            </div>
          </div>
          <button class="btn btn-secondary" id="btn-goto-stock-alert" style="padding: 4px 10px; font-size: 11px;">
            Ver Estoque
          </button>
        </div>

        <!-- Alert 2: Quotes -->
        <div class="card" style="padding: 14px 18px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #f8fafc;">${stats.pendingQuotesCount} Orçamentos Abertos</div>
              <div style="font-size: 11px; color: #94a3b8;">Cotações de obras em acompanhamento</div>
            </div>
          </div>
          <button class="btn btn-secondary" id="btn-goto-quotes-alert" style="padding: 4px 10px; font-size: 11px;">
            Ver Orçamentos
          </button>
        </div>

        <!-- Alert 3: Deliveries -->
        <div class="card" style="padding: 14px 18px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(245, 158, 11, 0.1); display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #f8fafc;">${stats.pendingDeliveriesCount} Cargas em Logística</div>
              <div style="font-size: 11px; color: #94a3b8;">Despachos e entregas em canteiro</div>
            </div>
          </div>
          <button class="btn btn-secondary" id="btn-goto-deliveries-alert" style="padding: 4px 10px; font-size: 11px;">
            Ver Entregas
          </button>
        </div>
      </div>

      <!-- Main Tables Grid: Recent Sales & Top Products -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
        <!-- Recent Sales -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 20px; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin: 0;">Últimas Vendas Concluídas</h3>
            <button class="btn btn-secondary" id="btn-view-all-sales" style="padding: 4px 10px; font-size: 11px;">
              Histórico Completo →
            </button>
          </div>

          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Recibo / Venda</th>
                  <th>Cliente</th>
                  <th>Pagamento</th>
                  <th>Total (MT)</th>
                  <th style="text-align: right;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${stats.recentSales.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; color: #64748b; padding: 24px;">
                      Nenhuma venda registrada ainda nesta loja.
                    </td>
                  </tr>
                ` : stats.recentSales.map(sale => `
                  <tr>
                    <td>
                      <div style="font-weight: 700; color: #f8fafc;">${sale.saleNumber || sale.id}</div>
                      <div style="font-size: 10px; color: #94a3b8;">${new Date(sale.createdAt || sale.timestamp).toLocaleTimeString('pt-MZ')}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600; color: #cbd5e1;">${sale.customerName || 'Consumidor Final'}</div>
                    </td>
                    <td>
                      <span class="badge ${sale.paymentMethod === 'DINHEIRO' ? 'badge-emerald' : sale.paymentMethod === 'M-PESA' ? 'badge-red' : sale.paymentMethod === 'CREDITO_FIADO' ? 'badge-amber' : 'badge-blue'}">
                        ${sale.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <strong style="color: #34d399; font-family: var(--font-mono);">${(sale.total || sale.totalNet).toFixed(2)} MT</strong>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary btn-print-recent" data-sale-id="${sale.id}" style="padding: 4px 8px; font-size: 10px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
                        Recibo
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Top Selling Products -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 20px; border-bottom: 1px solid #1f2937;">
            <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin: 0;">Top Materiais Mais Vendidos</h3>
          </div>
          <div style="padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
            ${stats.topSellingProducts.length === 0 ? `
              <div style="text-align: center; color: #64748b; padding: 20px; font-size: 12px;">
                Sem movimentações ainda.
              </div>
            ` : stats.topSellingProducts.map((p, idx) => `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-weight: 900; color: #ea580c; font-size: 13px; width: 16px;">#${idx + 1}</span>
                  <div>
                    <div style="font-weight: 700; color: #f8fafc; font-size: 12px;">${p.name}</div>
                    <div style="font-size: 10px; color: #94a3b8;">${p.qty} un faturadas</div>
                  </div>
                </div>
                <div style="font-weight: 800; font-family: var(--font-mono); color: #34d399; font-size: 12px;">
                  ${p.total.toFixed(2)} MT
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind actions
  container.querySelector('#btn-quick-pos').onclick = () => onNavigate?.('PDV');
  container.querySelector('#btn-quick-quote').onclick = () => onNavigate?.('ORCAMENTOS');
  container.querySelector('#btn-quick-stock').onclick = () => onNavigate?.('ESTOQUE');
  container.querySelector('#btn-goto-stock-alert').onclick = () => onNavigate?.('ESTOQUE');
  container.querySelector('#btn-goto-quotes-alert').onclick = () => onNavigate?.('ORCAMENTOS');
  container.querySelector('#btn-goto-deliveries-alert').onclick = () => onNavigate?.('ENTREGAS');
  container.querySelector('#btn-view-all-sales').onclick = () => onNavigate?.('VENDAS');

  container.querySelectorAll('.btn-print-recent').forEach(btn => {
    btn.onclick = () => {
      const saleId = btn.getAttribute('data-sale-id');
      const sale = stats.recentSales.find(s => s.id === saleId);
      if (sale) openReceiptModal(sale);
    };
  });
}
