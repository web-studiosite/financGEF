/**
 * GEF - GESTÃO FINANCEIRA | ORÇAMENTOS DE OBRA
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';
import { i18n } from '../../js/core/i18n.js';

export function initOrcamentosModule(container, options = {}) {
  const { onNavigate } = options;
  const storeId = db.getCurrentStoreId();
  let quotes = db.getQuotes(storeId);
  const products = db.getProducts(storeId);
  const customers = db.getCustomers(storeId);

  const render = () => {
    quotes = db.getQuotes(storeId);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 20px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">Orçamentos & Cotações de Obra</h2>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Propostas comerciais para empreiteiros e mestres de obra com validade e conversão em 1-clique para venda.
            </div>
          </div>
          <button class="btn btn-primary" id="btn-create-quote">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12"/></svg>
            <span>Novo Orçamento</span>
          </button>
        </div>

        <!-- Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nº Orçamento</th>
                  <th>Cliente & Canteiro</th>
                  <th>Validade</th>
                  <th>Itens</th>
                  <th>Total Orçado</th>
                  <th>Status</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${quotes.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; color: #64748b; padding: 32px;">
                      Nenhum orçamento cadastrado ainda. Clique em "Novo Orçamento".
                    </td>
                  </tr>
                ` : quotes.map(quote => `
                  <tr>
                    <td>
                      <div style="font-weight: 800; color: #f8fafc;">${quote.quoteNumber || quote.id}</div>
                      <div style="font-size: 10px; color: #94a3b8;">Criado em ${new Date(quote.createdAt).toLocaleDateString('pt-MZ')}</div>
                    </td>
                    <td>
                      <div style="font-weight: 700; color: #cbd5e1;">${quote.customerName}</div>
                      <div style="font-size: 10px; color: #94a3b8;">${quote.projectLocation || 'Maputo'} • Tel: ${quote.phone || '-'}</div>
                    </td>
                    <td>
                      <div style="font-size: 11px; color: #f59e0b; font-weight: 600;">
                        Até ${new Date(quote.validUntil).toLocaleDateString('pt-MZ')}
                      </div>
                    </td>
                    <td style="font-size: 11px; color: #cbd5e1;">
                      ${quote.items?.length || 0} materiais
                    </td>
                    <td>
                      <strong style="color: #34d399; font-family: var(--font-mono); font-size: 13px;">
                        ${i18n.formatMoney(quote.total || 0)}
                      </strong>
                    </td>
                    <td>
                      <span class="badge ${quote.status === 'CONVERTIDO' ? 'badge-blue' : quote.status === 'APROVADO' ? 'badge-emerald' : 'badge-amber'}">
                        ${quote.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        ${quote.status !== 'CONVERTIDO' ? `
                          <button class="btn btn-primary btn-convert-quote" data-quote-id="${quote.id}" style="padding: 4px 8px; font-size: 10px;" title="Faturar no PDV">
                            Faturar no PDV
                          </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-print-quote" data-quote-id="${quote.id}" style="padding: 4px 8px; font-size: 10px;">
                          Imprimir
                        </button>
                        <button class="btn btn-secondary btn-delete-quote" data-quote-id="${quote.id}" style="padding: 4px 6px; font-size: 10px; color: #f87171;">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Create quote modal
    container.querySelector('#btn-create-quote').onclick = () => {
      openCreateQuoteModal(() => render());
    };

    // Convert quote to sale
    container.querySelectorAll('.btn-convert-quote').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-quote-id');
        const quote = quotes.find(q => q.id === id);
        if (!quote) return;

        try {
          const shift = db.getActiveCashSession(storeId);
          const result = db.processAtomicSale(
            storeId,
            shift?.id,
            quote.customerName,
            '',
            'DINHEIRO',
            quote.discount || 0,
            quote.items.map(it => ({
              productId: it.productId,
              packagingName: it.unit,
              selectedUnit: it.unit,
              multiplierToBase: 1,
              multiplier: 1,
              unitPrice: it.unitPrice,
              quantity: it.quantity
            })),
            {
              customerPhone: quote.phone,
              cashierName: auth.getCurrentUser()?.fullName || 'Operador',
              notes: `Convertido do Orçamento ${quote.quoteNumber}`
            }
          );

          quote.status = 'CONVERTIDO';
          db.saveQuote(quote);
          showToast(`Orçamento ${quote.quoteNumber} faturado com sucesso! Venda ${result.sale.saleNumber} gerada.`, 'success');
          render();
        } catch (err) {
          showToast(err.message || 'Erro ao faturar orçamento.', 'error');
        }
      };
    });

    // Delete quote
    container.querySelectorAll('.btn-delete-quote').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-quote-id');
        if (confirm('Deseja excluir este orçamento?')) {
          db.deleteQuote(id);
          showToast('Orçamento removido.', 'success');
          render();
        }
      };
    });

    // Print quote
    container.querySelectorAll('.btn-print-quote').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-quote-id');
        const quote = quotes.find(q => q.id === id);
        if (quote) printQuoteProposal(quote);
      };
    });
  };

  const openCreateQuoteModal = (onSuccess) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    let quoteItems = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 15);
    const validUntilStr = tomorrow.toISOString().split('T')[0];

    const renderModal = () => {
      const totalQuote = quoteItems.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);

      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title">Novo Orçamento de Obra</h3>
            <button class="modal-close-btn" id="btn-close-qmodal">✕</button>
          </div>

          <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Nome do Cliente / Empreiteiro:</label>
                <input type="text" id="input-q-customer" placeholder="Ex: Engenharia & Construções Lda" required style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Telefone / WhatsApp:</label>
                <input type="text" id="input-q-phone" placeholder="+258 84 000 0000" style="width: 100%;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Local do Canteiro de Obra:</label>
                <input type="text" id="input-q-location" placeholder="Ex: Matola Rio, Bairro Kongolote, Parcela 42" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Válido Até:</label>
                <input type="date" id="input-q-validity" value="${validUntilStr}" style="width: 100%;">
              </div>
            </div>

            <!-- Add Item Row -->
            <div style="background: #1e293b; padding: 14px; border-radius: 8px; border: 1px solid #334155;">
              <span style="font-size: 11px; font-weight: 800; color: #ea580c; text-transform: uppercase; display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                Buscar e Adicionar Material ao Orçamento:
              </span>

              <!-- Search by Name or Code with Search Button -->
              <div style="margin-bottom: 12px; position: relative;">
                <label style="font-size: 10px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 4px;">
                  Pesquisar Produto por Nome:
                </label>
                <div style="display: flex; gap: 8px;">
                  <div style="position: relative; flex: 1;">
                    <input 
                      type="text" 
                      id="input-q-search-prod" 
                      placeholder="Digitar nome ou código (ex: Cimento, Varão, Tubo, Prego...)" 
                      style="width: 100%; font-size: 12px; padding: 8px 10px 8px 32px;"
                    >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="position: absolute; left: 10px; top: 10px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  </div>
                  <button type="button" class="btn btn-secondary" id="btn-q-search-prod" style="padding: 8px 14px; font-size: 11px; white-space: nowrap; display: flex; align-items: center; gap: 6px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    Pesquisar
                  </button>
                </div>

                <!-- Autocomplete Dropdown List -->
                <div id="q-search-results" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 50; background: #0f172a; border: 1px solid #ea580c; border-radius: 6px; max-height: 220px; overflow-y: auto; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7);"></div>
              </div>

              <!-- Product Select & Details Grid -->
              <div style="display: grid; grid-template-columns: 3fr 1fr 1fr auto; gap: 8px; align-items: end;">
                <div>
                  <label style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px;">Selecionar Material da Lista:</label>
                  <select id="select-q-prod" style="width: 100%; font-size: 11px;">
                    ${products.map(p => `<option value="${p.id}" data-price="${p.salePriceBase}" data-unit="${p.baseUnit}">[${p.code}] ${p.name} - ${i18n.formatMoney(p.salePriceBase)}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px;">Quantidade:</label>
                  <input type="number" min="0.01" step="any" id="input-q-qty" value="1" style="width: 100%; font-size: 11px;">
                </div>
                <div>
                  <label style="font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px;">Preço Unit:</label>
                  <input type="number" step="0.01" id="input-q-unitprice" style="width: 100%; font-size: 11px;">
                </div>
                <button class="btn btn-secondary" id="btn-add-qitem" style="padding: 7px 12px; font-size: 11px; border-color: #ea580c; color: #ea580c;">
                  + Inserir
                </button>
              </div>
            </div>

            <!-- Items list -->
            <div style="max-height: 180px; overflow-y: auto; border: 1px solid #334155; border-radius: 8px; background: #0f172a;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="border-bottom: 1px solid #334155; color: #94a3b8; text-align: left;">
                    <th style="padding: 6px 10px;">Material</th>
                    <th style="padding: 6px 10px;">Qtd</th>
                    <th style="padding: 6px 10px;">Preço</th>
                    <th style="padding: 6px 10px;">Subtotal</th>
                    <th style="padding: 6px 10px; text-align: right;">Remover</th>
                  </tr>
                </thead>
                <tbody>
                  ${quoteItems.length === 0 ? `
                    <tr><td colspan="5" style="text-align: center; color: #64748b; padding: 16px;">Nenhum item adicionado ainda.</td></tr>
                  ` : quoteItems.map((it, idx) => `
                    <tr style="border-bottom: 1px solid #1e293b;">
                      <td style="padding: 6px 10px; font-weight: 600; color: #fff;">${it.name}</td>
                      <td style="padding: 6px 10px;">${it.quantity} ${it.unit}</td>
                      <td style="padding: 6px 10px;">${i18n.formatMoney(it.unitPrice)}</td>
                      <td style="padding: 6px 10px; font-weight: bold; color: #34d399;">${i18n.formatMoney(it.quantity * it.unitPrice)}</td>
                      <td style="padding: 6px 10px; text-align: right;">
                        <button class="btn-del-qitem" data-idx="${idx}" style="color: #f87171; background: transparent; border: none; cursor: pointer;">✕</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Total -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #0f172a; border-radius: 8px; border: 1px solid #334155;">
              <span style="font-weight: 700; color: #94a3b8; text-transform: uppercase;">Total da Proposta:</span>
              <span style="font-size: 20px; font-weight: 900; font-family: var(--font-mono); color: #34d399;">
                ${i18n.formatMoney(totalQuote)}
              </span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cancel-qmodal">Cancelar</button>
            <button class="btn btn-primary" id="btn-save-quote" ${quoteItems.length === 0 ? 'disabled' : ''}>
              Salvar Orçamento
            </button>
          </div>
        </div>
      `;

      modal.querySelector('#btn-close-qmodal').onclick = () => modal.remove();
      modal.querySelector('#btn-cancel-qmodal').onclick = () => modal.remove();

      // Product dropdown initial unit price
      const prodSelect = modal.querySelector('#select-q-prod');
      const unitPriceInp = modal.querySelector('#input-q-unitprice');
      const searchProdInp = modal.querySelector('#input-q-search-prod');
      const searchProdBtn = modal.querySelector('#btn-q-search-prod');
      const searchResultsDiv = modal.querySelector('#q-search-results');

      const selectProductById = (pId) => {
        const found = products.find(p => p.id === pId);
        if (!found) return;
        prodSelect.value = found.id;
        unitPriceInp.value = found.salePriceBase;
        searchProdInp.value = found.name;
        searchResultsDiv.style.display = 'none';
        modal.querySelector('#input-q-qty').focus();
      };

      if (prodSelect && unitPriceInp) {
        const selOpt = prodSelect.selectedOptions[0];
        if (selOpt) unitPriceInp.value = selOpt.getAttribute('data-price');
        prodSelect.onchange = () => {
          const opt = prodSelect.selectedOptions[0];
          if (opt) {
            unitPriceInp.value = opt.getAttribute('data-price');
            const found = products.find(p => p.id === prodSelect.value);
            if (found) searchProdInp.value = found.name;
          }
        };
      }

      // Live product search by name with interactive suggestion dropdown
      const executeProductSearch = () => {
        const query = (searchProdInp.value || '').trim().toLowerCase();
        if (!query) {
          searchResultsDiv.style.display = 'none';
          return;
        }

        const matches = products.filter(p => 
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.code && p.code.toLowerCase().includes(query)) ||
          (p.category && p.category.toLowerCase().includes(query))
        );

        if (matches.length === 0) {
          searchResultsDiv.innerHTML = `
            <div style="padding: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
              Nenhum produto encontrado para "<strong>${query}</strong>".
            </div>
          `;
          searchResultsDiv.style.display = 'block';
          return;
        }

        searchResultsDiv.innerHTML = matches.map(p => `
          <div class="q-search-item" data-id="${p.id}" style="padding: 8px 12px; border-bottom: 1px solid #1e293b; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.15s ease;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #f8fafc;">${p.name}</div>
              <div style="font-size: 9px; color: #94a3b8;">Código: ${p.code} • Unid: ${p.baseUnit} • Saldo: ${p.currentStockBase}</div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 11px; font-weight: 800; color: #34d399; font-family: var(--font-mono);">${i18n.formatMoney(p.salePriceBase)}</span>
            </div>
          </div>
        `).join('');

        searchResultsDiv.style.display = 'block';

        searchResultsDiv.querySelectorAll('.q-search-item').forEach(itemEl => {
          itemEl.onmouseenter = () => itemEl.style.background = '#1e293b';
          itemEl.onmouseleave = () => itemEl.style.background = 'transparent';
          itemEl.onclick = () => {
            const pId = itemEl.getAttribute('data-id');
            selectProductById(pId);
          };
        });
      };

      searchProdInp.addEventListener('input', executeProductSearch);
      searchProdBtn.addEventListener('click', executeProductSearch);

      // Close search results if clicked outside
      modal.addEventListener('click', (e) => {
        if (!searchProdInp.contains(e.target) && !searchResultsDiv.contains(e.target) && !searchProdBtn.contains(e.target)) {
          searchResultsDiv.style.display = 'none';
        }
      });

      // Add item button
      modal.querySelector('#btn-add-qitem').onclick = () => {
        const opt = prodSelect.selectedOptions[0];
        const qty = parseFloat(modal.querySelector('#input-q-qty').value) || 1;
        const price = parseFloat(unitPriceInp.value) || 0;
        const prodId = prodSelect.value;
        const p = products.find(prod => prod.id === prodId);

        quoteItems.push({
          productId: p.id,
          name: p.name,
          unit: p.baseUnit,
          quantity: qty,
          unitPrice: price
        });
        renderModal();
      };

      // Remove item
      modal.querySelectorAll('.btn-del-qitem').forEach(b => {
        b.onclick = () => {
          const idx = parseInt(b.getAttribute('data-idx'));
          quoteItems.splice(idx, 1);
          renderModal();
        };
      });

      // Save quote
      modal.querySelector('#btn-save-quote').onclick = () => {
        const customerName = modal.querySelector('#input-q-customer').value.trim();
        if (!customerName) {
          showToast('Informe o nome do cliente ou construtor.', 'error');
          return;
        }

        const newQuote = {
          id: 'quote-' + Date.now(),
          quoteNumber: 'ORC-' + (quotes.length + 101),
          storeId,
          customerName,
          phone: modal.querySelector('#input-q-phone').value.trim(),
          projectLocation: modal.querySelector('#input-q-location').value.trim(),
          validUntil: modal.querySelector('#input-q-validity').value,
          createdAt: new Date().toISOString(),
          status: 'PENDENTE',
          items: quoteItems,
          total: totalQuote
        };

        db.saveQuote(newQuote);
        showToast(`Orçamento ${newQuote.quoteNumber} salvo com sucesso!`, 'success');
        modal.remove();
        if (onSuccess) onSuccess();
      };
    };

    renderModal();
    document.body.appendChild(modal);
  };

  const printQuoteProposal = (quote) => {
    const config = db.getConfig();
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orçamento ${quote.quoteNumber}</title>
        <style>
          body { font-family: sans-serif; padding: 30px; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 900; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f1f5f9; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${config.companyName || 'GEF Ferragens'}</div>
          <div>NUIT: ${config.nuit || '400192834'} | Tel: ${config.phone || '+258 84 399 2200'}</div>
          <div>${config.address || 'Maputo Central, Moçambique'}</div>
        </div>
        <h2>Proposta Comercial de Orçamento nº ${quote.quoteNumber}</h2>
        <p><strong>Cliente:</strong> ${quote.customerName} | <strong>Telefone:</strong> ${quote.phone || '-'}</p>
        <p><strong>Canteiro de Obra:</strong> ${quote.projectLocation || 'A combinar'}</p>
        <p><strong>Validade da Proposta:</strong> Até ${new Date(quote.validUntil).toLocaleDateString('pt-MZ')}</p>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Material / Descrição</th>
              <th>Quantidade</th>
              <th>Preço Unitário</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${(quote.items || []).map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${it.name}</td>
                <td>${it.quantity} ${it.unit}</td>
                <td>${i18n.formatMoney(it.unitPrice)}</td>
                <td>${i18n.formatMoney(it.quantity * it.unitPrice)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          TOTAL GERAL DA PROPOSTA: ${i18n.formatMoney(quote.total)}
        </div>

        <p style="margin-top: 40px; font-size: 12px; color: #64748b;">
          * Preços válidos exclusivamente para o período indicado, sujeitos à confirmação de estoque no momento da compra.
        </p>
        <script>window.print();<\/script>
      </body>
      </html>
    `);
  };

  render();
}
