/**
 * GEF - GESTÃO FINANCEIRA | LOGIN MODULE
 * JavaScript Puro (Vanilla JS)
 * Suporte a Supabase Auth Real + Perfis de Demonstração
 */

import { auth, DEMO_USERS } from '../../js/core/auth.js';
import { showToast } from '../../js/components/toast.js';
import { isSupabaseConfigured, getSupabaseConfig, saveSupabaseConfig } from '../../js/core/supabase.js';

export function initLoginModule(container, onSuccess) {
  const supaCfg = getSupabaseConfig();
  const isConnected = isSupabaseConfigured();

  container.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: #0b0f19;">
      <div style="width: 100%; max-width: 440px; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
        <!-- Logo & Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #1e293b; border-radius: 16px; border: 1px solid #334155; margin-bottom: 12px;">
            <img src="../../assets/icons/icon.svg" alt="GEF Logo" style="width: 44px; height: 44px;">
          </div>
          <h1 style="font-size: 20px; font-weight: 900; color: #f8fafc; margin: 0;">GEF - GESTÃO FINANCEIRA</h1>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">ERP Especializado para Materiais de Construção & Ferragens</p>
        </div>

        <!-- Supabase Status Badge / Config Toggle -->
        <div style="margin-bottom: 16px;">
          <button 
            type="button" 
            id="btn-toggle-supa-cfg" 
            style="width: 100%; background: ${isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)'}; border: 1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}; border-radius: 8px; padding: 6px 10px; font-size: 11px; color: ${isConnected ? '#34d399' : '#60a5fa'}; display: flex; align-items: center; justify-content: space-between; cursor: pointer;"
          >
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${isConnected ? '#10b981' : '#3b82f6'}; display: inline-block;"></span>
              <strong>${isConnected ? 'Supabase Auth Conectado' : 'Supabase Auth (Clique p/ Configurar Chaves)'}</strong>
            </div>
            <span style="font-size: 10px; color: #94a3b8;">${isConnected ? 'Pronto para Login Real' : 'Configurar'}</span>
          </button>

          <!-- Collapsible Supabase Key Config Form -->
          <div id="supa-config-box" style="display: none; margin-top: 8px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-size: 11px;">
            <div style="font-weight: 700; color: #f8fafc; margin-bottom: 8px;">Credenciais do Supabase (Project Settings -> API)</div>
            <div style="margin-bottom: 8px;">
              <label style="color: #94a3b8; display: block; margin-bottom: 2px;">Project URL:</label>
              <input type="text" id="cfg-supa-url" value="${supaCfg.url || ''}" placeholder="https://xyzcompany.supabase.co" style="width: 100%; font-size: 11px; font-family: var(--font-mono);">
            </div>
            <div style="margin-bottom: 10px;">
              <label style="color: #94a3b8; display: block; margin-bottom: 2px;">Anon / Public Key:</label>
              <input type="password" id="cfg-supa-key" value="${supaCfg.anonKey || ''}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." style="width: 100%; font-size: 11px; font-family: var(--font-mono);">
            </div>
            <div style="display: flex; gap: 6px; justify-content: flex-end;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-supa-cfg" style="padding: 4px 8px; font-size: 10px;">Fechar</button>
              <button type="button" class="btn btn-primary" id="btn-save-supa-cfg" style="padding: 4px 10px; font-size: 10px;">Salvar Conexão</button>
            </div>
          </div>
        </div>

        <!-- Form -->
        <form id="form-login" style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">E-mail Corporativo</label>
            <input type="email" id="login-email" placeholder="seu.email@gef.co.mz" required style="width: 100%; font-size: 13px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #cbd5e1; display: block; margin-bottom: 4px;">Senha de Acesso</label>
            <input type="password" id="login-password" placeholder="••••••••" required style="width: 100%; font-size: 13px;">
          </div>

          <button type="submit" class="btn btn-primary" id="btn-submit-login" style="width: 100%; padding: 12px; font-size: 13px; font-weight: 800; margin-top: 6px;">
            Acessar Sistema GEF
          </button>
        </form>

        <!-- Demo Profiles Quick Switch (Mantido 100% Intacto) -->
        <div style="margin-top: 24px; border-top: 1px solid #1f2937; padding-top: 18px;">
          <div style="font-size: 10px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; text-align: center;">
            Perfis de Demonstração Rápidos (1-Clique)
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${DEMO_USERS.map(u => `
              <button 
                type="button" 
                class="btn btn-secondary demo-user-btn" 
                data-demo-id="${u.id}"
                style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; font-size: 11px; text-align: left;"
              >
                <div>
                  <div style="font-weight: 700; color: #e2e8f0;">${u.fullName}</div>
                  <div style="font-size: 10px; color: #94a3b8;">${u.storeName}</div>
                </div>
                <span class="badge ${u.role === 'SUPERADMIN' ? 'badge-amber' : u.role === 'ADMIN' ? 'badge-blue' : u.role === 'GERENTE' ? 'badge-orange' : 'badge-emerald'}" style="font-size: 8px;">
                  ${u.role}
                </span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Toggle config box
  const toggleBtn = container.querySelector('#btn-toggle-supa-cfg');
  const configBox = container.querySelector('#supa-config-box');
  if (toggleBtn && configBox) {
    toggleBtn.onclick = () => {
      configBox.style.display = configBox.style.display === 'none' ? 'block' : 'none';
    };
  }

  const cancelCfgBtn = container.querySelector('#btn-cancel-supa-cfg');
  if (cancelCfgBtn && configBox) {
    cancelCfgBtn.onclick = () => { configBox.style.display = 'none'; };
  }

  const saveCfgBtn = container.querySelector('#btn-save-supa-cfg');
  if (saveCfgBtn) {
    saveCfgBtn.onclick = () => {
      const url = container.querySelector('#cfg-supa-url').value.trim();
      const key = container.querySelector('#cfg-supa-key').value.trim();
      if (!url || !key) {
        showToast('Informe a URL e a Anon Key do Supabase.', 'error');
        return;
      }
      saveSupabaseConfig(url, key);
      showToast('Credenciais do Supabase salvas!', 'success');
      initLoginModule(container, onSuccess);
    };
  }

  // Submit standard form with Supabase support
  const form = container.querySelector('#form-login');
  const submitBtn = container.querySelector('#btn-submit-login');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = container.querySelector('#login-email').value;
    const password = container.querySelector('#login-password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Autenticando...';

    try {
      const res = await auth.signIn(email, password);
      if (res.success) {
        if (res.fromSupabase) {
          showToast(`Bem-vindo, ${res.user.fullName}! (Autenticado via Supabase)`, 'success');
        } else {
          showToast(`Bem-vindo, ${res.user.fullName}!`, 'success');
        }
        if (onSuccess) onSuccess(res.user);
      } else {
        showToast(res.error || 'Falha ao autenticar.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Erro inesperado ao realizar login.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Acessar Sistema GEF';
    }
  };

  // Demo user buttons
  container.querySelectorAll('.demo-user-btn').forEach(btn => {
    btn.onclick = () => {
      const demoId = btn.getAttribute('data-demo-id');
      const demo = DEMO_USERS.find(u => u.id === demoId);
      if (demo) {
        auth.selectDemoUser(demo);
        showToast(`Sessão iniciada como ${demo.fullName}`, 'success');
        if (onSuccess) onSuccess(demo);
      }
    };
  });
}
