/**
 * GEF - GESTÃO FINANCEIRA | ENTREGAS & LOGÍSTICA DE CANTEIRO
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../../js/core/database.js';
import { auth } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';

export function initEntregasModule(container) {
  const storeId = db.getCurrentStoreId();

  const render = () => {
    const deliveries = db.getDeliveries(storeId);
    const pendingCount = deliveries.filter(d => d.status === 'PENDENTE').length;
    const inTransitCount = deliveries.filter(d => d.status === 'EM_TRANSITO').length;
    const deliveredCount = deliveries.filter(d => d.status === 'ENTREGUE').length;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Header Card -->
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 20px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 800; color: #f8fafc; margin: 0;">Entregas & Despacho para Canteiros</h2>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
              Gestão de romaneios de carga, rotas de caminhões e confirmação de recebimento na obra.
            </div>
          </div>
        </div>

        <!-- Metrics -->
        <div class="metrics-grid">
          <div class="card metric-card">
            <span class="metric-title">Aguardando Separação / Motorista</span>
            <div class="metric-value" style="color: #fbbf24;">
              ${pendingCount} <span style="font-size: 14px;">cargas</span>
            </div>
            <div class="metric-sub">Prontas para carregamento no depósito</div>
          </div>

          <div class="card metric-card">
            <span class="metric-title">Caminhões em Trânsito</span>
            <div class="metric-value" style="color: #60a5fa;">
              ${inTransitCount} <span style="font-size: 14px;">em rota</span>
            </div>
            <div class="metric-sub">Materiais a caminho dos canteiros</div>
          </div>

          <div class="card metric-card">
            <span class="metric-title">Despachos Concluídos</span>
            <div class="metric-value" style="color: #34d399;">
              ${deliveredCount} <span style="font-size: 14px;">entregues</span>
            </div>
            <div class="metric-sub">Recebimento confirmado pelo mestre de obras</div>
          </div>
        </div>

        <!-- Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Despacho / Venda</th>
                  <th>Cliente & Canteiro</th>
                  <th>Contato</th>
                  <th>Data Prevista</th>
                  <th>Veículo / Motorista</th>
                  <th>Status</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${deliveries.length === 0 ? `
                  <tr><td colspan="7" style="text-align: center; color: #64748b; padding: 32px;">Nenhuma entrega pendente. Ao realizar uma venda no PDV com opção de entrega, ela constará aqui.</td></tr>
                ` : deliveries.map(d => `
                  <tr>
                    <td>
                      <div style="font-weight: 800; color: #f8fafc;">${d.id}</div>
                      <div style="font-size: 10px; color: #94a3b8;">Venda: ${d.saleNumber}</div>
                    </td>
                    <td>
                      <div style="font-weight: 700; color: #cbd5e1;">${d.customerName}</div>
                      <div style="font-size: 10px; color: #94a3b8;">${d.address || 'Canteiro de Obra'}</div>
                    </td>
                    <td style="font-size: 11px; color: #cbd5e1;">
                      ${d.contactPhone || '-'}
                    </td>
                    <td style="font-size: 11px; color: #cbd5e1;">
                      ${new Date(d.scheduledDate).toLocaleDateString('pt-MZ')}
                    </td>
                    <td style="font-size: 11px; color: #cbd5e1;">
                      ${d.driverName ? `
                        <strong>${d.driverName}</strong>
                        <div style="font-size: 9px; color: #94a3b8;">${d.vehiclePlate || 'Caminhão da Loja'}</div>
                      ` : `
                        <span style="color: #94a3b8; font-style: italic;">Não atribuído</span>
                      `}
                    </td>
                    <td>
                      <span class="badge ${d.status === 'ENTREGUE' ? 'badge-emerald' : d.status === 'EM_TRANSITO' ? 'badge-blue' : 'badge-amber'}">
                        ${d.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        ${d.status === 'PENDENTE' ? `
                          <button class="btn btn-primary btn-dispatch-deliv" data-deliv-id="${d.id}" style="padding: 4px 8px; font-size: 10px;">
                            Despachar
                          </button>
                        ` : d.status === 'EM_TRANSITO' ? `
                          <button class="btn btn-primary btn-finish-deliv" data-deliv-id="${d.id}" style="padding: 4px 8px; font-size: 10px; background: #10b981; border-color: #10b981;">
                            Confirmar Entrega
                          </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-print-deliv" data-deliv-id="${d.id}" style="padding: 4px 8px; font-size: 10px;">
                          Guia
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

    // Actions
    container.querySelectorAll('.btn-dispatch-deliv').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-deliv-id');
        const deliv = deliveries.find(d => d.id === id);
        if (deliv) openDispatchModal(deliv, () => render());
      };
    });

    container.querySelectorAll('.btn-finish-deliv').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-deliv-id');
        const deliv = deliveries.find(d => d.id === id);
        if (deliv) {
          deliv.status = 'ENTREGUE';
          deliv.deliveredAt = new Date().toISOString();
          db.saveDelivery(deliv);
          showToast(`Entrega ${deliv.id} confirmada com sucesso!`, 'success');
          render();
        }
      };
    });

    container.querySelectorAll('.btn-print-deliv').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-deliv-id');
        const deliv = deliveries.find(d => d.id === id);
        if (deliv) printDeliveryWaybill(deliv);
      };
    });
  };

  const openDispatchModal = (delivery, onSuccess) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 420px;">
        <div class="modal-header">
          <h3 class="modal-title">Despachar Carga / Iniciar Rota</h3>
          <button class="modal-close-btn" id="btn-close-dpmodal">✕</button>
        </div>
        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Nome do Motorista:</label>
            <input type="text" id="inp-dp-driver" placeholder="Ex: Carlos Mondlane" required style="width: 100%;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Matrícula / Identificação do Caminhão:</label>
            <input type="text" id="inp-dp-plate" placeholder="Ex: ABC-123-MC (Canter 4 Toneladas)" style="width: 100%;">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-dpmodal">Cancelar</button>
          <button class="btn btn-primary" id="btn-confirm-dispatch">Despachar Caminhão</button>
        </div>
      </div>
    `;

    modal.querySelector('#btn-close-dpmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-cancel-dpmodal').onclick = () => modal.remove();
    modal.querySelector('#btn-confirm-dispatch').onclick = () => {
      const driver = modal.querySelector('#inp-dp-driver').value.trim();
      const plate = modal.querySelector('#inp-dp-plate').value.trim();

      if (!driver) {
        showToast('Informe o nome do motorista.', 'error');
        return;
      }

      delivery.driverName = driver;
      delivery.vehiclePlate = plate;
      delivery.status = 'EM_TRANSITO';
      delivery.dispatchedAt = new Date().toISOString();

      db.saveDelivery(delivery);
      showToast(`Carga despachada com motorista ${driver}!`, 'success');
      modal.remove();
      if (onSuccess) onSuccess();
    };

    document.body.appendChild(modal);
  };

  const printDeliveryWaybill = (delivery) => {
    const config = db.getConfig();
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Guia de Remessa ${delivery.id}</title>
        <style>
          body { font-family: sans-serif; padding: 30px; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 900; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f1f5f9; }
          .sign-box { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
          .sign-line { border-top: 1px solid #000; padding-top: 8px; text-align: center; flex: 1; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${config.companyName || 'GEF Ferragens'}</div>
          <div>NUIT: ${config.nuit || '400192834'} | Tel: ${config.phone || '+258 84 399 2200'}</div>
          <div>${config.address || 'Maputo Central, Moçambique'}</div>
        </div>

        <h2>GUIA DE REMESSA / ROMANEIO DE TRANSPORTE Nº ${delivery.id}</h2>
        <p><strong>Referência de Venda:</strong> ${delivery.saleNumber}</p>
        <p><strong>Destinatário / Obra:</strong> ${delivery.customerName}</p>
        <p><strong>Local de Descarrego:</strong> ${delivery.address || 'Canteiro da Obra'}</p>
        <p><strong>Motorista Responsável:</strong> ${delivery.driverName || 'A definir'} | <strong>Veículo:</strong> ${delivery.vehiclePlate || '-'}</p>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Material / Descrição</th>
              <th>Embalagem / Unidade</th>
              <th>Quantidade Convocada</th>
              <th>Conferido (Check)</th>
            </tr>
          </thead>
          <tbody>
            ${(delivery.items || []).map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${it.productName || it.name}</td>
                <td>${it.packagingName || it.selectedUnit || 'un'}</td>
                <td><strong>${it.quantity}</strong></td>
                <td>[  ] OK</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="sign-box">
          <div class="sign-line">
            Despachante / Conferente de Carga
          </div>
          <div class="sign-line">
            Recebido no Canteiro (Mestre / Encarregado)
          </div>
        </div>

        <script>window.print();<\/script>
      </body>
      </html>
    `);
  };

  render();
}
