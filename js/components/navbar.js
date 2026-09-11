/**
 * GEF - GESTÃO FINANCEIRA | NAVBAR COMPONENT
 * JavaScript Puro (Vanilla JS)
 */

import { db } from '../core/database.js';
import { auth } from '../core/auth.js';
import { canSwitchStores, getRoleBadgeInfo, normalizeRole } from '../core/permissions.js';
import { i18n } from '../core/i18n.js';
import { showToast } from './toast.js';

export function renderNavbar(container, options = {}) {
  const {
    currentLocation = 'LOJA',
    onLocationChange,
    onOpenBlindClosing,
    onOpenStoresView,
    onNavigate
  } = options;

  const currentUser = auth.getCurrentUser();
  const currentStoreId = db.getCurrentStoreId();
  const stores = db.getStores();
  const currentStore = stores.find(s => s.id === currentStoreId);
  const currentStoreDisplay = currentStoreId === 'ALL'
    ? 'Todas as Lojas (Consolidado)'
    : currentStore
    ? currentStore.tradeName || currentStore.name
    : 'Loja Matriz';

  const userRole = currentUser ? normalizeRole(currentUser.role, currentUser.id) : 'CASHIER';
  const roleBadge = getRoleBadgeInfo(userRole, currentUser?.id);
  const activeShift = db.getActiveCashSession();
  const isShiftOpen = activeShift && !activeShift.isClosed;
  const shiftCash = activeShift ? (activeShift.expectedCash || 0) : 0;

  container.innerHTML = `
    <header class="app-header">
      <!-- Brand & Store Selector -->
      <div class="brand-container">
        <div class="brand-logo" id="nav-brand-btn" style="cursor: pointer;">
          <img src="assets/icons/icon.svg" alt="GEF Logo" style="height: 36px; width: 36px; border-radius: 8px;">
          <div class="brand-info">
            <div class="brand-title">
              <span class="gef">GEF</span>
              <span style="color: #f59e0b; font-weight: 800; font-size: 11px;">GESTÃO FINANCEIRA</span>
              <span class="tag">ERP / SAAS</span>
            </div>
            <span class="brand-sub">Materiais de Construção & Ferragens</span>
          </div>
        </div>

        <!-- Store selector / Role context indicator -->
        ${userRole === 'SUPERADMIN' ? `
          <div class="store-selector-btn" style="cursor: default; background: rgba(234, 88, 12, 0.12); border-color: rgba(234, 88, 12, 0.5); color: #fbbf24; padding: 6px 12px; gap: 8px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <span style="font-weight: 800; font-size: 11px; letter-spacing: 0.3px;">SUPERADMIN SAAS GLOBAL (Independente de Loja)</span>
          </div>
        ` : userRole === 'EMBAIXADOR' ? `
          <div class="store-selector-btn" style="cursor: default; background: rgba(59, 130, 246, 0.12); border-color: rgba(59, 130, 246, 0.4); color: #93c5fd; padding: 6px 12px; gap: 8px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span style="font-weight: 800; font-size: 11px;">PROGRAMA DE EMBAIXADORES GEF</span>
          </div>
        ` : canSwitchStores(currentUser) ? `
          <div class="store-selector">
            <button class="store-selector-btn" id="btn-toggle-store-dropdown">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg>
              <span>${currentStoreDisplay}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div class="store-dropdown-menu" id="store-dropdown-menu">
              <div style="padding: 6px 10px; font-size: 10px; font-weight: 700; color: #94a3b8; border-bottom: 1px solid #334155; text-transform: uppercase;">
                Alternar Filial / Unidade
              </div>
              <div style="padding: 4px 0; max-height: 220px; overflow-y: auto;">
                ${stores.map(st => `
                  <button class="store-dropdown-item ${currentStoreId === st.id ? 'active' : ''}" data-store-id="${st.id}">
                    <div>
                      <div style="font-weight: 600;">${st.name}</div>
                      <div style="font-size: 10px; color: #94a3b8;">${st.city}</div>
                    </div>
                    ${st.isHeadquarters ? '<span class="badge badge-amber" style="font-size: 8px;">MATRIZ</span>' : ''}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        ` : `
          <div class="store-selector-btn" style="cursor: default;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/></svg>
            <span>${currentStoreDisplay}</span>
          </div>
        `}
      </div>

      <!-- Right Header Actions -->
      <div class="header-actions">
        <!-- Quick Currency & Language Pill -->
        <button 
          id="btn-quick-currency-toggle" 
          class="status-pill desktop-only" 
          style="cursor: pointer; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.35); color: #93c5fd; padding: 4px 8px;" 
          title="Moeda: ${i18n.getCurrency()} | Idioma: ${i18n.getLanguage().toUpperCase()} (Clique para alternar Moeda)"
        >
          <span>🌐 ${i18n.getCurrency()} • ${i18n.getLanguage().toUpperCase()}</span>
        </button>

        <!-- Status Indicator -->
        <div class="status-pill" title="Servidor Backend Conectado e Operacional">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399;"></span>
          <span class="desktop-only">GEF Operacional</span>
        </div>

        <!-- Location selector (Loja, Armazém, Pátio) -->
        ${userRole !== 'CASHIER' && userRole !== 'EMBAIXADOR' ? `
          <div class="location-selector desktop-only">
            <button class="location-btn ${currentLocation === 'LOJA' ? 'active' : ''}" data-loc="LOJA" title="Balcão / Loja">
              Loja
            </button>
            <button class="location-btn ${currentLocation === 'ARMAZEM' ? 'active' : ''}" data-loc="ARMAZEM" title="Armazém Central">
              Armazém
            </button>
            <button class="location-btn ${currentLocation === 'PATIO' ? 'active' : ''}" data-loc="PATIO" title="Pátio de Agregados">
              Pátio
            </button>
          </div>
        ` : ''}

        <!-- Cash Register Shift Indicator -->
        ${userRole === 'CASHIER' || userRole === 'ADMIN' || userRole === 'GERENTE' ? `
          <button class="btn btn-secondary" id="btn-navbar-cash" style="padding: 5px 10px; border-color: ${isShiftOpen ? '#10b981' : '#f59e0b'};" title="Gerenciar Caixa / Fechamento Cego">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${isShiftOpen ? '#10b981' : '#f59e0b'}; display: inline-block;"></span>
            <span style="font-size: 11px;">${isShiftOpen ? `Caixa Aberto (${shiftCash.toLocaleString('pt-MZ')} MT)` : 'Caixa Fechado'}</span>
          </button>
        ` : ''}

        <!-- User Profile & Logout -->
        ${currentUser ? `
          <div class="user-profile-info">
            <div class="user-meta desktop-only">
              <span class="user-name">${currentUser.fullName}</span>
              <span class="user-role-badge">${roleBadge.label}</span>
            </div>
            <button id="btn-logout" class="btn btn-secondary" style="padding: 6px;" title="Encerrar Sessão (Logout)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </button>
          </div>
        ` : ''}
      </div>
    </header>
  `;

  // Bind events
  const brandBtn = container.querySelector('#nav-brand-btn');
  if (brandBtn) {
    brandBtn.addEventListener('click', () => {
      onNavigate?.('DASHBOARD');
    });
  }

  const dropdownBtn = container.querySelector('#btn-toggle-store-dropdown');
  const dropdownMenu = container.querySelector('#store-dropdown-menu');
  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      dropdownMenu.classList.remove('show');
    });

    dropdownMenu.querySelectorAll('[data-store-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const storeId = btn.getAttribute('data-store-id');
        db.setCurrentStoreId(storeId);
        auth.switchActiveStore(storeId);
        dropdownMenu.classList.remove('show');
        window.location.reload();
      });
    });

    const gotoStoresBtn = dropdownMenu.querySelector('#btn-goto-stores');
    if (gotoStoresBtn) {
      gotoStoresBtn.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
        if (onOpenStoresView) onOpenStoresView();
        else onNavigate?.('LOJAS');
      });
    }
  }

  // Location selector buttons
  container.querySelectorAll('[data-loc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const loc = btn.getAttribute('data-loc');
      if (onLocationChange) onLocationChange(loc);
    });
  });

  // Cash button
  const cashBtn = container.querySelector('#btn-navbar-cash');
  if (cashBtn) {
    cashBtn.addEventListener('click', () => {
      if (onOpenBlindClosing) onOpenBlindClosing();
      else onNavigate?.('CAIXA');
    });
  }

  // Quick Currency toggle
  const currBtn = container.querySelector('#btn-quick-currency-toggle');
  if (currBtn) {
    currBtn.addEventListener('click', () => {
      if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN') {
        showToast('Apenas o Administrador da Loja pode alterar a moeda de operação.', 'warning');
        return;
      }
      const currs = ['MT', 'Kz', 'R$', 'R', '$'];
      const current = i18n.getCurrency();
      const nextIdx = (currs.indexOf(current) + 1) % currs.length;
      const nextCurr = currs[nextIdx];
      i18n.setCurrency(nextCurr);
      if (currentStore) {
        currentStore.currency = nextCurr;
        db.saveStore(currentStore);
      }
      showToast(`Moeda operacional alterada para ${nextCurr}!`, 'success');
      setTimeout(() => {
        window.location.reload();
      }, 400);
    });
  }

  // Logout button
  const logoutBtn = container.querySelector('#btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.signOut();
      window.location.reload();
    });
  }
}
