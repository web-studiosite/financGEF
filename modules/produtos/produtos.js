/**
 * GEF - GESTÃO FINANCEIRA | CATÁLOGO DE PRODUTOS & MATERIAIS
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';

export function initProdutosModule(container) {
  const storeId = db.getCurrentStoreId();
  const currentUser = auth.getCurrentUser();
  const isAdmin = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN' || currentUser.role === 'MANAGER');
  let products = db.getProducts(storeId);
  let searchTerm = '';
  let categoryFilter = 'ALL';

  const categories = ['ALL', 'Cimento & Argamassa', 'Aço & Ferro', 'Tubagens & Hidráulica', 'Material Elétrico', 'Tintas & Impermeabilizantes', 'Ferramentas'];

  const render = () => {
    products = db.getProducts(storeId);

    const filtered = products.filter(p => {
      const matchSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.code || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.barcode || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'ALL' || (p.category || '').includes(categoryFilter.split(' ')[0]);
      return matchSearch && matchCat;
    });

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 20px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">Catálogo de Materiais & Conversões</h2>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Cadastro de produtos de construção, múltiplos tipos de embalagem (Saco/Pá/Metro), alertas de mínimo e margens.
            </div>
          </div>
          ${isAdmin ? `
            <button class="btn btn-primary" id="btn-create-product">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12"/></svg>
              <span>Cadastrar Novo Material</span>
            </button>
          ` : ''}
        </div>

        <!-- Filters Bar Card -->
        <div class="card" style="padding: 12px 16px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <input 
            type="text" 
            id="input-prod-search" 
            placeholder="Buscar por nome, código interno ou código de barras..." 
            value="${searchTerm}"
            style="flex: 1; min-width: 200px; font-size: 12px;"
          >

          <select id="select-cat-filter" style="font-size: 12px;">
            ${categories.map(c => `
              <option value="${c}" ${categoryFilter === c ? 'selected' : ''}>
                ${c === 'ALL' ? 'Todas as Categorias' : c}
              </option>
            `).join('')}
          </select>

          <button class="btn btn-secondary" id="btn-prod-clear" style="padding: 6px 12px; font-size: 11px;">
            Limpar
          </button>
        </div>

        <!-- Products Table Card -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Material / Descrição</th>
                  <th>Categoria</th>
                  <th>Unidade</th>
                  <th>Estoque Atual</th>
                  ${isAdmin ? '<th>Preço Custo</th>' : ''}
                  <th>Preço Venda</th>
                  ${isAdmin ? '<th>Margem</th>' : ''}
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="9" style="text-align: center; color: #64748b; padding: 32px;">
                      Nenhum produto cadastrado para esta visualização.
                    </td>
                  </tr>
                ` : filtered.map(p => {
                  const margin = p.salePriceBase > 0 ? ((p.salePriceBase - p.costPriceBase) / p.salePriceBase * 100).toFixed(1) : 0;
                  const isLow = p.currentStockBase <= p.minStockAlert && p.currentStockBase > 0;
                  const isOut = p.currentStockBase <= 0;
                  return `
                    <tr>
                      <td>
                        <span style="font-weight: 800; font-family: var(--font-mono); color: #f97316;">${p.code}</span>
                        ${p.barcode ? `<div style="font-size: 9px; color: #64748b;">${p.barcode}</div>` : ''}
                      </td>
                      <td>
                        <div style="font-weight: 700; color: #f8fafc;">${p.name}</div>
                        ${(p.conversions || []).length > 0 ? `
                          <div style="font-size: 10px; color: #94a3b8;">
                            Embalagens: ${(p.conversions || []).map(c => c.packagingName).join(', ')}
                          </div>
                        ` : ''}
                      </td>
                      <td>
                        <span class="badge badge-blue" style="font-size: 9px;">${p.category || 'Geral'}</span>
                      </td>
                      <td>
                        <strong style="color: #cbd5e1; font-family: var(--font-mono);">${p.baseUnit}</strong>
                      </td>
                      <td>
                        <span class="badge ${isOut ? 'badge-red' : isLow ? 'badge-amber' : 'badge-emerald'}" style="font-size: 10px;">
                          ${p.currentStockBase} ${p.baseUnit}
                        </span>
                        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
                          Loja: ${p.stockByLocation?.LOJA || 0} | Arm: ${p.stockByLocation?.ARMAZEM || 0} | Pátio: ${p.stockByLocation?.PATIO || 0}
                        </div>
                      </td>
                      ${isAdmin ? `
                        <td style="font-family: var(--font-mono); color: #cbd5e1;">
                          ${p.costPriceBase.toFixed(2)} MT
                        </td>
                      ` : ''}
                      <td style="font-family: var(--font-mono); font-weight: 800; color: #34d399;">
                        ${p.salePriceBase.toFixed(2)} MT
                      </td>
                      ${isAdmin ? `
                        <td>
                          <span style="font-size: 11px; font-weight: bold; color: ${margin > 25 ? '#34d399' : '#f59e0b'};">
                            ${margin}%
                          </span>
                        </td>
                      ` : ''}
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                          ${isAdmin ? `
                            <button class="btn btn-secondary btn-edit-prod" data-prod-id="${p.id}" style="padding: 4px 8px; font-size: 10px;">
                              Editar
                            </button>
                            <button class="btn btn-secondary btn-delete-prod" data-prod-id="${p.id}" style="padding: 4px 6px; font-size: 10px; color: #f87171;">
                              ✕
                            </button>
                          ` : `
                            <span style="font-size: 10px; color: #64748b;">Apenas leitura</span>
                          `}
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
    const searchInp = container.querySelector('#input-prod-search');
    searchInp.oninput = (e) => {
      searchTerm = e.target.value;
      render();
      const ref = container.querySelector('#input-prod-search');
      if (ref) {
        ref.focus();
        ref.setSelectionRange(searchTerm.length, searchTerm.length);
      }
    };

    container.querySelector('#select-cat-filter').onchange = (e) => {
      categoryFilter = e.target.value;
      render();
    };

    container.querySelector('#btn-prod-clear').onclick = () => {
      searchTerm = '';
      categoryFilter = 'ALL';
      render();
    };

    // Create
    container.querySelector('#btn-create-product').onclick = () => {
      openProductModal(null, () => render());
    };

    // Edit
    container.querySelectorAll('.btn-edit-prod').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-prod-id');
        const prod = products.find(p => p.id === id);
        if (prod) openProductModal(prod, () => render());
      };
    });

    // Delete
    container.querySelectorAll('.btn-delete-prod').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-prod-id');
        if (confirm('Deseja realmente remover este material do catálogo?')) {
          db.deleteProduct(id);
          showToast('Material removido do cadastro.', 'success');
          render();
        }
      };
    });
  };

  const openProductModal = (product, onSuccess) => {
    const isEdit = !!product;
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    let conversions = product?.conversions ? JSON.parse(JSON.stringify(product.conversions)) : [];

    const renderModal = () => {
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Editar Material / Produto' : 'Cadastrar Novo Material'}</h3>
            <button class="modal-close-btn" id="btn-close-pmodal">✕</button>
          </div>

          <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px; max-height: 75vh; overflow-y: auto;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Código Interno:</label>
                <input type="text" id="inp-p-code" value="${product?.code || 'MAT-' + Math.floor(100 + Math.random() * 900)}" required style="width: 100%; font-family: var(--font-mono);">
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Código de Barras (EAN):</label>
                <input type="text" id="inp-p-barcode" value="${product?.barcode || ''}" placeholder="Ex: 7891234567890" style="width: 100%; font-family: var(--font-mono);">
              </div>
            </div>

            <div>
              <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Nome do Material:</label>
              <input type="text" id="inp-p-name" value="${product?.name || ''}" placeholder="Ex: Cimento Portland Especial 32.5N" required style="width: 100%;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Categoria:</label>
                <select id="inp-p-category" style="width: 100%;">
                  <option value="Cimento & Argamassa" ${product?.category === 'Cimento & Argamassa' ? 'selected' : ''}>Cimento & Argamassa</option>
                  <option value="Aço & Ferro" ${product?.category === 'Aço & Ferro' ? 'selected' : ''}>Aço & Ferro</option>
                  <option value="Tubagens & Hidráulica" ${product?.category === 'Tubagens & Hidráulica' ? 'selected' : ''}>Tubagens & Hidráulica</option>
                  <option value="Material Elétrico" ${product?.category === 'Material Elétrico' ? 'selected' : ''}>Material Elétrico</option>
                  <option value="Tintas & Impermeabilizantes" ${product?.category === 'Tintas & Impermeabilizantes' ? 'selected' : ''}>Tintas & Impermeabilizantes</option>
                  <option value="Ferramentas" ${product?.category === 'Ferramentas' ? 'selected' : ''}>Ferramentas</option>
                  <option value="Agregados & Areia" ${product?.category === 'Agregados & Areia' ? 'selected' : ''}>Agregados & Areia</option>
                </select>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Unidade Base:</label>
                <select id="inp-p-unit" style="width: 100%;">
                  <option value="saco" ${product?.baseUnit === 'saco' ? 'selected' : ''}>Saco</option>
                  <option value="kg" ${product?.baseUnit === 'kg' ? 'selected' : ''}>Quilograma (kg)</option>
                  <option value="un" ${product?.baseUnit === 'un' ? 'selected' : ''}>Unidade (un)</option>
                  <option value="barra" ${product?.baseUnit === 'barra' ? 'selected' : ''}>Barra</option>
                  <option value="m" ${product?.baseUnit === 'm' ? 'selected' : ''}>Metro Linear (m)</option>
                  <option value="m2" ${product?.baseUnit === 'm2' ? 'selected' : ''}>Metro Quadrado (m²)</option>
                  <option value="m3" ${product?.baseUnit === 'm3' ? 'selected' : ''}>Metro Cúbico (m³)</option>
                  <option value="lata" ${product?.baseUnit === 'lata' ? 'selected' : ''}>Lata</option>
                  <option value="rolo" ${product?.baseUnit === 'rolo' ? 'selected' : ''}>Rolo</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Preço Custo (MT):</label>
                <input type="number" step="0.01" id="inp-p-cost" value="${product?.costPriceBase || 0}" style="width: 100%; font-family: var(--font-mono);">
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Preço Venda (MT):</label>
                <input type="number" step="0.01" id="inp-p-sale" value="${product?.salePriceBase || 0}" style="width: 100%; font-family: var(--font-mono); font-weight: bold; color: #34d399;">
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Alerta Estoque Mín:</label>
                <input type="number" step="1" id="inp-p-min" value="${product?.minStockAlert || 10}" style="width: 100%; font-family: var(--font-mono);">
              </div>
            </div>

            <!-- Locations breakdown if new -->
            ${!isEdit ? `
              <div style="background: #1e293b; padding: 10px; border-radius: 8px; border: 1px solid #334155;">
                <span style="font-size: 10px; font-weight: 700; color: #ea580c; text-transform: uppercase; display: block; margin-bottom: 6px;">Estoque Inicial por Local:</span>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Loja:</label>
                    <input type="number" id="inp-p-stock-loja" value="0" style="width: 100%; font-size: 11px;">
                  </div>
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Armazém:</label>
                    <input type="number" id="inp-p-stock-arm" value="0" style="width: 100%; font-size: 11px;">
                  </div>
                  <div>
                    <label style="font-size: 10px; color: #94a3b8;">Pátio:</label>
                    <input type="number" id="inp-p-stock-patio" value="0" style="width: 100%; font-size: 11px;">
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Conversions table (Multi-packaging) -->
            <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 10px; font-weight: 700; color: #ea580c; text-transform: uppercase;">Múltiplas Embalagens / Conversões (PDV):</span>
                <button type="button" class="btn btn-secondary" id="btn-add-conversion" style="padding: 2px 8px; font-size: 10px;">
                  + Adicionar Embalagem
                </button>
              </div>

              ${conversions.length === 0 ? `
                <div style="font-size: 11px; color: #64748b;">Nenhuma embalagem alternativa configurada (vendido apenas na unidade base).</div>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${conversions.map((c, idx) => `
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 6px; align-items: center;">
                      <input type="text" placeholder="Nome (Ex: Saco 50kg)" value="${c.packagingName}" data-cidx="${idx}" class="inp-c-name" style="font-size: 11px;">
                      <input type="number" step="any" placeholder="Multiplicador" value="${c.multiplierToBase}" data-cidx="${idx}" class="inp-c-mult" style="font-size: 11px;">
                      <input type="number" step="any" placeholder="Preço MT" value="${c.salePrice || ''}" data-cidx="${idx}" class="inp-c-price" style="font-size: 11px;">
                      <button type="button" class="btn-del-conv" data-cidx="${idx}" style="color: #f87171; background: transparent; border: none; cursor: pointer;">✕</button>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

            <!-- Weight Scale toggle -->
            <div>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer;">
                <input type="checkbox" id="inp-p-weight" ${product?.allowWeight ? 'checked' : ''}>
                <span>Habilitar pesagem direta na Balança Eletrônica (Modo Granel / Quilo)</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cancel-pmodal">Cancelar</button>
            <button class="btn btn-primary" id="btn-save-prod">
              ${isEdit ? 'Atualizar Material' : 'Salvar no Catálogo'}
            </button>
          </div>
        </div>
      `;

      modal.querySelector('#btn-close-pmodal').onclick = () => modal.remove();
      modal.querySelector('#btn-cancel-pmodal').onclick = () => modal.remove();

      // Add conversion row
      modal.querySelector('#btn-add-conversion').onclick = () => {
        conversions.push({
          packagingName: 'Embalagem Especial',
          multiplierToBase: 1,
          salePrice: 0
        });
        renderModal();
      };

      // Conversion row inputs
      modal.querySelectorAll('.inp-c-name').forEach(inp => {
        inp.oninput = (e) => {
          const idx = parseInt(inp.getAttribute('data-cidx'));
          conversions[idx].packagingName = e.target.value;
        };
      });
      modal.querySelectorAll('.inp-c-mult').forEach(inp => {
        inp.oninput = (e) => {
          const idx = parseInt(inp.getAttribute('data-cidx'));
          conversions[idx].multiplierToBase = parseFloat(e.target.value) || 1;
        };
      });
      modal.querySelectorAll('.inp-c-price').forEach(inp => {
        inp.oninput = (e) => {
          const idx = parseInt(inp.getAttribute('data-cidx'));
          conversions[idx].salePrice = parseFloat(e.target.value) || 0;
        };
      });
      modal.querySelectorAll('.btn-del-conv').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-cidx'));
          conversions.splice(idx, 1);
          renderModal();
        };
      });

      // Save
      modal.querySelector('#btn-save-prod').onclick = () => {
        const name = modal.querySelector('#inp-p-name').value.trim();
        const code = modal.querySelector('#inp-p-code').value.trim();
        if (!name || !code) {
          showToast('Código e Nome do material são obrigatórios.', 'error');
          return;
        }

        const cost = parseFloat(modal.querySelector('#inp-p-cost').value) || 0;
        const sale = parseFloat(modal.querySelector('#inp-p-sale').value) || 0;
        const minStock = parseFloat(modal.querySelector('#inp-p-min').value) || 10;
        const baseUnit = modal.querySelector('#inp-p-unit').value;
        const category = modal.querySelector('#inp-p-category').value;
        const barcode = modal.querySelector('#inp-p-barcode').value.trim();
        const allowWeight = modal.querySelector('#inp-p-weight').checked;

        let stockByLocation = product?.stockByLocation || { LOJA: 0, ARMAZEM: 0, PATIO: 0 };
        let currentStockBase = product?.currentStockBase || 0;

        if (!isEdit) {
          const sLoja = parseFloat(modal.querySelector('#inp-p-stock-loja')?.value) || 0;
          const sArm = parseFloat(modal.querySelector('#inp-p-stock-arm')?.value) || 0;
          const sPatio = parseFloat(modal.querySelector('#inp-p-stock-patio')?.value) || 0;
          stockByLocation = { LOJA: sLoja, ARMAZEM: sArm, PATIO: sPatio };
          currentStockBase = sLoja + sArm + sPatio;
        }

        const savedItem = {
          id: product?.id || 'prod-' + Date.now(),
          storeId,
          code,
          barcode,
          name,
          category,
          baseUnit,
          costPriceBase: cost,
          salePriceBase: sale,
          minStockAlert: minStock,
          minStockBase: minStock,
          currentStockBase,
          stockByLocation,
          allowWeight,
          conversions
        };

        db.saveProduct(savedItem);
        showToast(`Material ${savedItem.name} gravado com sucesso!`, 'success');
        modal.remove();
        if (onSuccess) onSuccess();
      };
    };

    renderModal();
    document.body.appendChild(modal);
  };

  render();
}
