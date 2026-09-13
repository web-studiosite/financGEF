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
import { normalizeRole } from './permissions.js';

const CONFIG_STORAGE_KEY = 'gef_supabase_config_v1';

function loadConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(
      'Erro ao ler supabase config do localStorage:',
      e
    );
  }

  const envUrl =
    window.__ENV__?.VITE_SUPABASE_URL ||
    window.__ENV__?.SUPABASE_URL;

  const envKey =
    window.__ENV__?.VITE_SUPABASE_ANON_KEY ||
    window.__ENV__?.SUPABASE_ANON_KEY;

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
  const cleanUrl = (url || '')
    .trim()
    .replace(/\/$/, '');

  const cleanKey = (anonKey || '').trim();

  currentConfig = {
    url: cleanUrl,
    anonKey: cleanKey
  };

  localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify(currentConfig)
  );

  initClient();
}

export function getSupabaseConfig() {
  return {
    ...currentConfig,
    isConfigured: isSupabaseConfigured()
  };
}

export let supabase = null;

function initClient() {
  try {
    supabase = createClient(
      currentConfig.url,
      currentConfig.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  } catch (err) {
    console.warn(
      'Falha ao inicializar cliente Supabase:',
      err
    );

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
      error:
        'Supabase ainda não configurado com URL e Anon Key válidas.'
    };
  }

  try {
    const {
      data,
      error
    } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    if (!data?.user) {
      return {
        success: false,
        error:
          'Usuário não retornado pelo Supabase.'
      };
    }

    /*
     * O utilizador foi autenticado.
     * Agora é obrigatório encontrar o perfil
     * correspondente na tabela public.profiles.
     */
    const {
      data: profile,
      error: profileError
    } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    /*
     * Falha na consulta do perfil:
     * NÃO transformar em CASHIER.
     */
    if (profileError) {
      console.error(
        '[GEF AUTH] Erro ao carregar perfil:',
        profileError
      );

      return {
        success: false,
        isProfileError: true,
        error:
          'Não foi possível carregar o perfil do utilizador.'
      };
    }

    /*
     * Auth existe, mas não existe perfil GEF.
     */
    if (!profile) {
      console.error(
        '[GEF AUTH] Perfil não encontrado para:',
        data.user.id
      );

      return {
        success: false,
        isProfileError: true,
        error:
          'O utilizador foi autenticado, mas não possui um perfil GEF configurado.'
      };
    }

    /*
     * A função vem do perfil.
     * A normalização é centralizada em permissions.js.
     */
    const role = normalizeRole(
      profile.role,
      data.user.id
    );

    if (!role) {
      console.error(
        '[GEF AUTH] Função inválida:',
        profile.role
      );

      return {
        success: false,
        isProfileError: true,
        error:
          `Função de utilizador inválida: ${profile.role || 'não definida'}.`
      };
    }

    const storeId =
      role === 'SUPERADMIN'
        ? 'ALL'
        : (
            profile.store_id ||
            data.user.user_metadata?.store_id ||
            'store-001'
          );

    const fullName =
      profile.full_name ||
      data.user.user_metadata?.full_name ||
      email.split('@')[0];

    const appUser = {
      id: data.user.id,
      email: data.user.email,
      fullName,
      role,
      storeId,
      supabaseAuth: true,
      active: profile.active !== false
    };

    return {
      success: true,
      user: appUser,
      session: data.session
    };

  } catch (err) {
    console.error(
      '[GEF AUTH] Falha inesperada:',
      err
    );

    return {
      success: false,
      error:
        err.message ||
        'Falha na conexão com Supabase.'
    };
  }
}

/**
 * Registro de novo usuário com Supabase Auth
 */
export async function registerWithSupabase(
  email,
  password,
  fullName,
  role = 'CASHIER',
  storeId = 'store-001'
) {
  if (!supabase || !isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase não configurado.'
    };
  }

  try {
    const {
      data,
      error
    } = await supabase.auth.signUp({
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

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session
    };

  } catch (err) {
    return {
      success: false,
      error: err.message
    };
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
      console.warn(
        'Erro ao fazer signOut no Supabase:',
        e
      );
    }
  }
}

export default supabase;
