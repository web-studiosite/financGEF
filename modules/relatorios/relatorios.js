/**
 * GEF - GESTÃO FINANCEIRA | RELATÓRIOS & AUDITORIA
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';

export function initRelatoriosModule(container) {
  const storeId = db.getCurrentStoreId();
  let currentReport = 'VENDAS';

  const render = () => {
    const stats = db.getDashboardStats(storeId);
    const sales = db.getSales(storeId);
    const products = db.getProducts(storeId);
    const losses = db.getLosses(storeId);
    const sessions = db.getCashSessions(storeId);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 20px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">Relatórios Executivos & DRE Operacional</h2>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Auditoria de faturamento, margem bruta, movimentações de gaveta e patrimônio real imobilizado.
            </div>
          </div>
          <button class="btn btn-secondary" id="btn-print-report">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
            <span>Imprimir Relatório</span>
          </button>
        </div>

        <!-- Selector Tabs Card -->
        <div class="card" style="padding: 12px 16px; display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn ${currentReport === 'VENDAS' ? 'btn-primary' : 'btn-secondary'} btn-rep-tab" data-rep="VENDAS" style="padding: 6px 12px; font-size: 12px;">
            Faturamento & Meios de Pgto
          </button>
          <button class="btn ${currentReport === 'PATRIMONIO' ? 'btn-primary' : 'btn-secondary'} btn-rep-tab" data-rep="PATRIMONIO" style="padding: 6px 12px; font-size: 12px;">
            Patrimônio Real & Lucro Projetado
          </button>
          <button class="btn ${currentReport === 'CAIXA' ? 'btn-primary' : 'btn-secondary'} btn-rep-tab" data-rep="CAIXA" style="padding: 6px 12px; font-size: 12px;">
            Auditoria de Caixa & Quebras
          </button>
          <button class="btn ${currentReport === 'PERDAS' ? 'btn-primary' : 'btn-secondary'} btn-rep-tab" data-rep="PERDAS" style="padding: 6px 12px; font-size: 12px;">
            Avarias & Quebras de Canteiro
          </button>
        </div>

        <!-- Report Content -->
        <div id="report-output-box">
          ${currentReport === 'VENDAS' ? renderVendasReport(sales) :
            currentReport === 'PATRIMONIO' ? renderPatrimonioReport(stats, products) :
            currentReport === 'CAIXA' ? renderCaixaReport(sessions) :
            renderPerdasReport(losses)}
        </div>
      </div>
    `;

    // Tab buttons
    container.querySelectorAll('.btn-rep-tab').forEach(btn => {
      btn.onclick = () => {
        currentReport = btn.getAttribute('data-rep');
        render();
      };
    });

    // Print report
    container.querySelector('#btn-print-report').onclick = () => {
      window.print();
    };
  };

  const renderVendasReport = (sales) => {
    const validSales = sales.filter(s => s.status !== 'CANCELADA');
    const totalRevenue = validSales.reduce((sum, s) => sum + (s.total || s.totalNet || 0), 0);
    const byMethod = {};
    validSales.forEach(s => {
      byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + (s.total || s.totalNet || 0);
    });

    return `
      <div class="card">
        <h3 style="font-size: 15px; font-weight: 800; color: #f8fafc; margin-bottom: 14px;">Consolidado de Vendas</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
          <div style="background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #1e293b;">
            <div style="font-size: 11px; color: #94a3b8;">Faturamento Bruto Total</div>
            <div style="font-size: 20px; font-weight: 900; color: #34d399; font-family: var(--font-mono);">${totalRevenue.toFixed(2)} MT</div>
            <div style="font-size: 10px; color: #64748b;">${validSales.length} transações registradas</div>
          </div>
          ${Object.entries(byMethod).map(([m, val]) => `
            <div style="background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #1e293b;">
              <div style="font-size: 11px; color: #94a3b8;">${m}</div>
              <div style="font-size: 16px; font-weight: 800; color: #f8fafc; font-family: var(--font-mono);">${val.toFixed(2)} MT</div>
              <div style="font-size: 10px; color: #34d399;">${totalRevenue > 0 ? ((val / totalRevenue) * 100).toFixed(1) : 0}% do total</div>
            </div>
          `).join('')}
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Venda</th>
              <th>Cliente</th>
              <th>Forma</th>
              <th>Valor (MT)</th>
            </tr>
          </thead>
          <tbody>
            ${validSales.map(s => `
              <tr>
                <td>${new Date(s.createdAt || s.timestamp).toLocaleString('pt-MZ')}</td>
                <td><strong>${s.saleNumber}</strong></td>
                <td>${s.customerName}</td>
                <td><span class="badge badge-blue">${s.paymentMethod}</span></td>
                <td><strong style="color: #34d399; font-family: var(--font-mono);">${(s.total || s.totalNet).toFixed(2)} MT</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderPatrimonioReport = (stats, products) => {
    return `
      <div class="card">
        <h3 style="font-size: 15px; font-weight: 800; color: #f8fafc; margin-bottom: 14px;">Balanço de Patrimônio Real da Loja</h3>
        <div class="metrics-grid" style="margin-bottom: 20px;">
          <div class="metric-card">
            <span class="metric-title">Patrimônio Real Consolidado</span>
            <div class="metric-value" style="color: #f8fafc;">
              ${stats.totalRealEquity.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
            </div>
            <div class="metric-sub">Estoque a custo + Dinheiro físico em gaveta</div>
          </div>
          <div class="metric-card">
            <span class="metric-title">Estoque Valorizado a Venda</span>
            <div class="metric-value" style="color: #60a5fa;">
              ${stats.stockSaleValuation.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
            </div>
            <div class="metric-sub">Receita total se todo estoque for comercializado</div>
          </div>
          <div class="metric-card">
            <span class="metric-title">Margem Bruta Projetada</span>
            <div class="metric-value" style="color: #34d399;">
              ${stats.projectedProfitMargin}%
            </div>
            <div class="metric-sub">Margem média sobre preço de venda</div>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Estoque Físico</th>
              <th>Custo Unit</th>
              <th>Custo Total</th>
              <th>Venda Unit</th>
              <th>Venda Total</th>
              <th>Lucro Projetado</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => {
              const costTot = p.currentStockBase * p.costPriceBase;
              const saleTot = p.currentStockBase * p.salePriceBase;
              const profitTot = saleTot - costTot;
              return `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.currentStockBase} ${p.baseUnit}</td>
                  <td>${p.costPriceBase.toFixed(2)} MT</td>
                  <td><strong>${costTot.toFixed(2)} MT</strong></td>
                  <td>${p.salePriceBase.toFixed(2)} MT</td>
                  <td><strong>${saleTot.toFixed(2)} MT</strong></td>
                  <td style="color: #34d399; font-weight: bold;">+${profitTot.toFixed(2)} MT</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderCaixaReport = (sessions) => {
    return `
      <div class="card">
        <h3 style="font-size: 15px; font-weight: 800; color: #f8fafc; margin-bottom: 14px;">Auditoria de Fechamentos de Caixa</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Turno</th>
              <th>Operador</th>
              <th>Abertura</th>
              <th>Fechamento</th>
              <th>Esperado Gaveta</th>
              <th>Contado Físico</th>
              <th>Diferença (Quebra/Sobra)</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map(s => {
              const diff = s.difference || 0;
              return `
                <tr>
                  <td><strong>${s.id}</strong></td>
                  <td>${s.cashierName}</td>
                  <td>${new Date(s.openedAt).toLocaleString('pt-MZ')}</td>
                  <td>${s.closedAt ? new Date(s.closedAt).toLocaleString('pt-MZ') : 'Em aberto'}</td>
                  <td>${(s.closingExpectedBalance ?? s.cashInDrawer ?? 0).toFixed(2)} MT</td>
                  <td>${s.closingCountedBalance !== undefined ? `${s.closingCountedBalance.toFixed(2)} MT` : '-'}</td>
                  <td style="font-weight: bold; color: ${diff === 0 ? '#34d399' : diff > 0 ? '#60a5fa' : '#ef4444'};">
                    ${diff > 0 ? `+${diff.toFixed(2)} MT (Sobra)` : diff < 0 ? `${diff.toFixed(2)} MT (Quebra)` : '0.00 MT'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderPerdasReport = (losses) => {
    const total = losses.reduce((sum, l) => sum + (l.totalCost || 0), 0);
    return `
      <div class="card">
        <h3 style="font-size: 15px; font-weight: 800; color: #f8fafc; margin-bottom: 14px;">Relatório de Avarias e Perdas de Materiais</h3>
        <div style="background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #1e293b; margin-bottom: 16px;">
          <div style="font-size: 11px; color: #94a3b8;">Impacto Financeiro Total</div>
          <div style="font-size: 22px; font-weight: 900; color: #ef4444; font-family: var(--font-mono);">${total.toFixed(2)} MT</div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Material</th>
              <th>Qtd Baixada</th>
              <th>Custo Total</th>
              <th>Motivo</th>
              <th>Responsável</th>
            </tr>
          </thead>
          <tbody>
            ${losses.map(l => `
              <tr>
                <td>${new Date(l.date || l.createdAt).toLocaleString('pt-MZ')}</td>
                <td><strong>${l.productName}</strong></td>
                <td>${l.quantity} ${l.unit}</td>
                <td style="color: #ef4444; font-weight: bold;">${(l.totalCost || 0).toFixed(2)} MT</td>
                <td><span class="badge badge-red">${l.reason}</span></td>
                <td>${l.userName || 'Admin'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  render();
}
