/**
 * GEF - GESTÃO FINANCEIRA | THERMAL RECEIPT MODAL
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../core/database.js';
import { showToast } from './toast.js';

export function openReceiptModal(sale, onClose) {
  if (!sale) return;

  const config = db.getConfig();
  const storeName = config.companyName || config.brandName || 'GEF Ferragens';
  const storeNuit = config.nuit || '400192834';
  const storePhone = config.phone || '+258 84 399 2200';
  const storeAddress = config.address || 'Maputo Central, Moçambique';
  const footerMessage = config.receiptFooterMessage || config.receiptFooter || 'Favor conferir todos os materiais no ato de entrega.';

  const items = sale.items || [];
  const getItemQty = (it) => Number(it.quantity ?? it.quantitySold ?? it.quantityBase ?? 1) || 1;
  const getItemUnit = (it) => String(it.selectedUnit || it.packagingName || it.packageName || it.baseUnit || 'un');
  const getItemPrice = (it) => Number(it.unitPrice ?? 0) || 0;
  const getItemTotal = (it) => Number(it.total ?? it.totalPrice ?? (getItemQty(it) * getItemPrice(it))) || 0;

  const subtotal = Number(sale.subtotal ?? sale.totalGross ?? items.reduce((sum, i) => sum + getItemTotal(i), 0)) || 0;
  const discount = Number(sale.discount ?? sale.discountAmount ?? 0) || 0;
  const total = Number(sale.total ?? sale.totalNet ?? Math.max(0, subtotal - discount)) || 0;
  const cashier = sale.cashierName || sale.createdBy || 'Operador Balcão';
  const paymentMethod = sale.paymentMethod || 'DINHEIRO';
  const cashTendered = sale.paymentDetails?.cashTendered !== undefined ? Number(sale.paymentDetails.cashTendered) : (paymentMethod === 'DINHEIRO' ? total : undefined);
  const changeGiven = sale.paymentDetails?.changeGiven !== undefined ? Number(sale.paymentDetails.changeGiven) : 0;
  const dateStr = sale.timestamp || sale.createdAt ? new Date(sale.timestamp || sale.createdAt).toLocaleString('pt-MZ') : new Date().toLocaleString('pt-MZ');

  let paperWidth = config.receiptPrinterWidth === '58mm' ? '58mm' : '80mm';

  // Plain-text receipt generator
  const generatePlainText = () => {
    let text = `*${storeName.toUpperCase()}*\n`;
    if (storeNuit) text += `NUIT: ${storeNuit} | Tel: ${storePhone}\n`;
    if (storeAddress) text += `${storeAddress}\n`;
    text += `================================\n`;
    text += `COMPROVANTE DE VENDA: ${sale.saleNumber || sale.id || '0000'}\n`;
    text += `Data: ${dateStr}\n`;
    text += `Atendido por: ${cashier}\n`;
    if (sale.customerName) text += `Cliente: ${sale.customerName}\n`;
    text += `--------------------------------\n`;
    text += `MATERIAIS E PRODUTOS:\n`;
    items.forEach((it, idx) => {
      const q = getItemQty(it);
      const u = getItemUnit(it);
      const p = getItemPrice(it);
      const t = getItemTotal(it);
      const name = it.productName || it.name || 'Material';
      text += `${idx + 1}. ${name}\n`;
      text += `   ${q} ${u} x ${p.toFixed(2)} MT = ${t.toFixed(2)} MT\n`;
    });
    text += `--------------------------------\n`;
    text += `SUBTOTAL: ${subtotal.toFixed(2)} MT\n`;
    if (discount > 0) text += `DESCONTO: -${discount.toFixed(2)} MT\n`;
    text += `*TOTAL A PAGAR: ${total.toFixed(2)} MT*\n`;
    text += `FORMA DE PAGAMENTO: ${paymentMethod}\n`;
    if (paymentMethod === 'DINHEIRO' && cashTendered !== undefined) {
      text += `Valor Entregue: ${cashTendered.toFixed(2)} MT\n`;
      text += `Troco Devolvido: ${changeGiven.toFixed(2)} MT\n`;
    }
    text += `================================\n`;
    text += `${footerMessage}\n`;
    return text;
  };

  const modalEl = document.createElement('div');
  modalEl.className = 'modal-backdrop';
  modalEl.id = 'active-receipt-modal';

  const renderModalContent = () => {
    modalEl.innerHTML = `
      <div class="modal-dialog" style="max-width: 440px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
            <h3 class="modal-title">Recibo Térmico de Venda</h3>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; background: #334155; border-radius: 6px; padding: 2px;">
              <button class="btn" style="padding: 2px 8px; font-size: 10px; background: ${paperWidth === '80mm' ? '#ea580c' : 'transparent'}; color: #fff;" id="btn-paper-80">80mm</button>
              <button class="btn" style="padding: 2px 8px; font-size: 10px; background: ${paperWidth === '58mm' ? '#ea580c' : 'transparent'}; color: #fff;" id="btn-paper-58">58mm</button>
            </div>
            <button class="modal-close-btn" id="btn-close-receipt">✕</button>
          </div>
        </div>

        <div class="modal-body" style="background: #020617; display: flex; justify-content: center; padding: 16px;">
          <!-- Thermal Paper View -->
          <div class="thermal-receipt ${paperWidth === '58mm' ? 'w-58mm' : ''}" id="printable-receipt-area">
            <!-- Header: ONLY Store Data -->
            <div style="text-align: center; border-bottom: 1px dashed #64748b; padding-bottom: 10px;">
              <div style="font-weight: 900; font-size: 13px; text-transform: uppercase;">${storeName}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px;">NUIT: ${storeNuit} | Tel: ${storePhone}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${storeAddress}</div>
            </div>

            <!-- Sale Details -->
            <div style="padding: 8px 0; border-bottom: 1px dashed #64748b; font-size: 10px; display: flex; flex-direction: column; gap: 2px;">
              <div style="display: flex; justify-content: space-between;">
                <strong>RECIBO / VENDA:</strong>
                <strong>${sale.saleNumber || sale.id}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>DATA & HORA:</span>
                <span>${dateStr}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>ATENDIMENTO:</span>
                <span>${cashier}</span>
              </div>
              ${sale.customerName ? `
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 2px;">
                  <span>CLIENTE:</span>
                  <span>${sale.customerName}</span>
                </div>
              ` : ''}
            </div>

            <!-- Items -->
            <div style="padding: 8px 0; border-bottom: 1px dashed #64748b;">
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10px; margin-bottom: 4px;">
                <span>MATERIAL / QTD</span>
                <span>TOTAL</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${items.map((it, idx) => {
                  const q = getItemQty(it);
                  const u = getItemUnit(it);
                  const p = getItemPrice(it);
                  const t = getItemTotal(it);
                  const name = it.productName || it.name || 'Material';
                  return `
                    <div style="font-size: 10px;">
                      <div style="font-weight: 700; text-transform: uppercase;">${name}</div>
                      <div style="display: flex; justify-content: space-between; color: #475569;">
                        <span>${q} ${u} x ${p.toFixed(2)} MT</span>
                        <strong style="color: #0f172a;">${t.toFixed(2)} MT</strong>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Summary -->
            <div style="padding: 8px 0; border-bottom: 1px dashed #64748b; font-size: 11px; display: flex; flex-direction: column; gap: 3px;">
              <div style="display: flex; justify-content: space-between;">
                <span>SUBTOTAL:</span>
                <span>${subtotal.toFixed(2)} MT</span>
              </div>
              ${discount > 0 ? `
                <div style="display: flex; justify-content: space-between; color: #dc2626; font-weight: bold;">
                  <span>DESCONTO:</span>
                  <span>-${discount.toFixed(2)} MT</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; border-top: 1px solid #0f172a; padding-top: 4px; margin-top: 2px;">
                <span>TOTAL A PAGAR:</span>
                <span>${total.toFixed(2)} MT</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-top: 2px;">
                <span>PAGAMENTO:</span>
                <strong style="text-transform: uppercase;">${paymentMethod}</strong>
              </div>
              ${paymentMethod === 'DINHEIRO' && cashTendered !== undefined ? `
                <div style="font-size: 10px; color: #475569;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>Entregue:</span>
                    <span>${cashTendered.toFixed(2)} MT</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-weight: bold; color: #0f172a;">
                    <span>Troco:</span>
                    <span>${changeGiven.toFixed(2)} MT</span>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Footer Notice -->
            <div style="padding-top: 10px; text-align: center; font-size: 9px; color: #475569; line-height: 1.4;">
              <p>${footerMessage}</p>
              <div style="margin-top: 8px; font-family: var(--font-mono); letter-spacing: 2px; font-size: 8px; color: #64748b;">
                * ${sale.saleNumber || sale.id} *
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
          <button class="btn btn-primary" id="btn-do-print">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
            <span>Imprimir</span>
          </button>
          <button class="btn btn-success" id="btn-do-whatsapp">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
            <span>WhatsApp</span>
          </button>
          <button class="btn btn-secondary" style="border-color: #3b82f6; color: #93c5fd;" id="btn-do-sms">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>SMS</span>
          </button>
          <button class="btn btn-secondary" id="btn-do-copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <span>Copiar</span>
          </button>
        </div>
      </div>
    `;

    // Bind events
    modalEl.querySelector('#btn-close-receipt').onclick = () => {
      modalEl.remove();
      if (onClose) onClose();
    };

    modalEl.querySelector('#btn-paper-80').onclick = () => {
      paperWidth = '80mm';
      renderModalContent();
    };

    modalEl.querySelector('#btn-paper-58').onclick = () => {
      paperWidth = '58mm';
      renderModalContent();
    };

    modalEl.querySelector('#btn-do-print').onclick = () => {
      window.print();
    };

    modalEl.querySelector('#btn-do-whatsapp').onclick = () => {
      const text = encodeURIComponent(generatePlainText());
      const cleanPhone = sale.customerPhone?.replace(/\D/g, '') || '';
      const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
      window.open(url, '_blank');
    };

    modalEl.querySelector('#btn-do-sms').onclick = () => {
      const text = encodeURIComponent(generatePlainText());
      const cleanPhone = sale.customerPhone?.replace(/\D/g, '') || '';
      window.location.href = cleanPhone ? `sms:${cleanPhone}?body=${text}` : `sms:?body=${text}`;
    };

    modalEl.querySelector('#btn-do-copy').onclick = () => {
      navigator.clipboard.writeText(generatePlainText()).then(() => {
        showToast('Comprovante copiado com sucesso!', 'success');
      });
    };
  };

  renderModalContent();
  document.body.appendChild(modalEl);
}
