/**
 * GEF - GESTÃO FINANCEIRA | AUDITORIA, INVENTÁRIO FÍSICO & CONFRONTAÇÃO DE ESTOQUE
 * JavaScript Puro (Vanilla JS)
 * Módulo operacional para cada loja realizar auditorias físicas, contagem cega,
 * confrontação de saldos, conciliação e trilha de auditoria completa.
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';
import { i18n } from '../../js/core/i18n.js';
import { normalizeRole } from '../../js/core/permissions.js';

export function initAuditoriaModule(container, options = {}) {
  const currentStore = db.getCurrentStore();
  const storeId = currentStore?.id || 'store-001';
  const currentUser = auth.getCurrentUser();
  const userRole = currentUser ? normalizeRole(currentUser.role, currentUser.id) : 'CASHIER';
  const canReconcile = userRole === 'ADMIN' || userRole === 'GERENTE' || userRole === 'SUPERADMIN';

  let currentSubTab = 'INVENTARIO'; // 'INVENTARIO' | 'HISTORICO' | 'LOGS'
  let selectedLocation = 'LOJA'; // 'LOJA' | 'ARMAZEM' | 'PATIO' | 'TOTAL'
  let filterCategory = 'ALL';
  let searchTerm = '';
  
  // Physical count state: { [productId]: physicalCountNumber }
  let physicalCounts = {};

  const getFilteredProducts = () => {
    const products = db.getProducts(storeId);
    return products.filter(p => {
      const matchCat = filterCategory === 'ALL' || p.category === filterCategory;
      const term = searchTerm.toLowerCase();
      const matchSearch = !term || 
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.code && p.code.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term));
      return matchCat && matchSearch;
    });
  };

  const getSystemStock = (product, location) => {
    if (location === 'TOTAL' || !product.stockByLocation) {
      return product.currentStockBase || 0;
    }
    return product.stockByLocation[location] ?? 0;
  };

  const render = () => {
    const products = getFilteredProducts();
    const allCategories = Array.from(new Set(db.getProducts(storeId).map(p => p.category).filter(Boolean)));
    const inventories = db.getInventories(storeId);
    const auditLogs = db.getAuditLogs(storeId);

    // Compute Metrics for current physical counting
    let totalAudited = 0;
    let totalDivergent = 0;
    let netFinancialDiff = 0;
    let totalItemsWithCount = 0;

    products.forEach(p => {
      const sysStock = getSystemStock(p, selectedLocation);
      const hasCount = physicalCounts[p.id] !== undefined;
      if (hasCount) {
        totalItemsWithCount++;
        const phys = physicalCounts[p.id];
        const diff = Number((phys - sysStock).toFixed(3));
        if (diff !== 0) {
          totalDivergent++;
          netFinancialDiff += diff * (p.costPriceBase || 0);
        }
      }
    });

    const accuracyRate = totalItemsWithCount > 0 
      ? Math.round(((totalItemsWithCount - totalDivergent) / totalItemsWithCount) * 100) 
      : 100;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        
        <!-- Header Principal -->
        <div class="card" style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="background: rgba(234, 88, 12, 0.15); border: 1px solid #ea580c; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #ea580c;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
              </span>
              <div>
                <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">
                  Inventário Físico & Confrontação de Estoque
                </h2>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                  Filial: <strong>${currentStore?.name || 'Loja Ativa'}</strong> • Operador: <strong>${currentUser?.fullName || 'Auditor'}</strong> (${userRole})
                </div>
              </div>
            </div>
          </div>

          <!-- Abas de Navegação Interna -->
          <div style="display: flex; gap: 6px; background: #0f172a; padding: 4px; border-radius: 8px; border: 1px solid #334155;">
            <button class="btn btn-tab ${currentSubTab === 'INVENTARIO' ? 'active' : ''}" id="tab-aud-inventario" style="padding: 6px 14px; font-size: 11px; font-weight: 700;">
              Confrontação & Contagem
            </button>
            <button class="btn btn-tab ${currentSubTab === 'HISTORICO' ? 'active' : ''}" id="tab-aud-historico" style="padding: 6px 14px; font-size: 11px; font-weight: 700;">
              Histórico de Inventários (${inventories.length})
            </button>
            <button class="btn btn-tab ${currentSubTab === 'LOGS' ? 'active' : ''}" id="tab-aud-logs" style="padding: 6px 14px; font-size: 11px; font-weight: 700;">
              Trilha de Auditoria
            </button>
          </div>
        </div>

        ${currentSubTab === 'INVENTARIO' ? `
          <!-- KPI Cards do Inventário Atual -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
            <div class="card" style="padding: 14px;">
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Itens no Catálogo</div>
              <div style="font-size: 20px; font-weight: 800; color: #f8fafc; margin-top: 4px; font-family: var(--font-mono);">${products.length}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Itens disponíveis para auditoria</div>
            </div>
            <div class="card" style="padding: 14px;">
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Contagens Realizadas</div>
              <div style="font-size: 20px; font-weight: 800; color: #38bdf8; margin-top: 4px; font-family: var(--font-mono);">${totalItemsWithCount} / ${products.length}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Materiais com conferência física</div>
            </div>
            <div class="card" style="padding: 14px;">
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Acurácia da Loja</div>
              <div style="font-size: 20px; font-weight: 800; color: ${accuracyRate >= 95 ? '#34d399' : accuracyRate >= 80 ? '#fbbf24' : '#f87171'}; margin-top: 4px; font-family: var(--font-mono);">
                ${accuracyRate}%
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${totalDivergent} item(ns) com divergência</div>
            </div>
            <div class="card" style="padding: 14px;">
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Impacto Financeiro Líquido</div>
              <div style="font-size: 20px; font-weight: 800; color: ${netFinancialDiff >= 0 ? '#34d399' : '#f87171'}; margin-top: 4px; font-family: var(--font-mono);">
                ${netFinancialDiff >= 0 ? '+' : ''}${i18n.formatMoney(netFinancialDiff)}
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Baseado no custo de reposição</div>
            </div>
          </div>

          <!-- Barra de Filtros & Ações -->
          <div class="card" style="padding: 12px 16px;">
            <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between;">
              <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; flex: 1;">
                <!-- Local -->
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 11px; font-weight: 700; color: #94a3b8;">Local:</span>
                  <select id="sel-aud-location" style="font-size: 11px; padding: 6px 10px;">
                    <option value="LOJA" ${selectedLocation === 'LOJA' ? 'selected' : ''}>Loja / Balcão</option>
                    <option value="ARMAZEM" ${selectedLocation === 'ARMAZEM' ? 'selected' : ''}>Armazém Fechado</option>
                    <option value="PATIO" ${selectedLocation === 'PATIO' ? 'selected' : ''}>Pátio de Agregados & Varões</option>
                    <option value="TOTAL" ${selectedLocation === 'TOTAL' ? 'selected' : ''}>Estoque Total Consolidado</option>
                  </select>
                </div>

                <!-- Categoria -->
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 11px; font-weight: 700; color: #94a3b8;">Categoria:</span>
                  <select id="sel-aud-category" style="font-size: 11px; padding: 6px 10px;">
                    <option value="ALL">Todas as Categorias</option>
                    ${allCategories.map(cat => `
                      <option value="${cat}" ${filterCategory === cat ? 'selected' : ''}>${cat}</option>
                    `).join('')}
                  </select>
                </div>

                <!-- Pesquisa de Produto por Nome ou Código -->
                <div style="position: relative; min-width: 220px; flex: 1; max-width: 350px;">
                  <input 
                    type="text" 
                    id="inp-aud-search" 
                    placeholder="Pesquisar material por nome ou código..." 
                    value="${searchTerm}"
                    style="width: 100%; padding: 6px 10px 6px 28px; font-size: 11px;"
                  >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="position: absolute; left: 8px; top: 9px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
              </div>

              <!-- Botões de Operação e Relatórios -->
              <div style="display: flex; gap: 6px; align-items: center;">
                <button class="btn btn-secondary" id="btn-print-blind-sheet" style="font-size: 11px; padding: 6px 12px; display: flex; align-items: center; gap: 6px;" title="Imprime formulário sem os saldos do sistema para contagem cega sem viés">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                  Folha de Contagem Cega
                </button>
                <button class="btn btn-secondary" id="btn-print-confrontation" style="font-size: 11px; padding: 6px 12px; display: flex; align-items: center; gap: 6px;" title="Imprime o mapa comparativo de divergências">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  Relatório de Confrontação
                </button>
                <button class="btn btn-secondary" id="btn-save-draft-inventory" style="font-size: 11px; padding: 6px 12px;" title="Salva o inventário da loja no histórico">
                  Salvar Balanço
                </button>
                <button class="btn btn-primary" id="btn-reconcile-inventory" style="font-size: 11px; padding: 6px 14px; font-weight: 700; display: flex; align-items: center; gap: 6px; background: #059669; border-color: #059669;" title="Ajusta o saldo contábil do sistema conforme a contagem física">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
                  Conciliar Saldos
                </button>
              </div>
            </div>
          </div>

          <!-- Tabela de Confrontação -->
          <div class="card" style="padding: 0; overflow: hidden;">
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
                <thead>
                  <tr style="background: #0f172a; color: #94a3b8; border-bottom: 1px solid #334155;">
                    <th style="padding: 10px 14px;">Código</th>
                    <th style="padding: 10px 14px;">Material / Produto</th>
                    <th style="padding: 10px 14px;">Unid</th>
                    <th style="padding: 10px 14px;">Saldo Sistema (${selectedLocation})</th>
                    <th style="padding: 10px 14px; width: 180px;">Contagem Física Real</th>
                    <th style="padding: 10px 14px;">Divergência</th>
                    <th style="padding: 10px 14px;">Custo Unit.</th>
                    <th style="padding: 10px 14px; text-align: right;">Impacto Financeiro</th>
                  </tr>
                </thead>
                <tbody>
                  ${products.length === 0 ? `
                    <tr>
                      <td colspan="8" style="text-align: center; color: #64748b; padding: 30px;">
                        Nenhum produto localizado com os filtros aplicados.
                      </td>
                    </tr>
                  ` : products.map(p => {
                    const sysStock = getSystemStock(p, selectedLocation);
                    const currentPhys = physicalCounts[p.id];
                    const isCounted = currentPhys !== undefined;
                    const diff = isCounted ? Number((currentPhys - sysStock).toFixed(3)) : 0;
                    const diffValue = diff * (p.costPriceBase || 0);

                    let statusBadge = '';
                    if (!isCounted) {
                      statusBadge = `<span style="color: #64748b; font-size: 10px;">Pendente</span>`;
                    } else if (diff === 0) {
                      statusBadge = `<span class="badge badge-emerald" style="font-size: 10px;">✓ Batido (0)</span>`;
                    } else if (diff > 0) {
                      statusBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 10px; font-weight: 800;">+${diff} (Sobra)</span>`;
                    } else {
                      statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171; font-size: 10px; font-weight: 800;">${diff} (Quebra)</span>`;
                    }

                    return `
                      <tr style="border-bottom: 1px solid #1e293b; background: ${isCounted && diff !== 0 ? 'rgba(239, 68, 68, 0.03)' : 'transparent'};">
                        <td style="padding: 10px 14px; font-family: var(--font-mono); color: #94a3b8;">${p.code}</td>
                        <td style="padding: 10px 14px;">
                          <div style="font-weight: 700; color: #f8fafc;">${p.name}</div>
                          <div style="font-size: 9px; color: #64748b;">${p.category || 'Geral'}</div>
                        </td>
                        <td style="padding: 10px 14px; font-weight: 600; color: #cbd5e1;">${p.baseUnit}</td>
                        <td style="padding: 10px 14px; font-family: var(--font-mono); font-weight: 700; color: #38bdf8;">
                          ${sysStock.toFixed(2)} ${p.baseUnit}
                        </td>
                        <td style="padding: 8px 14px;">
                          <div style="display: flex; align-items: center; gap: 4px;">
                            <input 
                              type="number" 
                              step="any"
                              class="inp-phys-count" 
                              data-prod-id="${p.id}" 
                              placeholder="${sysStock.toFixed(2)}"
                              value="${currentPhys !== undefined ? currentPhys : ''}"
                              style="width: 100px; padding: 4px 8px; font-size: 11px; font-family: var(--font-mono); font-weight: bold; text-align: right;"
                            >
                            <button class="btn btn-secondary btn-set-same-stock" data-prod-id="${p.id}" data-stock="${sysStock}" style="padding: 4px 6px; font-size: 9px;" title="Copiar saldo do sistema como conferido">
                              =
                            </button>
                          </div>
                        </td>
                        <td style="padding: 10px 14px;">
                          ${statusBadge}
                        </td>
                        <td style="padding: 10px 14px; color: #94a3b8; font-family: var(--font-mono);">
                          ${i18n.formatMoney(p.costPriceBase || 0)}
                        </td>
                        <td style="padding: 10px 14px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: ${diffValue > 0 ? '#34d399' : diffValue < 0 ? '#f87171' : '#94a3b8'};">
                          ${isCounted ? (diffValue >= 0 ? '+' : '') + i18n.formatMoney(diffValue) : '-'}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : currentSubTab === 'HISTORICO' ? `
          <!-- Histórico de Inventários da Filial -->
          <div class="card" style="padding: 0; overflow: hidden;">
            <div style="padding: 14px 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin: 0;">Balanços Realizados Nesta Filial</h3>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Registros oficiais de conferências físicas e conciliações de estoque.</div>
              </div>
            </div>

            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
                <thead>
                  <tr style="background: #0f172a; color: #94a3b8; border-bottom: 1px solid #334155;">
                    <th style="padding: 10px 14px;">Código</th>
                    <th style="padding: 10px 14px;">Data / Hora</th>
                    <th style="padding: 10px 14px;">Auditor Responsável</th>
                    <th style="padding: 10px 14px;">Itens Conferidos</th>
                    <th style="padding: 10px 14px;">Divergências</th>
                    <th style="padding: 10px 14px;">Impacto Líquido</th>
                    <th style="padding: 10px 14px;">Status</th>
                    <th style="padding: 10px 14px; text-align: right;">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${inventories.length === 0 ? `
                    <tr>
                      <td colspan="8" style="text-align: center; color: #64748b; padding: 30px;">
                        Nenhum balanço de estoque registrado para esta filial ainda.
                      </td>
                    </tr>
                  ` : inventories.map(inv => `
                    <tr style="border-bottom: 1px solid #1e293b;">
                      <td style="padding: 10px 14px; font-weight: 800; font-family: var(--font-mono); color: #ea580c;">${inv.code}</td>
                      <td style="padding: 10px 14px; color: #cbd5e1;">${new Date(inv.timestamp).toLocaleString('pt-MZ')}</td>
                      <td style="padding: 10px 14px; font-weight: 600; color: #f8fafc;">${inv.operatorName}</td>
                      <td style="padding: 10px 14px; font-family: var(--font-mono);">${inv.totalItemsAudited} materiais</td>
                      <td style="padding: 10px 14px;">
                        <span class="badge ${inv.totalDivergentItems === 0 ? 'badge-emerald' : 'badge-amber'}">
                          ${inv.totalDivergentItems} divergências
                        </span>
                      </td>
                      <td style="padding: 10px 14px; font-family: var(--font-mono); font-weight: 700; color: ${inv.totalDivergenceValue >= 0 ? '#34d399' : '#f87171'};">
                        ${inv.totalDivergenceValue >= 0 ? '+' : ''}${i18n.formatMoney(inv.totalDivergenceValue || 0)}
                      </td>
                      <td style="padding: 10px 14px;">
                        <span class="badge ${inv.reconciled ? 'badge-emerald' : 'badge-blue'}">
                          ${inv.reconciled ? 'Saldos Ajustados' : 'Apenas Confrontado'}
                        </span>
                      </td>
                      <td style="padding: 10px 14px; text-align: right;">
                        <button class="btn btn-secondary btn-view-inv-details" data-inv-id="${inv.id}" style="padding: 4px 8px; font-size: 10px;">
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : `
          <!-- Trilha de Auditoria Geral da Loja -->
          <div class="card" style="padding: 0; overflow: hidden;">
            <div style="padding: 14px 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 style="font-size: 14px; font-weight: 800; color: #f8fafc; margin: 0;">Trilha de Auditoria Operacional (Audit Trail)</h3>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Log cronológico de todas as ações de estoque, vendas, cancelamentos e conciliações.</div>
              </div>
            </div>

            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
                <thead>
                  <tr style="background: #0f172a; color: #94a3b8; border-bottom: 1px solid #334155;">
                    <th style="padding: 10px 14px;">Data & Hora</th>
                    <th style="padding: 10px 14px;">Ação</th>
                    <th style="padding: 10px 14px;">Entidade</th>
                    <th style="padding: 10px 14px;">Detalhes da Operação</th>
                  </tr>
                </thead>
                <tbody>
                  ${auditLogs.length === 0 ? `
                    <tr>
                      <td colspan="4" style="text-align: center; color: #64748b; padding: 30px;">
                        Nenhum log registrado para esta filial até o momento.
                      </td>
                    </tr>
                  ` : auditLogs.slice(0, 100).map(log => `
                    <tr style="border-bottom: 1px solid #1e293b;">
                      <td style="padding: 10px 14px; color: #94a3b8; white-space: nowrap; font-family: var(--font-mono);">
                        ${new Date(log.createdAt || log.timestamp || Date.now()).toLocaleString('pt-MZ')}
                      </td>
                      <td style="padding: 10px 14px;">
                        <span class="badge ${log.action.includes('CONCILIADO') ? 'badge-emerald' : log.action.includes('ESTORNO') || log.action.includes('CANCEL') ? 'badge-rose' : 'badge-blue'}">
                          ${log.action}
                        </span>
                      </td>
                      <td style="padding: 10px 14px; font-weight: 600; color: #cbd5e1; font-family: var(--font-mono);">${log.entity || '-'}</td>
                      <td style="padding: 10px 14px; color: #f8fafc;">${log.details || log.description || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}

      </div>
    `;

    // Subtab navigation events
    container.querySelector('#tab-aud-inventario')?.addEventListener('click', () => {
      currentSubTab = 'INVENTARIO';
      render();
    });
    container.querySelector('#tab-aud-historico')?.addEventListener('click', () => {
      currentSubTab = 'HISTORICO';
      render();
    });
    container.querySelector('#tab-aud-logs')?.addEventListener('click', () => {
      currentSubTab = 'LOGS';
      render();
    });

    if (currentSubTab === 'INVENTARIO') {
      // Location selector
      container.querySelector('#sel-aud-location')?.addEventListener('change', (e) => {
        selectedLocation = e.target.value;
        render();
      });

      // Category selector
      container.querySelector('#sel-aud-category')?.addEventListener('change', (e) => {
        filterCategory = e.target.value;
        render();
      });

      // Search input
      const searchInp = container.querySelector('#inp-aud-search');
      if (searchInp) {
        searchInp.addEventListener('input', (e) => {
          searchTerm = e.target.value;
          render();
        });
      }

      // Input physical count changes
      container.querySelectorAll('.inp-phys-count').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const pId = e.target.getAttribute('data-prod-id');
          const val = e.target.value.trim();
          if (val === '') {
            delete physicalCounts[pId];
          } else {
            physicalCounts[pId] = parseFloat(val) || 0;
          }
        });
        inp.addEventListener('blur', () => {
          render();
        });
      });

      // Equal button (copy system stock to physical count)
      container.querySelectorAll('.btn-set-same-stock').forEach(btn => {
        btn.addEventListener('click', () => {
          const pId = btn.getAttribute('data-prod-id');
          const stock = parseFloat(btn.getAttribute('data-stock')) || 0;
          physicalCounts[pId] = stock;
          render();
        });
      });

      // Folha de Contagem Cega (Imprimir)
      container.querySelector('#btn-print-blind-sheet')?.addEventListener('click', () => {
        printBlindCountSheet(products, selectedLocation);
      });

      // Relatório de Confrontação (Imprimir)
      container.querySelector('#btn-print-confrontation')?.addEventListener('click', () => {
        printConfrontationReport(products, physicalCounts, selectedLocation);
      });

      // Salvar Rascunho / Balanço no Histórico
      container.querySelector('#btn-save-draft-inventory')?.addEventListener('click', () => {
        saveInventoryRecord(false);
      });

      // Conciliar & Ajustar Saldos
      container.querySelector('#btn-reconcile-inventory')?.addEventListener('click', () => {
        if (!canReconcile) {
          showToast('Apenas Administradores ou Gerentes podem conciliar e alterar os saldos contábeis do sistema.', 'error');
          return;
        }
        openReconcileModal();
      });
    }

    if (currentSubTab === 'HISTORICO') {
      container.querySelectorAll('.btn-view-inv-details').forEach(btn => {
        btn.addEventListener('click', () => {
          const invId = btn.getAttribute('data-inv-id');
          const inv = inventories.find(i => i.id === invId);
          if (inv) openInventoryDetailsModal(inv);
        });
      });
    }
  };

  const saveInventoryRecord = (reconcile) => {
    const products = db.getProducts(storeId);
    const auditedItems = [];

    products.forEach(p => {
      if (physicalCounts[p.id] !== undefined) {
        const sysStock = getSystemStock(p, selectedLocation);
        auditedItems.push({
          productId: p.id,
          productCode: p.code,
          productName: p.name,
          baseUnit: p.baseUnit,
          location: selectedLocation,
          systemStock: sysStock,
          physicalStock: physicalCounts[p.id],
          unitCost: p.costPriceBase || 0
        });
      }
    });

    if (auditedItems.length === 0) {
      showToast('Nenhum item com contagem física digitada para salvar.', 'warning');
      return;
    }

    const saved = db.saveInventoryAudit({
      storeId,
      operatorName: currentUser?.fullName || 'Auditor',
      items: auditedItems,
      notes: `Auditoria de Estoque realizada no setor ${selectedLocation}`,
      reconcile
    });

    showToast(
      reconcile 
        ? `Balanço ${saved.code} conciliado e saldos de estoque ajustados com sucesso!` 
        : `Inventário ${saved.code} registrado no histórico da loja com sucesso!`,
      'success'
    );

    // Reset physical counts if reconciled
    if (reconcile) {
      physicalCounts = {};
    }

    currentSubTab = 'HISTORICO';
    render();
  };

  const openReconcileModal = () => {
    const products = db.getProducts(storeId);
    const divergentItems = [];
    let netFinancial = 0;

    products.forEach(p => {
      if (physicalCounts[p.id] !== undefined) {
        const sys = getSystemStock(p, selectedLocation);
        const phys = physicalCounts[p.id];
        const diff = Number((phys - sys).toFixed(3));
        if (diff !== 0) {
          const val = diff * (p.costPriceBase || 0);
          netFinancial += val;
          divergentItems.push({
            name: p.name,
            code: p.code,
            unit: p.baseUnit,
            system: sys,
            physical: phys,
            diff,
            diffVal: val
          });
        }
      }
    });

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 650px;">
        <div class="modal-header">
          <h3 class="modal-title" style="color: #34d399;">Conciliação e Ajuste Oficial de Estoque</h3>
          <button class="modal-close-btn" id="btn-close-rec-modal">✕</button>
        </div>
        <div class="modal-body" style="padding: 18px; display: flex; flex-direction: column; gap: 14px;">
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; padding: 12px; font-size: 12px; color: #a7f3d0;">
            <strong>Atenção:</strong> Esta operação atualizará imediatamente os saldos contábeis do sistema de acordo com a contagem física conferida no local <strong>${selectedLocation}</strong>.
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div style="background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;">
              <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Itens com Divergência:</span>
              <div style="font-size: 16px; font-weight: 800; color: #f8fafc;">${divergentItems.length} materiais</div>
            </div>
            <div style="background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;">
              <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Impacto Financeiro Líquido:</span>
              <div style="font-size: 16px; font-weight: 800; color: ${netFinancial >= 0 ? '#34d399' : '#f87171'};">
                ${netFinancial >= 0 ? '+' : ''}${i18n.formatMoney(netFinancial)}
              </div>
            </div>
          </div>

          <div style="max-height: 200px; overflow-y: auto; border: 1px solid #334155; border-radius: 6px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background: #0f172a; color: #94a3b8; border-bottom: 1px solid #334155;">
                  <th style="padding: 6px 10px;">Material</th>
                  <th style="padding: 6px 10px;">Sistema</th>
                  <th style="padding: 6px 10px;">Físico</th>
                  <th style="padding: 6px 10px;">Ajuste</th>
                </tr>
              </thead>
              <tbody>
                ${divergentItems.length === 0 ? `
                  <tr><td colspan="4" style="text-align: center; color: #34d399; padding: 16px;">Nenhuma divergência encontrada! O estoque está 100% batido.</td></tr>
                ` : divergentItems.map(it => `
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 6px 10px; color: #f8fafc; font-weight: 600;">${it.name}</td>
                    <td style="padding: 6px 10px; color: #94a3b8;">${it.system} ${it.unit}</td>
                    <td style="padding: 6px 10px; color: #38bdf8; font-weight: 700;">${it.physical} ${it.unit}</td>
                    <td style="padding: 6px 10px; font-weight: 700; color: ${it.diff > 0 ? '#34d399' : '#f87171'};">
                      ${it.diff > 0 ? '+' : ''}${it.diff} ${it.unit}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-reconcile">Cancelar</button>
          <button class="btn btn-primary" id="btn-confirm-reconcile" style="background: #059669; border-color: #059669;">
            Confirmar e Ajustar Saldos
          </button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-rec-modal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-reconcile').onclick = () => modal.remove();
    modal.querySelector('#btn-confirm-reconcile').onclick = () => {
      modal.remove();
      saveInventoryRecord(true);
    };

    document.body.appendChild(modal);
  };

  const openInventoryDetailsModal = (inv) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 700px;">
        <div class="modal-header">
          <h3 class="modal-title">Detalhes do Inventário ${inv.code}</h3>
          <button class="modal-close-btn" id="btn-close-inv-det">✕</button>
        </div>
        <div class="modal-body" style="padding: 18px; display: flex; flex-direction: column; gap: 12px;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 11px;">
            <div><strong>Data:</strong> ${new Date(inv.timestamp).toLocaleString('pt-MZ')}</div>
            <div><strong>Auditor:</strong> ${inv.operatorName}</div>
            <div><strong>Status:</strong> ${inv.reconciled ? 'Saldos Ajustados' : 'Confrontação'}</div>
          </div>

          <div style="max-height: 250px; overflow-y: auto; border: 1px solid #334155; border-radius: 6px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background: #0f172a; color: #94a3b8; border-bottom: 1px solid #334155;">
                  <th style="padding: 6px 10px;">Código</th>
                  <th style="padding: 6px 10px;">Material</th>
                  <th style="padding: 6px 10px;">Sistema</th>
                  <th style="padding: 6px 10px;">Físico</th>
                  <th style="padding: 6px 10px;">Diferença</th>
                  <th style="padding: 6px 10px; text-align: right;">Impacto</th>
                </tr>
              </thead>
              <tbody>
                ${(inv.items || []).map(it => `
                  <tr style="border-bottom: 1px solid #1e293b;">
                    <td style="padding: 6px 10px; font-family: var(--font-mono); color: #94a3b8;">${it.productCode || '-'}</td>
                    <td style="padding: 6px 10px; color: #f8fafc; font-weight: 600;">${it.productName}</td>
                    <td style="padding: 6px 10px; color: #94a3b8;">${it.systemStock} ${it.baseUnit}</td>
                    <td style="padding: 6px 10px; color: #38bdf8; font-weight: 700;">${it.physicalStock} ${it.baseUnit}</td>
                    <td style="padding: 6px 10px; font-weight: 700; color: ${it.divergence > 0 ? '#34d399' : it.divergence < 0 ? '#f87171' : '#94a3b8'};">
                      ${it.divergence > 0 ? '+' : ''}${it.divergence} ${it.baseUnit}
                    </td>
                    <td style="padding: 6px 10px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: ${(it.diffValue || 0) >= 0 ? '#34d399' : '#f87171'};">
                      ${i18n.formatMoney(it.diffValue || 0)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-close-inv-det-foot">Fechar</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-inv-det').onclick = () => modal.remove();
    modal.querySelector('#btn-close-inv-det-foot').onclick = () => modal.remove();
    document.body.appendChild(modal);
  };

  const printBlindCountSheet = (products, location) => {
    const config = db.getConfig();
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Folha de Contagem Cega - ${currentStore?.name || 'Loja'}</title>
        <style>
          body { font-family: sans-serif; padding: 25px; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 18px; font-weight: 900; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #f1f5f9; }
          .count-box { width: 100px; height: 24px; border: 1px dashed #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${config.companyName || 'GEF Ferragens'} - FILIAL: ${currentStore?.name || 'LOJA PRINCIPAL'}</div>
          <div><strong>FOLHA DE CONTAGEM FÍSICA CEGA DE ESTOQUE</strong></div>
          <div style="font-size: 11px; margin-top: 4px;">Setor / Local: <strong>${location}</strong> | Data: ${new Date().toLocaleDateString('pt-MZ')} | Auditor: ___________________________</div>
        </div>
        <p style="font-size: 11px; color: #475569;">
          * Instruções: Conte fisicamente todos os itens no galpão/gôndola e anote a quantidade exata apurada na coluna "Contagem Física Real". Não utilize estimativas.
        </p>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">Item</th>
              <th style="width: 90px;">Código</th>
              <th>Material / Descrição do Produto</th>
              <th style="width: 80px;">Unidade</th>
              <th style="width: 140px; text-align: center;">Contagem Física Real</th>
              <th style="width: 150px;">Assinatura / Visto</th>
            </tr>
          </thead>
          <tbody>
            ${products.map((p, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${p.code}</strong></td>
                <td>${p.name}</td>
                <td>${p.baseUnit}</td>
                <td style="text-align: center;">
                  <div class="count-box"></div>
                </td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px;">
          <div>Assinatura do Conferente: ____________________________________</div>
          <div>Visto do Gerente da Loja: ____________________________________</div>
        </div>
        <script>window.print();<\/script>
      </body>
      </html>
    `);
  };

  const printConfrontationReport = (products, counts, location) => {
    const config = db.getConfig();
    const win = window.open('', '_blank');
    if (!win) return;

    let totalSys = 0;
    let totalPhys = 0;
    let netVal = 0;

    const rows = products.map((p, idx) => {
      const sys = getSystemStock(p, location);
      const phys = counts[p.id] !== undefined ? counts[p.id] : sys;
      const diff = Number((phys - sys).toFixed(3));
      const val = diff * (p.costPriceBase || 0);
      netVal += val;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${p.code}</strong></td>
          <td>${p.name}</td>
          <td>${p.baseUnit}</td>
          <td>${sys.toFixed(2)}</td>
          <td>${phys.toFixed(2)}</td>
          <td style="font-weight: bold; color: ${diff > 0 ? '#15803d' : diff < 0 ? '#b91c1c' : '#334155'};">
            ${diff > 0 ? '+' : ''}${diff.toFixed(2)}
          </td>
          <td>${i18n.formatMoney(p.costPriceBase || 0)}</td>
          <td style="text-align: right; font-weight: bold; color: ${val > 0 ? '#15803d' : val < 0 ? '#b91c1c' : '#334155'};">
            ${val >= 0 ? '+' : ''}${i18n.formatMoney(val)}
          </td>
        </tr>
      `;
    }).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mapa de Confrontação de Estoque - ${currentStore?.name || 'Loja'}</title>
        <style>
          body { font-family: sans-serif; padding: 25px; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 18px; font-weight: 900; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; }
          .total { text-align: right; font-size: 14px; font-weight: bold; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${config.companyName || 'GEF Ferragens'} - FILIAL: ${currentStore?.name || 'LOJA PRINCIPAL'}</div>
          <div><strong>RELATÓRIO DE CONFRONTAÇÃO DE ESTOQUE (SISTEMA vs FÍSICO)</strong></div>
          <div style="font-size: 11px; margin-top: 4px;">Setor: <strong>${location}</strong> | Gerado em: ${new Date().toLocaleString('pt-MZ')} | Responsável: ${currentUser?.fullName || 'Auditor'}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Código</th>
              <th>Material</th>
              <th>Unid</th>
              <th>Saldo Sistema</th>
              <th>Contagem Física</th>
              <th>Divergência</th>
              <th>Custo Unit.</th>
              <th style="text-align: right;">Impacto Financeiro</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="total">
          IMPACTO FINANCEIRO LÍQUIDO DA AUDITORIA: ${netVal >= 0 ? '+' : ''}${i18n.formatMoney(netVal)}
        </div>
        <script>window.print();<\/script>
      </body>
      </html>
    `);
  };

  render();
}
