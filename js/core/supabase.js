/**
 * GEF - GESTÃO FINANCEIRA | CONEXÃO SUPABASE & REAL AUTH
 * 
 * Suporte a conexão nativa com Supabase:
 * - Login verdadeiro via supabase.auth.signInWithPassword()
 * - Registro via supabase.auth.signUp()
 * - Recuperação do perfil em public.profiles
 * - Persistência automática de sessão
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CONFIG_STORAGE_KEY = 'gef_supabase_config_v1';

// Recupera configuração do localStorage ou variáveis de ambiente
function loadConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao ler supabase config do localStorage:', e);
  }

  const envUrl = window.__ENV__?.VITE_SUPABASE_URL || window.__ENV__?.SUPABASE_URL;
  const envKey = window.__ENV__?.VITE_SUPABASE_ANON_KEY || window.__ENV__?.SUPABASE_ANON_KEY;

  return {
    url: envUrl || 'https://seu-projeto.supabase.co',
    anonKey: envKey || 'sua-chave-anon-publica-do-supabase'
  };
}

let currentConfig = loadConfig();

export function isSupabaseConfigured() {
  return Boolean(
    currentConfig.url &&
    !currentConfig.url.includes('seu-projeto') &&
    currentConfig.anonKey &&
    !currentConfig.anonKey.includes('sua-chave')
  );
}

export function saveSupabaseConfig(url, anonKey) {
  const cleanUrl = (url || '').trim().replace(/\/$/, '');
  const cleanKey = (anonKey || '').trim();
  currentConfig = { url: cleanUrl, anonKey: cleanKey };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(currentConfig));
  initClient();
}

export function getSupabaseConfig() {
  return { ...currentConfig, isConfigured: isSupabaseConfigured() };
}

// Inicializa ou recria o cliente Supabase
export let supabase = null;

function initClient() {
  try {
    supabase = createClient(currentConfig.url, currentConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    console.warn('Falha ao inicializar cliente Supabase:', err);
    supabase = null;
  }
}

initClient();

/**
 * Autenticação real com Supabase
 */
export async function loginWithSupabase(email, password) {
  if (!supabase || !isSupabaseConfigured()) {
    return {
      success: false,
      isConfigError: true,
      error: 'Supabase ainda não configurado com URL e Anon Key válidas.'
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.user) {
      return { success: false, error: 'Usuário não retornado pelo Supabase.' };
    }

    // Busca o perfil na tabela public.profiles
    let profile = null;
    try {
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (!profError && profData) {
        profile = profData;
      }
    } catch (e) {
      console.warn('Não foi possível buscar profile no Supabase, usando metadata:', e);
    }

    const role = profile?.role || data.user.user_metadata?.role || 'CASHIER';
    const storeId = profile?.store_id || data.user.user_metadata?.store_id || 'store-001';
    const fullName = profile?.full_name || data.user.user_metadata?.full_name || email.split('@')[0];

    const appUser = {
      id: data.user.id,
      email: data.user.email,
      fullName,
      role: role.toUpperCase(),
      storeId,
      supabaseAuth: true,
      active: true
    };

    return {
      success: true,
      user: appUser,
      session: data.session
    };
  } catch (err) {
    return { success: false, error: err.message || 'Falha na conexão com Supabase.' };
  }
}

/**
 * Registro de novo usuário com Supabase Auth
 */
export async function registerWithSupabase(email, password, fullName, role = 'CASHIER', storeId = 'store-001') {
  if (!supabase || !isSupabaseConfigured()) {
    return { success: false, error: 'Supabase não configurado.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          store_id: storeId
        }
      }
    });

    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user, session: data.session };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Logout real no Supabase
 */
export async function logoutWithSupabase() {
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Erro ao fazer signOut no Supabase:', e);
    }
  }
}

export default supabase;
