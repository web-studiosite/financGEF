/**
 * GEF - GESTÃO FINANCEIRA | SCALE MODAL COMPONENT (BALANÇA SERIAL / USB)
 * JavaScript Puro (Vanilla JS)
 */

export function openScaleModal(product, onConfirmWeight, onClose) {
  if (!product) return;

  let weight = 1.000;
  let tare = 0;
  let isSerialConnected = false;
  let connectionMessage = '';
  const unitPrice = product.salePriceBase;

  const modalEl = document.createElement('div');
  modalEl.className = 'modal-backdrop';
  modalEl.id = 'active-scale-modal';

  const updateDisplay = () => {
    const netWeight = Math.max(0, weight - tare);
    const calculatedTotal = Number((netWeight * unitPrice).toFixed(2));

    const lcdVal = modalEl.querySelector('#scale-lcd-val');
    if (lcdVal) lcdVal.textContent = netWeight.toFixed(3);

    const tareDisplay = modalEl.querySelector('#scale-tare-val');
    if (tareDisplay) tareDisplay.textContent = tare.toFixed(3) + ' kg';

    const totalDisplay = modalEl.querySelector('#scale-total-calc');
    if (totalDisplay) totalDisplay.textContent = calculatedTotal.toFixed(2) + ' MT';

    const formulaDisplay = modalEl.querySelector('#scale-formula-display');
    if (formulaDisplay) formulaDisplay.textContent = `${netWeight.toFixed(3)} kg × ${unitPrice.toFixed(2)} MT/kg`;
  };

  const renderModal = () => {
    modalEl.innerHTML = `
      <div class="modal-dialog" style="max-width: 480px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
            <div>
              <h3 class="modal-title">Venda por Peso (Balança)</h3>
              <div style="font-size: 11px; color: #94a3b8;">${product.name}</div>
            </div>
          </div>
          <button class="modal-close-btn" id="btn-scale-close">✕</button>
        </div>

        <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
          <!-- Hardware Connection Status -->
          <div style="display: flex; align-items: center; justify-content: space-between; background: #1e293b; padding: 8px 12px; border-radius: 8px; border: 1px solid #334155; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isSerialConnected ? '#10b981' : '#64748b'};"></span>
              <span style="color: #cbd5e1;">${isSerialConnected ? 'Balança USB Conectada (9600 bps)' : 'Modo Manual de Pesagem'}</span>
            </div>
            <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 10px;" id="btn-connect-usb">
              ${isSerialConnected ? 'Reconectar' : 'Conectar Balança USB'}
            </button>
          </div>

          ${connectionMessage ? `
            <div style="padding: 8px 12px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; font-size: 11px; color: #fbbf24;">
              ${connectionMessage}
            </div>
          ` : ''}

          <!-- Electronic LCD Display -->
          <div class="scale-lcd-container">
            <div style="display: flex; justify-content: space-between; font-size: 10px; font-family: var(--font-mono); color: #64748b; text-transform: uppercase; margin-bottom: 4px;">
              <span>Leitura de Peso Bruto</span>
              <span>TARA: <strong id="scale-tare-val" style="color: #f97316;">${tare.toFixed(3)} kg</strong></span>
            </div>
            <div style="display: flex; align-items: baseline; justify-content: center; gap: 8px;">
              <span class="scale-lcd-val" id="scale-lcd-val">${(weight - tare).toFixed(3)}</span>
              <span style="font-size: 18px; font-weight: 800; color: #34d399; font-family: var(--font-mono);">KG</span>
            </div>
            <div style="margin-top: 8px; border-top: 1px solid #1e293b; padding-top: 6px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; font-family: var(--font-mono);">
              <span>Preço Unitário:</span>
              <span style="color: #fff; font-weight: bold;">${unitPrice.toFixed(2)} MT / kg</span>
            </div>
          </div>

          <!-- Manual input & Tare buttons -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 11px; font-weight: 600; color: #cbd5e1;">Digitar Peso Manualmente (kg):</label>
            <div style="display: flex; gap: 8px;">
              <input type="number" step="0.001" min="0.001" id="input-scale-manual" value="${weight.toFixed(3)}" style="flex: 1; font-size: 16px; font-weight: 800; font-family: var(--font-mono); text-align: center;">
              <button class="btn btn-secondary" id="btn-scale-tare" style="padding: 0 12px;" title="Descontar tara do vasilhame">Tarar</button>
              <button class="btn btn-secondary" id="btn-scale-zero-tare" style="padding: 0 12px; color: #f87171;" title="Zerar tara">Zerar</button>
            </div>
          </div>

          <!-- Shortcuts -->
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span style="font-size: 11px; color: #64748b;">Atalhos:</span>
            ${[0.25, 0.5, 1.0, 2.0, 2.5, 5.0, 10.0].map(val => `
              <button class="btn btn-secondary" data-preset="${val}" style="padding: 3px 8px; font-size: 10px; font-family: var(--font-mono);">
                ${val.toFixed(2)} kg
              </button>
            `).join('')}
          </div>

          <!-- Total Calculation Card -->
          <div style="padding: 12px 16px; background: #0f172a; border: 1px solid #334155; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; display: block;">Cálculo Automático</span>
              <span id="scale-formula-display" style="font-size: 11px; font-family: var(--font-mono); color: #cbd5e1;">
                ${(weight - tare).toFixed(3)} kg × ${unitPrice.toFixed(2)} MT/kg
              </span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; color: #ea580c; font-weight: 800; display: block;">TOTAL MT</span>
              <span id="scale-total-calc" style="font-size: 20px; font-weight: 900; font-family: var(--font-mono); color: #ffffff;">
                ${((weight - tare) * unitPrice).toFixed(2)} MT
              </span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-scale-cancel">Cancelar</button>
          <button class="btn btn-primary" id="btn-scale-confirm">
            <span>Confirmar e Adicionar ao Carrinho</span>
          </button>
        </div>
      </div>
    `;

    // Connect USB button (Web Serial API)
    modalEl.querySelector('#btn-connect-usb').onclick = async () => {
      if (!('serial' in navigator)) {
        connectionMessage = 'Web Serial API não suportada neste navegador (use Chrome ou Edge).';
        renderModal();
        return;
      }
      try {
        connectionMessage = 'Solicitando acesso à porta USB...';
        renderModal();
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        isSerialConnected = true;
        connectionMessage = 'Balança USB conectada com sucesso a 9600 bps!';
        renderModal();

        const textDecoder = new TextDecoderStream();
        port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            const match = value.match(/([0-9]+\.[0-9]+)/);
            if (match && match[1]) {
              weight = parseFloat(match[1]);
              const manualInp = modalEl.querySelector('#input-scale-manual');
              if (manualInp) manualInp.value = weight.toFixed(3);
              updateDisplay();
            }
          }
        }
      } catch (err) {
        isSerialConnected = false;
        connectionMessage = `Falha na balança USB: ${err.message || 'Porta não selecionada'}. Use a entrada manual.`;
        renderModal();
      }
    };

    // Close button
    modalEl.querySelector('#btn-scale-close').onclick = () => {
      modalEl.remove();
      if (onClose) onClose();
    };
    modalEl.querySelector('#btn-scale-cancel').onclick = () => {
      modalEl.remove();
      if (onClose) onClose();
    };

    // Manual input change
    const manualInput = modalEl.querySelector('#input-scale-manual');
    manualInput.oninput = (e) => {
      weight = parseFloat(e.target.value) || 0;
      updateDisplay();
    };

    // Tare buttons
    modalEl.querySelector('#btn-scale-tare').onclick = () => {
      tare = weight;
      updateDisplay();
    };

    modalEl.querySelector('#btn-scale-zero-tare').onclick = () => {
      tare = 0;
      updateDisplay();
    };

    // Preset buttons
    modalEl.querySelectorAll('[data-preset]').forEach(btn => {
      btn.onclick = () => {
        weight = parseFloat(btn.getAttribute('data-preset')) || 1;
        manualInput.value = weight.toFixed(3);
        updateDisplay();
      };
    });

    // Confirm button
    modalEl.querySelector('#btn-scale-confirm').onclick = () => {
      const net = Math.max(0, weight - tare);
      if (net <= 0) return;
      modalEl.remove();
      if (onConfirmWeight) onConfirmWeight(net);
    };
  };

  renderModal();
  document.body.appendChild(modalEl);
}
