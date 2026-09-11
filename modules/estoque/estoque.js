/**
 * GEF - GESTÃO FINANCEIRA | ESTOQUE & MATRIZ FEFO
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { openTransferModal } from '../../js/components/transfer-modal.js';
import { showToast } from '../../js/components/toast.js';

export function initEstoqueModule(container, options = {}) {
  const { onNavigate } = options;
  const storeId = db.getCurrentStoreId();
  const currentUser = auth.getCurrentUser();
  const isAdmin = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN' || currentUser.role === 'MANAGER');
  let activeTab = 'SALDOS'; // 'SALDOS' | 'FEFO'
  let searchTerm = '';
  let statusFilter = 'ALL';

  const render = () => {
    const products = db.getProducts(storeId);
    const batches = db.getAllBatches(storeId);

    const totalStockCost = products.reduce((sum, p) => sum + (p.currentStockBase * p.costPriceBase), 0);
    const totalStockSale = products.reduce((sum, p) => sum + (p.currentStockBase * p.salePriceBase), 0);
    const lowStockCount = products.filter(p => p.currentStockBase > 0 && p.currentStockBase <= p.minStockAlert).length;
    const outOfStockCount = products.filter(p => p.currentStockBase <= 0).length;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 20px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">Gestão de Estoque & Matriz FEFO</h2>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Controle físico de gôndolas e armazém, rastreamento de lotes por validade e transferências entre setores.
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" id="btn-open-transfer" style="border-color: #ea580c; color: #f97316;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
              <span>Transferência Interna</span>
            </button>
            <button class="btn btn-secondary" id="btn-goto-perdas" style="color: #f87171;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
              <span>Registrar Avaria / Perda</span>
            </button>
          </div>
        </div>

        <!-- Inventory Metrics -->
        <div class="metrics-grid">
          ${isAdmin ? `
            <div class="card metric-card">
              <span class="metric-title">Valor Total em Estoque (Custo)</span>
              <div class="metric-value" style="color: #f8fafc;">
                ${totalStockCost.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 14px; color: #ea580c;">MT</span>
              </div>
              <div class="metric-sub">Capital imobilizado em mercadorias</div>
            </div>
          ` : ''}

          <div class="card metric-card">
            <span class="metric-title">Valor Total em Estoque (Venda)</span>
            <div class="metric-value" style="color: #34d399;">
              ${totalStockSale.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span style="font-size: 14px; color: #10b981;">MT</span>
            </div>
            <div class="metric-sub">Potencial de receita bruto da filial</div>
          </div>

          <div class="card metric-card">
            <span class="metric-title">Itens em Alerta de Reposição</span>
            <div class="metric-value" style="color: ${lowStockCount > 0 ? '#fbbf24' : '#94a3b8'};">
              ${lowStockCount} <span style="font-size: 14px;">materiais</span>
            </div>
            <div class="metric-sub">Saldo abaixo da cota mínima de segurança</div>
          </div>

          <div class="card metric-card">
            <span class="metric-title">Materiais com Saldo Zerado</span>
            <div class="metric-value" style="color: ${outOfStockCount > 0 ? '#f87171' : '#34d399'};">
              ${outOfStockCount} <span style="font-size: 14px;">materiais</span>
            </div>
            <div class="metric-sub">Ruptura total de estoque na filial</div>
          </div>
        </div>

        <!-- Tab Controls & Filters Card -->
        <div class="card" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; gap: 4px; background: #0f172a; padding: 3px; border-radius: 8px; border: 1px solid #1e293b;">
            <button class="btn btn-tab ${activeTab === 'SALDOS' ? 'active' : ''}" id="btn-tab-saldos" style="padding: 6px 14px; font-size: 12px; background: ${activeTab === 'SALDOS' ? '#ea580c' : 'transparent'}; color: #fff;">
              Posição Física por Local
            </button>
            <button class="btn btn-tab ${activeTab === 'FEFO' ? 'active' : ''}" id="btn-tab-fefo" style="padding: 6px 14px; font-size: 12px; background: ${activeTab === 'FEFO' ? '#ea580c' : 'transparent'}; color: #fff;">
              Matriz FEFO de Lotes
            </button>
          </div>

          <div style="display: flex; gap: 8px; align-items: center;">
            <input 
              type="text" 
              id="input-stock-search" 
              placeholder="Filtrar por material ou código..." 
              value="${searchTerm}"
              style="width: 220px; font-size: 12px;"
            >
            <select id="select-stock-status" style="font-size: 12px;">
              <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>Todos os Status</option>
              <option value="LOW" ${statusFilter === 'LOW' ? 'selected' : ''}>Estoque Baixo</option>
              <option value="ZERO" ${statusFilter === 'ZERO' ? 'selected' : ''}>Estoque Zerado</option>
              <option value="OK" ${statusFilter === 'OK' ? 'selected' : ''}>Estoque Normal</option>
            </select>
          </div>
        </div>

        <!-- Table View depending on tab -->
        ${activeTab === 'SALDOS' ? renderSaldosTable(products) : renderFefoTable(batches)}
      </div>
    `;

    // Actions
    container.querySelector('#btn-open-transfer').onclick = () => {
      openTransferModal({
        onSuccess: () => render()
      });
    };

    container.querySelector('#btn-goto-perdas').onclick = () => {
      if (onNavigate) onNavigate('PERDAS');
    };

    container.querySelector('#btn-tab-saldos').onclick = () => {
      activeTab = 'SALDOS';
      render();
    };

    container.querySelector('#btn-tab-fefo').onclick = () => {
      activeTab = 'FEFO';
      render();
    };

    const sInp = container.querySelector('#input-stock-search');
    sInp.oninput = (e) => {
      searchTerm = e.target.value;
      render();
      const ref = container.querySelector('#input-stock-search');
      if (ref) {
        ref.focus();
        ref.setSelectionRange(searchTerm.length, searchTerm.length);
      }
    };

    container.querySelector('#select-stock-status').onchange = (e) => {
      statusFilter = e.target.value;
      render();
    };

    container.querySelectorAll('.btn-row-transfer').forEach(b => {
      b.onclick = () => {
        const prodId = b.getAttribute('data-prod-id');
        openTransferModal({
          initialProductId: prodId,
          onSuccess: () => render()
        });
      };
    });
  };

  const renderSaldosTable = (products) => {
    const filtered = products.filter(p => {
      const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code || '').toLowerCase().includes(searchTerm.toLowerCase());
      let matchStat = true;
      if (statusFilter === 'LOW') matchStat = p.currentStockBase > 0 && p.currentStockBase <= p.minStockAlert;
      else if (statusFilter === 'ZERO') matchStat = p.currentStockBase <= 0;
      else if (statusFilter === 'OK') matchStat = p.currentStockBase > p.minStockAlert;
      return matchSearch && matchStat;
    });

    return `
      <div class="card" style="padding: 0; overflow: hidden;">
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Material</th>
                <th>Loja (Balcão)</th>
                <th>Armazém Central</th>
                <th>Pátio de Agregados</th>
                <th>Estoque Global</th>
                <th>Mínimo</th>
                <th>Valor Custo</th>
                <th style="text-align: right;">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="9" style="text-align: center; color: #64748b; padding: 32px;">Nenhum material localizado.</td></tr>
              ` : filtered.map(p => {
                const isOut = p.currentStockBase <= 0;
                const isLow = p.currentStockBase <= p.minStockAlert && p.currentStockBase > 0;
                const stock = p.stockByLocation || { LOJA: 0, ARMAZEM: 0, PATIO: 0 };
                return `
                  <tr>
                    <td>
                      <span style="font-weight: 800; font-family: var(--font-mono); color: #f97316;">${p.code}</span>
                    </td>
                    <td>
                      <div style="font-weight: 700; color: #f8fafc;">${p.name}</div>
                      <div style="font-size: 10px; color: #94a3b8;">${p.category || 'Geral'}</div>
                    </td>
                    <td>
                      <strong style="color: #cbd5e1; font-family: var(--font-mono);">${stock.LOJA ?? 0}</strong> ${p.baseUnit}
                    </td>
                    <td>
                      <strong style="color: #f97316; font-family: var(--font-mono);">${stock.ARMAZEM ?? 0}</strong> ${p.baseUnit}
                    </td>
                    <td>
                      <strong style="color: #34d399; font-family: var(--font-mono);">${stock.PATIO ?? 0}</strong> ${p.baseUnit}
                    </td>
                    <td>
                      <span class="badge ${isOut ? 'badge-red' : isLow ? 'badge-amber' : 'badge-emerald'}" style="font-size: 11px;">
                        ${p.currentStockBase} ${p.baseUnit}
                      </span>
                    </td>
                    <td style="font-size: 11px; color: #94a3b8; font-family: var(--font-mono);">
                      ${p.minStockAlert} ${p.baseUnit}
                    </td>
                    <td style="font-family: var(--font-mono); color: #cbd5e1;">
                      ${(p.currentStockBase * p.costPriceBase).toFixed(2)} MT
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary btn-row-transfer" data-prod-id="${p.id}" style="padding: 3px 8px; font-size: 10px;">
                        Transferir
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  const renderFefoTable = (batches) => {
    const now = new Date();
    const filtered = batches.filter(b => {
      const matchSearch = !searchTerm || (b.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (b.batchNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });

    return `
      <div class="card" style="padding: 0; overflow: hidden;">
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nº Lote</th>
                <th>Material</th>
                <th>Validade (FEFO)</th>
                <th>Dias Restantes</th>
                <th>Qtd Inicial</th>
                <th>Qtd Restante</th>
                <th>Custo Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; color: #64748b; padding: 32px;">Nenhum lote com controle de validade registrado.</td></tr>
              ` : filtered.map(b => {
                const expDate = new Date(b.expiryDate);
                const diffMs = expDate.getTime() - now.getTime();
                const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                const isCritical = days <= 30 && days >= 0;
                const isExpired = days < 0;
                return `
                  <tr style="${isExpired ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                    <td>
                      <span style="font-weight: 800; font-family: var(--font-mono); color: #f97316;">${b.batchNumber}</span>
                    </td>
                    <td>
                      <div style="font-weight: 700; color: #f8fafc;">${b.productName}</div>
                    </td>
                    <td>
                      <strong style="color: ${isExpired ? '#ef4444' : isCritical ? '#f59e0b' : '#34d399'}; font-family: var(--font-mono);">
                        ${new Date(b.expiryDate).toLocaleDateString('pt-MZ')}
                      </strong>
                    </td>
                    <td>
                      ${isExpired ? `
                        <span class="badge badge-red">EXPIRADO (${Math.abs(days)}d atrás)</span>
                      ` : isCritical ? `
                        <span class="badge badge-amber">CRÍTICO (${days}d restantes)</span>
                      ` : `
                        <span style="color: #cbd5e1; font-size: 11px;">${days} dias</span>
                      `}
                    </td>
                    <td style="font-family: var(--font-mono); color: #94a3b8;">
                      ${b.initialQuantityBase}
                    </td>
                    <td>
                      <strong style="color: #34d399; font-family: var(--font-mono);">${b.currentQuantityBase}</strong>
                    </td>
                    <td style="font-family: var(--font-mono); color: #cbd5e1;">
                      ${b.costPerBase.toFixed(2)} MT
                    </td>
                    <td>
                      <span class="badge ${b.status === 'ACTIVE' ? 'badge-emerald' : 'badge-red'}">
                        ${b.status}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  render();
}
