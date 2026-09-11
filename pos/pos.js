/**
 * GEF - GESTÃO FINANCEIRA | PDV (FRENTE DE CAIXA)
 * JavaScript Puro (Vanilla JS)
 * Layout com catálogo no topo e carrinho na parte inferior em cards
 * Suporte a digitação direta do nome do cliente
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { openScaleModal } from '../../js/components/scale-modal.js';
import { openReceiptModal } from '../../js/components/receipt-modal.js';
import { showToast } from '../../js/components/toast.js';

export function initPosModule(container, options = {}) {
  const storeId = db.getCurrentStoreId();
  let products = db.getProducts(storeId);
  let customers = db.getCustomers(storeId);
  const currentUser = auth.getCurrentUser();

  let cart = [];
  let selectedCategory = 'TODOS';
  let searchTerm = '';
  let customerName = 'Consumidor Final (Balcão)';
  let selectedCustomerId = '';
  let selectedPaymentMethod = 'DINHEIRO';
  let cashTendered = '';
  let discountAmount = 0;
  let needsDelivery = false;
  let notes = '';

  const categories = [
    'TODOS',
    'Cimento & Argamassa',
    'Aço & Ferro',
    'Tubagens & Hidráulica',
    'Material Elétrico',
    'Tintas & Impermeabilizantes',
    'Ferramentas'
  ];

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    return Math.max(0, sub - (discountAmount || 0));
  };

  const render = () => {
    const subtotal = calculateSubtotal();
    const total = calculateTotal();
    const tendered = parseFloat(cashTendered) || 0;
    const change = tendered >= total ? tendered - total : 0;

    const filteredProducts = products.filter(p => {
      const matchCat = selectedCategory === 'TODOS' || (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase().split(' ')[0]);
      const matchSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.code || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.barcode || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });

    const registeredCustomer = customers.find(c => c.id === selectedCustomerId || c.name.toLowerCase() === customerName.toLowerCase());

    container.innerHTML = `
      <div class="pos-container">
        <!-- 1. TOP CARD: Catálogo de Produtos & Busca -->
        <div class="card" style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>
              <h2 style="font-size: 16px; font-weight: 800; color: #f8fafc; margin: 0;">Catálogo de Materiais & Balcão</h2>
            </div>
            <div style="font-size: 11px; color: #94a3b8;">
              ${filteredProducts.length} materiais disponíveis para faturamento
            </div>
          </div>

          <!-- Search Box & Barcode Scanner -->
          <div style="display: flex; gap: 8px; align-items: center;">
            <div style="flex: 1; position: relative;">
              <input 
                type="text" 
                id="input-pos-search" 
                placeholder="Buscar por nome, código ou leitor de código de barras (Ex: Cimento, Varão, Tubo)..." 
                value="${searchTerm}"
                style="width: 100%; padding-left: 36px; font-size: 13px;"
              >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" style="position: absolute; left: 12px; top: 11px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            ${searchTerm ? `
              <button class="btn btn-secondary" id="btn-clear-search" style="padding: 8px 12px;">Limpar</button>
            ` : ''}
          </div>

          <!-- Category Filter Bar -->
          <div class="pos-category-bar">
            ${categories.map(cat => `
              <button class="pos-category-chip ${selectedCategory === cat ? 'active' : ''}" data-cat="${cat}">
                ${cat}
              </button>
            `).join('')}
          </div>

          <!-- Products Grid -->
          <div class="pos-product-grid" style="max-height: 380px; overflow-y: auto; padding-right: 4px;">
            ${filteredProducts.length === 0 ? `
              <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b;">
                Nenhum material localizado no estoque com os filtros aplicados.
              </div>
            ` : filteredProducts.map(p => {
              const isLowStock = p.currentStockBase <= p.minStockAlert && p.currentStockBase > 0;
              const isOut = p.currentStockBase <= 0;
              const isWeight = p.baseUnit === 'kg' || p.allowWeight;
              const conversions = p.conversions || [];

              return `
                <div class="pos-product-card ${isOut ? 'out-of-stock' : ''}" data-prod-id="${p.id}">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                    <span style="font-size: 10px; font-family: var(--font-mono); color: #94a3b8;">${p.code}</span>
                    <span class="badge ${isOut ? 'badge-red' : isLowStock ? 'badge-amber' : 'badge-emerald'}" style="font-size: 8px;">
                      ${p.currentStockBase} ${p.baseUnit}
                    </span>
                  </div>

                  <div style="font-weight: 700; font-size: 12px; color: #f8fafc; line-height: 1.3; min-height: 32px;">
                    ${p.name}
                  </div>

                  <!-- Packaging dropdown if available -->
                  ${conversions.length > 0 ? `
                    <select class="pos-package-select" data-prod-id="${p.id}" style="margin-top: 6px; padding: 2px 4px; font-size: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 4px; color: #cbd5e1; width: 100%;">
                      <option value="BASE" data-mult="1" data-price="${p.salePriceBase}">${p.baseUnit} (Unitário) - ${p.salePriceBase.toFixed(2)} MT</option>
                      ${conversions.map((c, idx) => `
                        <option value="${idx}" data-mult="${c.multiplierToBase || c.multiplier}" data-price="${c.salePrice || (p.salePriceBase * (c.multiplierToBase || c.multiplier))}">
                          ${c.packagingName || c.packageName} (${c.multiplierToBase || c.multiplier} ${p.baseUnit}) - ${(c.salePrice || (p.salePriceBase * (c.multiplierToBase || c.multiplier))).toFixed(2)} MT
                        </option>
                      `).join('')}
                    </select>
                  ` : ''}

                  <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 14px; font-weight: 900; font-family: var(--font-mono); color: #34d399;">
                      ${p.salePriceBase.toFixed(2)} MT
                    </div>
                    ${isWeight ? `
                      <button class="btn btn-secondary btn-scale-trigger" data-prod-id="${p.id}" style="padding: 3px 6px; font-size: 10px; border-color: #ea580c; color: #f97316;">
                        ⚖️ Pesar
                      </button>
                    ` : `
                      <button class="btn btn-primary btn-add-prod" data-prod-id="${p.id}" style="padding: 3px 8px; font-size: 11px;">
                        + Adicionar
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 2. BOTTOM CARD: Carrinho de Vendas & Fechamento ("O carrinho de vendas é que pode ficar em baixo") -->
        <div class="card" style="background: #0f172a; border-color: #334155; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              <h3 style="font-size: 15px; font-weight: 800; color: #f8fafc; margin: 0;">Carrinho de Vendas & Conclusão do Pedido</h3>
            </div>
            ${cart.length > 0 ? `
              <button class="btn btn-secondary" id="btn-clear-cart" style="padding: 3px 8px; font-size: 11px; color: #f87171;">
                Limpar Carrinho
              </button>
            ` : ''}
          </div>

          <div class="pos-cart-bottom-grid">
            <!-- Left Sub-column: Customer typing & Items table -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <!-- Customer Input Box: Typeable name -->
              <div class="card" style="padding: 10px 12px; background: #1e293b; border-color: #334155;">
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Nome do Cliente:</span>
                  <span style="font-size: 10px; color: #94a3b8;">(Digite livremente ou selecione da lista)</span>
                </label>
                <div style="display: flex; gap: 6px;">
                  <input 
                    type="text" 
                    id="input-cart-customer-name" 
                    list="datalist-pos-customers" 
                    placeholder="Digite o nome do cliente (ex: Mestre João, Empreiteiro Silva...)" 
                    value="${customerName}" 
                    style="flex: 1; padding: 6px 10px; font-size: 12px; background: #020617; border: 1px solid #334155; border-radius: 6px; color: #f8fafc;"
                  >
                  <datalist id="datalist-pos-customers">
                    <option value="Consumidor Final (Balcão)"></option>
                    ${customers.map(c => `
                      <option value="${c.name}">Limite: ${c.creditLimit} MT | NUIT: ${c.document || 'N/A'}</option>
                    `).join('')}
                  </datalist>
                  <button class="btn btn-secondary" id="btn-clear-customer-name" title="Limpar nome" style="padding: 4px 8px; font-size: 11px;">✕</button>
                </div>
                ${registeredCustomer ? `
                  <div style="margin-top: 6px; font-size: 11px; display: flex; justify-content: space-between; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 8px; border-radius: 4px;">
                    <span style="color: #6ee7b7;">Cliente Cadastrado: <strong>${registeredCustomer.name}</strong></span>
                    <span style="color: #cbd5e1;">Saldo Fiado: <strong style="color: ${registeredCustomer.creditLimit - registeredCustomer.currentDebt >= total ? '#34d399' : '#ef4444'}; font-family: var(--font-mono);">${(registeredCustomer.creditLimit - registeredCustomer.currentDebt).toFixed(2)} MT</strong></span>
                  </div>
                ` : `
                  <div style="margin-top: 4px; font-size: 10px; color: #94a3b8;">
                    Cliente avulso / balcão. Digite o nome para sair impresso no recibo.
                  </div>
                `}
              </div>

              <!-- Cart Items List/Table -->
              <div class="card" style="padding: 0; overflow: hidden; max-height: 240px; display: flex; flex-direction: column;">
                <div style="overflow-y: auto; flex: 1;">
                  ${cart.length === 0 ? `
                    <div style="text-align: center; color: #64748b; padding: 30px 16px; font-size: 12px;">
                      Nenhum item adicionado.<br>Clique em "+ Adicionar" em qualquer material do catálogo acima.
                    </div>
                  ` : `
                    <table class="data-table" style="margin: 0;">
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th>Embalagem</th>
                          <th>Qtd</th>
                          <th>Preço Un.</th>
                          <th>Subtotal</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        ${cart.map((item, idx) => `
                          <tr>
                            <td><strong>${item.productName}</strong></td>
                            <td style="font-size: 10px; color: #94a3b8;">${item.packagingName}</td>
                            <td>
                              <div style="display: flex; align-items: center; gap: 4px;">
                                <button class="btn btn-secondary btn-qty-dec" data-idx="${idx}" style="padding: 1px 6px; font-size: 10px;">-</button>
                                <input type="number" min="0.001" step="any" value="${item.quantity}" data-idx="${idx}" class="input-item-qty" style="width: 50px; padding: 2px; text-align: center; font-size: 11px; font-family: var(--font-mono);">
                                <button class="btn btn-secondary btn-qty-inc" data-idx="${idx}" style="padding: 1px 6px; font-size: 10px;">+</button>
                              </div>
                            </td>
                            <td style="font-family: var(--font-mono); font-size: 11px;">${item.unitPrice.toFixed(2)} MT</td>
                            <td style="font-family: var(--font-mono); font-weight: 800; color: #34d399;">
                              ${(item.quantity * item.unitPrice).toFixed(2)} MT
                            </td>
                            <td>
                              <button class="btn btn-secondary btn-remove-item" data-idx="${idx}" style="padding: 2px 4px; color: #f87171; border: none; background: transparent;">✕</button>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  `}
                </div>
              </div>
            </div>

            <!-- Right Sub-column: Payment method, calculations and checkout -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <!-- Payment Method Selection -->
              <div class="card" style="padding: 10px; background: #1e293b; border-color: #334155;">
                <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 6px;">Forma de Pagamento:</span>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;">
                  <button class="btn ${selectedPaymentMethod === 'DINHEIRO' ? 'btn-primary' : 'btn-secondary'} btn-pay-method" data-method="DINHEIRO" style="padding: 6px 2px; font-size: 10px;">
                    Dinheiro
                  </button>
                  <button class="btn ${selectedPaymentMethod === 'M-PESA' ? 'btn-primary' : 'btn-secondary'} btn-pay-method" data-method="M-PESA" style="padding: 6px 2px; font-size: 10px;">
                    M-Pesa
                  </button>
                  <button class="btn ${selectedPaymentMethod === 'E-MOLA' ? 'btn-primary' : 'btn-secondary'} btn-pay-method" data-method="E-MOLA" style="padding: 6px 2px; font-size: 10px;">
                    e-Mola
                  </button>
                  <button class="btn ${selectedPaymentMethod === 'POS_CARTAO' ? 'btn-primary' : 'btn-secondary'} btn-pay-method" data-method="POS_CARTAO" style="padding: 6px 2px; font-size: 10px;">
                    Cartão POS
                  </button>
                  <button class="btn ${selectedPaymentMethod === 'TRANSFERENCIA' ? 'btn-primary' : 'btn-secondary'} btn-pay-method" data-method="TRANSFERENCIA" style="padding: 6px 2px; font-size: 10px;">
                    Transferência
                  </button>
                  <button class="btn ${selectedPaymentMethod === 'CREDITO_FIADO' ? 'btn-primary' : 'btn-secondary'} btn-pay-method" data-method="CREDITO_FIADO" style="padding: 6px 2px; font-size: 10px; color: ${selectedPaymentMethod === 'CREDITO_FIADO' ? '#fff' : '#fbbf24'}; border-color: #f59e0b;">
                    Crédito Fiado
                  </button>
                </div>
              </div>

              <!-- Cash Tendered Box if Dinheiro -->
              ${selectedPaymentMethod === 'DINHEIRO' ? `
                <div class="card" style="padding: 8px 10px; background: #020617; border-color: #334155;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 11px; color: #94a3b8; font-weight: 700;">Valor Entregue pelo Cliente (MT):</span>
                    <input type="number" id="input-cash-tendered" placeholder="${total.toFixed(2)}" value="${cashTendered}" style="width: 100px; padding: 2px 6px; font-size: 12px; font-weight: 800; font-family: var(--font-mono); text-align: right;">
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px;">
                    <span style="color: #94a3b8;">Troco a Devolver:</span>
                    <strong style="color: ${tendered >= total ? '#34d399' : '#f59e0b'}; font-family: var(--font-mono);">
                      ${change.toFixed(2)} MT
                    </strong>
                  </div>
                </div>
              ` : ''}

              <!-- Totals and Discount Box -->
              <div class="card" style="padding: 10px 12px; background: #020617; border-color: #334155; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
                  <span>Subtotal dos Materiais:</span>
                  <span>${subtotal.toFixed(2)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8;">
                  <span>Desconto Comercial (MT):</span>
                  <input type="number" min="0" step="1" id="input-discount" value="${discountAmount || ''}" placeholder="0.00" style="width: 80px; padding: 2px 4px; font-size: 11px; text-align: right;">
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1f2937; padding-top: 6px; margin-top: 4px;">
                  <span style="font-size: 14px; font-weight: 900; color: #f8fafc;">VALOR TOTAL:</span>
                  <span style="font-size: 20px; font-weight: 900; color: #34d399; font-family: var(--font-mono);">${total.toFixed(2)} MT</span>
                </div>
              </div>

              <!-- Delivery schedule toggle Card -->
              <div class="card" style="padding: 8px 12px; background: #020617; border-color: #334155;">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; cursor: pointer; margin: 0;">
                  <input type="checkbox" id="chk-delivery" ${needsDelivery ? 'checked' : ''}>
                  <span style="font-weight: 600;">Agendar entrega física em canteiro de obra</span>
                </label>
              </div>

              <!-- Finalize Button -->
              <button 
                class="btn btn-primary" 
                id="btn-finalize-sale" 
                style="width: 100%; padding: 12px; font-size: 14px; font-weight: 900; background: #ea580c; border-color: #ea580c;"
                ${cart.length === 0 ? 'disabled' : ''}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
                <span>Concluir Venda (${total.toFixed(2)} MT)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // --- BIND EVENTS ---
    // Search input
    const searchInput = container.querySelector('#input-pos-search');
    if (searchInput) {
      searchInput.oninput = (e) => {
        searchTerm = e.target.value;
        render();
        const updatedInp = container.querySelector('#input-pos-search');
        if (updatedInp) {
          updatedInp.focus();
          updatedInp.setSelectionRange(searchTerm.length, searchTerm.length);
        }
      };
    }

    const clearSearchBtn = container.querySelector('#btn-clear-search');
    if (clearSearchBtn) {
      clearSearchBtn.onclick = () => {
        searchTerm = '';
        render();
      };
    }

    container.querySelectorAll('.pos-category-chip').forEach(btn => {
      btn.onclick = () => {
        selectedCategory = btn.getAttribute('data-cat');
        render();
      };
    });

    // Customer name typing
    const custNameInput = container.querySelector('#input-cart-customer-name');
    if (custNameInput) {
      custNameInput.oninput = (e) => {
        customerName = e.target.value;
        const match = customers.find(c => c.name.toLowerCase() === customerName.trim().toLowerCase());
        selectedCustomerId = match ? match.id : '';
      };
      custNameInput.onchange = (e) => {
        customerName = e.target.value;
        const match = customers.find(c => c.name.toLowerCase() === customerName.trim().toLowerCase());
        selectedCustomerId = match ? match.id : '';
        render();
      };
    }

    const clearCustBtn = container.querySelector('#btn-clear-customer-name');
    if (clearCustBtn) {
      clearCustBtn.onclick = () => {
        customerName = 'Consumidor Final (Balcão)';
        selectedCustomerId = '';
        render();
      };
    }

    // Add product to cart
    container.querySelectorAll('.btn-add-prod').forEach(btn => {
      btn.onclick = () => {
        const prodId = btn.getAttribute('data-prod-id');
        const prod = products.find(p => p.id === prodId);
        if (!prod) return;

        const card = btn.closest('.pos-product-card');
        const pkgSelect = card?.querySelector('.pos-package-select');
        let multiplier = 1;
        let packagingName = prod.baseUnit;
        let unitPrice = prod.salePriceBase;

        if (pkgSelect && pkgSelect.value !== 'BASE') {
          const opt = pkgSelect.selectedOptions[0];
          multiplier = parseFloat(opt.getAttribute('data-mult')) || 1;
          unitPrice = parseFloat(opt.getAttribute('data-price')) || prod.salePriceBase;
          packagingName = opt.textContent.split('(')[0].trim();
        }

        const existingIdx = cart.findIndex(it => it.productId === prod.id && it.packagingName === packagingName);
        if (existingIdx >= 0) {
          cart[existingIdx].quantity += 1;
        } else {
          cart.push({
            productId: prod.id,
            productName: prod.name,
            productCode: prod.code,
            packageId: pkgSelect?.value || 'BASE',
            packagingName,
            selectedUnit: packagingName,
            multiplierToBase: multiplier,
            multiplier,
            unitPrice,
            quantity: 1
          });
        }
        render();
      };
    });

    // Scale trigger
    container.querySelectorAll('.btn-scale-trigger').forEach(btn => {
      btn.onclick = () => {
        const prodId = btn.getAttribute('data-prod-id');
        const prod = products.find(p => p.id === prodId);
        if (prod) {
          openScaleModal(prod, (measuredWeight) => {
            cart.push({
              productId: prod.id,
              productName: prod.name,
              productCode: prod.code,
              packagingName: 'kg (Pesado)',
              selectedUnit: 'kg',
              multiplierToBase: 1,
              multiplier: 1,
              unitPrice: prod.salePriceBase,
              quantity: measuredWeight
            });
            render();
          });
        }
      };
    });

    // Clear cart
    const clearCartBtn = container.querySelector('#btn-clear-cart');
    if (clearCartBtn) {
      clearCartBtn.onclick = () => {
        cart = [];
        render();
      };
    }

    // Cart item adjustments
    container.querySelectorAll('.btn-qty-inc').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        cart[idx].quantity += 1;
        render();
      };
    });

    container.querySelectorAll('.btn-qty-dec').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (cart[idx].quantity > 1) {
          cart[idx].quantity -= 1;
        } else {
          cart.splice(idx, 1);
        }
        render();
      };
    });

    container.querySelectorAll('.input-item-qty').forEach(inp => {
      inp.onchange = (e) => {
        const idx = parseInt(inp.getAttribute('data-idx'));
        const val = parseFloat(e.target.value) || 1;
        cart[idx].quantity = Math.max(0.001, val);
        render();
      };
    });

    container.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        cart.splice(idx, 1);
        render();
      };
    });

    // Payment methods
    container.querySelectorAll('.btn-pay-method').forEach(btn => {
      btn.onclick = () => {
        selectedPaymentMethod = btn.getAttribute('data-method');
        render();
      };
    });

    // Cash tendered input
    const cashInp = container.querySelector('#input-cash-tendered');
    if (cashInp) {
      cashInp.oninput = (e) => {
        cashTendered = e.target.value;
        const curTendered = parseFloat(cashTendered) || 0;
        const curTotal = calculateTotal();
        const changeSpan = container.querySelector('strong[style*="font-family: var(--font-mono)"]');
        if (changeSpan) {
          const curChange = curTendered >= curTotal ? curTendered - curTotal : 0;
          changeSpan.textContent = curChange.toFixed(2) + ' MT';
          changeSpan.style.color = curTendered >= curTotal ? '#34d399' : '#f59e0b';
        }
      };
    }

    // Discount
    const discInp = container.querySelector('#input-discount');
    if (discInp) {
      discInp.onchange = (e) => {
        discountAmount = parseFloat(e.target.value) || 0;
        render();
      };
    }

    // Delivery checkbox
    const delivChk = container.querySelector('#chk-delivery');
    if (delivChk) {
      delivChk.onchange = (e) => {
        needsDelivery = e.target.checked;
      };
    }

    // Finalize Sale
    const finalizeBtn = container.querySelector('#btn-finalize-sale');
    if (finalizeBtn) {
      finalizeBtn.onclick = () => {
        if (cart.length === 0) return;

        // Verify Credit Limit if Fiado
        if (selectedPaymentMethod === 'CREDITO_FIADO') {
          if (!registeredCustomer) {
            showToast('Para vender a crédito (fiado), digite o nome de um cliente cadastrado com limite ativo.', 'error');
            return;
          }
          const availableCredit = (registeredCustomer.creditLimit || 0) - (registeredCustomer.currentDebt || 0);
          if (total > availableCredit) {
            showToast(`Limite fiado excedido! Disponível: ${availableCredit.toFixed(2)} MT, Pedido: ${total.toFixed(2)} MT`, 'error');
            return;
          }
        }

        const activeShift = db.getActiveCashSession(storeId);
        const effectiveCustName = customerName.trim() || 'Consumidor Final (Balcão)';

        try {
          const result = db.processAtomicSale(
            storeId,
            activeShift?.id,
            effectiveCustName,
            registeredCustomer ? (registeredCustomer.document || registeredCustomer.taxId) : '',
            selectedPaymentMethod,
            discountAmount,
            cart,
            {
              customerId: registeredCustomer?.id || null,
              customerPhone: registeredCustomer?.phone || '',
              cashierName: currentUser?.fullName || 'Operador Balcão',
              paymentDetails: {
                cashTendered: parseFloat(cashTendered) || total,
                changeGiven: tendered >= total ? tendered - total : 0
              },
              needsDelivery
            }
          );

          if (result && result.sale) {
            showToast(`Venda ${result.sale.saleNumber} realizada com sucesso!`, 'success');

            if (needsDelivery) {
              db.saveDelivery({
                id: 'deliv-' + Date.now(),
                saleId: result.sale.id,
                saleNumber: result.sale.saleNumber,
                customerName: result.sale.customerName,
                address: registeredCustomer?.address || 'Canteiro de Obra',
                contactPhone: registeredCustomer?.phone || '',
                status: 'PENDENTE',
                scheduledDate: new Date().toISOString().split('T')[0],
                items: result.sale.items
              });
            }

            // Open Thermal Receipt modal
            openReceiptModal(result.sale, () => {
              // Reset cart
              cart = [];
              cashTendered = '';
              discountAmount = 0;
              needsDelivery = false;
              customerName = 'Consumidor Final (Balcão)';
              selectedCustomerId = '';
              products = db.getProducts(storeId);
              customers = db.getCustomers(storeId);
              render();
            });
          }
        } catch (err) {
          showToast(err.message || 'Erro ao processar venda.', 'error');
        }
      };
    }
  };

  render();
}
