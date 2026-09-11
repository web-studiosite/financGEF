/**
 * GEF - GESTÃO FINANCEIRA | MAIN APPLICATION CONTROLLER
 * JavaScript Puro (Vanilla JS)
 */

import { db } from './core/database.js';
import { auth } from './core/auth.js';
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { checkAndRenderLockBanner } from './components/lock-banner.js';
import { getDefaultTabForRole, isTabAllowedForUser } from './core/permissions.js';

// Module Initializers
import { initDashboardModule } from '../modules/dashboard/dashboard.js';
import { initPosModule } from '../modules/pos/pos.js';
import { initVendasModule } from '../modules/vendas/vendas.js';
import { initOrcamentosModule } from '../modules/orcamentos/orcamentos.js';
import { initProdutosModule } from '../modules/produtos/produtos.js';
import { initEstoqueModule } from '../modules/estoque/estoque.js';
import { initPerdasModule } from '../modules/perdas/perdas.js';
import { initCaixaModule } from '../modules/caixa/caixa.js';
import { initClientesModule } from '../modules/clientes/clientes.js';
import { initEntregasModule } from '../modules/entregas/entregas.js';
import { initRelatoriosModule } from '../modules/relatorios/relatorios.js';
import { initConfiguracoesModule } from '../modules/configuracoes/configuracoes.js';
import { initEmbaixadoresModule } from '../modules/embaixadores/embaixadores.js';
import { initMonitorModule } from '../modules/monitor/monitor.js';
import { initAuditoriaModule } from '../modules/auditoria/auditoria.js';
import { initLoginModule } from '../modules/login/login.js';

class GefApp {
  constructor() {
    this.currentTab = 'DASHBOARD';
    this.navbarRoot = null;
    this.sidebarRoot = null;
    this.lockBannerRoot = null;
    this.moduleContainer = null;
  }

  async start() {
    await db.init();

    this.navbarRoot = document.getElementById('navbar-root');
    this.sidebarRoot = document.getElementById('sidebar-root');
    this.lockBannerRoot = document.getElementById('lock-banner-root');
    this.moduleContainer = document.getElementById('module-container');

    // Parse URL params for initial tab
    const urlParams = new URLSearchParams(window.location.search);
    const requestedTab = urlParams.get('tab');
    const currentUser = auth.getCurrentUser();

    if (currentUser) {
      if (requestedTab && isTabAllowedForUser(requestedTab.toUpperCase(), currentUser)) {
        this.currentTab = requestedTab.toUpperCase();
      } else {
        this.currentTab = getDefaultTabForRole(currentUser.role, currentUser.id);
      }
    } else if (requestedTab) {
      this.currentTab = requestedTab.toUpperCase();
    }

    // Listen to popstate (browser back/forward)
    window.addEventListener('popstate', () => {
      const p = new URLSearchParams(window.location.search);
      const user = auth.getCurrentUser();
      const t = p.get('tab') || getDefaultTabForRole(user?.role, user?.id);
      this.navigateTo(t.toUpperCase(), false);
    });

    this.render();
  }

  navigateTo(tab, pushState = true) {
    const currentUser = auth.getCurrentUser();
    if (currentUser && !isTabAllowedForUser(tab, currentUser)) {
      tab = getDefaultTabForRole(currentUser.role, currentUser.id);
    }
    this.currentTab = tab;
    if (pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({}, '', url.toString());
    }
    this.render();
  }

  render() {
    // 1. Auth Guard
    if (!auth.isAuthenticated()) {
      document.body.classList.add('login-mode');
      if (this.navbarRoot) this.navbarRoot.style.display = 'none';
      if (this.sidebarRoot) this.sidebarRoot.style.display = 'none';
      if (this.lockBannerRoot) this.lockBannerRoot.innerHTML = '';
      
      this.moduleContainer.innerHTML = '';
      initLoginModule(this.moduleContainer, () => {
        document.body.classList.remove('login-mode');
        if (this.navbarRoot) this.navbarRoot.style.display = '';
        if (this.sidebarRoot) this.sidebarRoot.style.display = '';
        const user = auth.getCurrentUser();
        const def = getDefaultTabForRole(user?.role, user?.id);
        this.navigateTo(def);
      });
      return;
    }

    document.body.classList.remove('login-mode');
    if (this.navbarRoot) this.navbarRoot.style.display = '';
    if (this.sidebarRoot) this.sidebarRoot.style.display = '';

    // Verify current tab is permitted for role
    const currentUser = auth.getCurrentUser();
    if (currentUser && !isTabAllowedForUser(this.currentTab, currentUser)) {
      this.currentTab = getDefaultTabForRole(currentUser.role, currentUser.id);
    }

    // 2. Render Navbar
    renderNavbar(this.navbarRoot, {
      onStoreChange: () => this.render(),
      onNavigate: (tab) => this.navigateTo(tab)
    });

    // 3. Render Sidebar
    renderSidebar(this.sidebarRoot, {
      activeTab: this.currentTab,
      onSelectTab: (tab) => this.navigateTo(tab)
    });

    // 4. SaaS Lock Banner check
    checkAndRenderLockBanner(this.lockBannerRoot, (tab) => this.navigateTo(tab));

    // 5. Mount Active Module safely
    const opts = {
      onNavigate: (tab) => this.navigateTo(tab)
    };

    const modules = {
      DASHBOARD: { name: 'Painel Geral', fn: initDashboardModule },
      PDV: { name: 'Frente de Caixa (PDV)', fn: initPosModule },
      VENDAS: { name: 'Histórico de Vendas', fn: initVendasModule },
      ORCAMENTOS: { name: 'Orçamentos', fn: initOrcamentosModule },
      PRODUTOS: { name: 'Produtos & Materiais', fn: initProdutosModule },
      ESTOQUE: { name: 'Estoque & Kardex', fn: initEstoqueModule },
      PERDAS: { name: 'Perdas & Avarias', fn: initPerdasModule },
      CAIXA: { name: 'Caixa & Fechamento', fn: initCaixaModule },
      CLIENTES: { name: 'Clientes & Fiado', fn: initClientesModule },
      ENTREGAS: { name: 'Entregas', fn: initEntregasModule },
      RELATORIOS: { name: 'Relatórios', fn: initRelatoriosModule },
      CONFIGURACOES: { name: 'Configurações', fn: initConfiguracoesModule },
      EMBAIXADORES: { name: 'Embaixadores', fn: initEmbaixadoresModule },
      MONITOR_SAAS: { name: 'Monitor SaaS', fn: initMonitorModule },
      LOJAS: { name: 'Lojas', fn: initMonitorModule },
      AUDITORIA: { name: 'Auditoria & Inventário', fn: initAuditoriaModule }
    };

    const target = modules[this.currentTab] || modules.DASHBOARD;
    this.renderModuleSafely(target.name, target.fn, opts);

    // Scroll to top
    window.scrollTo(0, 0);
  }

  renderModuleSafely(moduleName, mountFn, opts) {
    try {
      this.moduleContainer.innerHTML = '';
      mountFn(this.moduleContainer, opts);
    } catch (err) {
      console.error(`[GEF Error Boundary] Falha ao renderizar módulo "${moduleName}":`, err);
      this.renderModuleErrorFallback(moduleName, err);
    }
  }

  renderModuleErrorFallback(moduleName, err) {
    if (!this.moduleContainer) return;
    this.moduleContainer.innerHTML = `
      <div class="card" style="margin: 20px 0; border: 1px solid #ef4444; background: rgba(239, 68, 68, 0.05); padding: 24px; border-radius: 12px;">
        <div style="display: flex; align-items: flex-start; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; display: flex; align-items: center; justify-content: center; color: #f87171; flex-shrink: 0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17"/></svg>
          </div>
          <div style="flex: 1;">
            <h3 style="margin: 0 0 6px 0; color: #fca5a5; font-size: 16px; font-weight: 800;">
              Módulo "${moduleName}" Temporariamente Indisponível
            </h3>
            <p style="margin: 0 0 14px 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
              Ocorreu uma instabilidade neste módulo específico. O sistema isolou a falha para que <strong>os demais módulos, frente de caixa e banco de dados continuem operando normalmente</strong>.
            </p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn btn-primary" id="btn-retry-module" style="padding: 8px 16px; font-size: 12px;">
                Recarregar Módulo
              </button>
              <button class="btn btn-secondary" id="btn-goto-dash" style="padding: 8px 16px; font-size: 12px;">
                Ir para o Dashboard
              </button>
            </div>
            <details style="margin-top: 14px; font-size: 11px; color: #94a3b8; cursor: pointer;">
              <summary>Detalhes técnicos da exceção</summary>
              <pre style="margin-top: 8px; background: #0f172a; padding: 10px; border-radius: 6px; overflow-x: auto; color: #f87171; font-family: monospace;">${err?.stack || err?.message || String(err)}</pre>
            </details>
          </div>
        </div>
      </div>
    `;

    const retryBtn = this.moduleContainer.querySelector('#btn-retry-module');
    if (retryBtn) retryBtn.onclick = () => this.render();

    const dashBtn = this.moduleContainer.querySelector('#btn-goto-dash');
    if (dashBtn) dashBtn.onclick = () => this.navigateTo('DASHBOARD');
  }
}

// Auto-start on load
document.addEventListener('DOMContentLoaded', () => {
  // Global error trapping to prevent app-wide crashes
  window.addEventListener('error', (event) => {
    console.warn('[GEF Safety Interceptor] Exceção capturada com segurança:', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[GEF Safety Interceptor] Promise assíncrona capturada com segurança:', event.reason);
  });

  const app = new GefApp();
  app.start();
});
