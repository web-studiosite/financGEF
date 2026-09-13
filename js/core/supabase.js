/**
 * GEF - GESTÃO FINANCEIRA | CONEXÃO SUPABASE & REAL AUTH
 *
 * Cliente Supabase centralizado.
 *
 * IMPORTANTE:
 * 1. Coloque a URL e a chave PUBLICÁVEL (anon/publishable) abaixo.
 * 2. NUNCA coloque a service_role key neste ficheiro.
 * 3. Mantidos os exports utilizados pelo auth.js.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================================

// COLOQUE AQUI OS DADOS REAIS DO SEU PROJETO
const SUPABASE_URL = 'https://ympvphijbheyzifemoti.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltcHZwaGlqYmhleXppZmVtb3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTg2NzIsImV4cCI6MjEwNDg5NDY3Mn0.h4pho05EF1PEj_qi2vLLT655mJs7AUNjubtZOCpgYK0';

// ============================================================================
// CONFIGURAÇÃO INTERNA
// ============================================================================

const CONFIG_STORAGE_KEY = 'gef_supabase_config_v1';

function normalizeConfig(url, key) {
    const cleanUrl = String(url || '').trim().replace(/\/+$/, '');
    const cleanKey = String(key || '').trim();

    return {
        url: cleanUrl,
        anonKey: cleanKey
    };
}

function isValidSupabaseUrl(url) {
    try {
        const parsed = new URL(url);

        return (
            parsed.protocol === 'https:' &&
            parsed.hostname.endsWith('.supabase.co')
        );

    } catch {
        return false;
    }
}

function isValidSupabaseKey(key) {
    if (!key || key.length < 20) {
        return false;
    }

    const lower = key.toLowerCase();

    return (
        !lower.includes('sua_chave') &&
        !lower.includes('sua-chave') &&
        !lower.includes('sua chave') &&
        !lower.includes('aqui') &&
        !lower.includes('supabase_anon_key')
    );
}

function isRealConfig(url, key) {
    return (
        isValidSupabaseUrl(url) &&
        isValidSupabaseKey(key)
    );
}

// ============================================================================
// CARREGAR CONFIGURAÇÃO
// ============================================================================

function loadConfig() {

    // 1. Tenta configuração anteriormente salva no navegador
    try {

        const saved = localStorage.getItem(CONFIG_STORAGE_KEY);

        if (saved) {

            const parsed = JSON.parse(saved);

            const savedConfig = normalizeConfig(
                parsed?.url,
                parsed?.anonKey
            );

            if (
                isRealConfig(
                    savedConfig.url,
                    savedConfig.anonKey
                )
            ) {
                return savedConfig;
            }
        }

    } catch (error) {

        console.warn(
            'GEF: erro ao ler configuração Supabase:',
            error
        );
    }

    // 2. Tenta configuração diretamente neste ficheiro

    const directConfig = normalizeConfig(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    if (
        isRealConfig(
            directConfig.url,
            directConfig.anonKey
        )
    ) {
        return directConfig;
    }

    // 3. Tenta configuração fornecida pelo ambiente

    try {

        const envUrl =
            window.__ENV__?.VITE_SUPABASE_URL ||
            window.__ENV__?.SUPABASE_URL;

        const envKey =
            window.__ENV__?.VITE_SUPABASE_ANON_KEY ||
            window.__ENV__?.SUPABASE_ANON_KEY;

        const envConfig = normalizeConfig(
            envUrl,
            envKey
        );

        if (
            isRealConfig(
                envConfig.url,
                envConfig.anonKey
            )
        ) {
            return envConfig;
        }

    } catch (error) {

        console.warn(
            'GEF: configuração de ambiente indisponível.'
        );
    }

    // Nenhuma configuração válida

    return {
        url: '',
        anonKey: ''
    };
}

let currentConfig = loadConfig();

// ============================================================================
// CLIENTE SUPABASE
// ============================================================================

export let supabase = null;

// ============================================================================
// VERIFICAR CONFIGURAÇÃO
// ============================================================================

export function isSupabaseConfigured() {

    return isRealConfig(
        currentConfig.url,
        currentConfig.anonKey
    );
}

// ============================================================================
// OBTER CONFIGURAÇÃO
// ============================================================================

export function getSupabaseConfig() {

    return {
        url: currentConfig.url,
        anonKey: currentConfig.anonKey,
        isConfigured: isSupabaseConfigured()
    };
}

// ============================================================================
// INICIALIZAR CLIENTE
// ============================================================================

function initClient() {

    // Não tenta conectar se as credenciais não forem válidas

    if (!isSupabaseConfigured()) {

        supabase = null;

        return null;
    }

    try {

        supabase = createClient(
            currentConfig.url,
            currentConfig.anonKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storageKey: 'gef-supabase-auth'
                },

                global: {
                    headers: {
                        'x-application-name': 'GEF'
                    }
                }
            }
        );

        return supabase;

    } catch (error) {

        console.error(
            'GEF: falha ao inicializar cliente Supabase:',
            error
        );

        supabase = null;

        return null;
    }
}

// Inicialização única

initClient();

// ============================================================================
// SALVAR CONFIGURAÇÃO
// ============================================================================

export function saveSupabaseConfig(url, anonKey) {

    const newConfig = normalizeConfig(
        url,
        anonKey
    );

    if (
        !isRealConfig(
            newConfig.url,
            newConfig.anonKey
        )
    ) {

        return {
            success: false,
            error: 'URL ou chave pública do Supabase inválida.'
        };
    }

    currentConfig = newConfig;

    try {

        localStorage.setItem(
            CONFIG_STORAGE_KEY,
            JSON.stringify(currentConfig)
        );

    } catch (error) {

        console.warn(
            'GEF: não foi possível guardar a configuração:',
            error
        );
    }

    initClient();

    return {
        success: Boolean(supabase),
        isConfigured: isSupabaseConfigured(),
        error: supabase
            ? null
            : 'Não foi possível inicializar o cliente Supabase.'
    };
}

// ============================================================================
// LOGIN REAL SUPABASE
// ============================================================================

export async function loginWithSupabase(
    email,
    password
) {

    if (
        !isSupabaseConfigured() ||
        !supabase
    ) {

        return {
            success: false,
            isConfigError: true,
            error:
                'Supabase ainda não está configurado com uma URL e chave pública válidas.'
        };
    }

    const cleanEmail = String(
        email || ''
    ).trim();

    if (
        !cleanEmail ||
        !password
    ) {

        return {
            success: false,
            error: 'Informe o e-mail e a senha.'
        };
    }

    try {

        const {
            data,
            error
        } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password
        });

        if (error) {

            return {
                success: false,
                error:
                    error.message ||
                    'Falha ao autenticar.'
            };
        }

        if (!data?.user) {

            return {
                success: false,
                error:
                    'Usuário não retornado pelo Supabase.'
            };
        }

        // ====================================================================
        // BUSCAR PERFIL
        // ====================================================================

        let profile = null;

        try {

            const {
                data: profData,
                error: profError
            } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();

            if (
                !profError &&
                profData
            ) {

                profile = profData;
            }

        } catch (error) {

            console.warn(
                'GEF: não foi possível consultar public.profiles:',
                error
            );
        }

        // ====================================================================
        // METADATA DO USUÁRIO
        // ====================================================================

        const metadata =
            data.user.user_metadata || {};

        const role =
            profile?.role ||
            metadata.role ||
            'CASHIER';

        const storeId =
            profile?.store_id ||
            metadata.store_id ||
            'store-001';

        const fullName =
            profile?.full_name ||
            metadata.full_name ||
            cleanEmail.split('@')[0];

        // ====================================================================
        // USUÁRIO DA APLICAÇÃO
        // ====================================================================

        const appUser = {

            id: data.user.id,

            email:
                data.user.email ||
                cleanEmail,

            fullName,

            role:
                String(role).toUpperCase(),

            storeId,

            supabaseAuth: true,

            active:
                profile?.active !== false
        };

        return {

            success: true,

            user: appUser,

            session: data.session
        };

    } catch (error) {

        return {

            success: false,

            error:
                error?.message ||
                'Falha na conexão com o Supabase.'
        };
    }
}

// ============================================================================
// REGISTRO REAL SUPABASE
// ============================================================================

export async function registerWithSupabase(
    email,
    password,
    fullName,
    role = 'CASHIER',
    storeId = 'store-001'
) {

    if (
        !isSupabaseConfigured() ||
        !supabase
    ) {

        return {

            success: false,

            isConfigError: true,

            error:
                'Supabase não configurado.'
        };
    }

    try {

        const {
            data,
            error
        } = await supabase.auth.signUp({

            email:
                String(email || '').trim(),

            password,

            options: {

                data: {

                    full_name:
                        String(
                            fullName || ''
                        ).trim(),

                    role,

                    store_id:
                        storeId
                }
            }
        });

        if (error) {

            return {

                success: false,

                error:
                    error.message
            };
        }

        return {

            success: true,

            user:
                data?.user || null,

            session:
                data?.session || null
        };

    } catch (error) {

        return {

            success: false,

            error:
                error?.message ||
                'Falha ao registrar no Supabase.'
        };
    }
}

// ============================================================================
// LOGOUT
// ============================================================================

export async function logoutWithSupabase() {

    if (
        !supabase ||
        !isSupabaseConfigured()
    ) {

        return {
            success: true
        };
    }

    try {

        const {
            error
        } = await supabase.auth.signOut();

        if (error) {

            console.warn(
                'GEF: erro ao fazer logout no Supabase:',
                error
            );

            return {

                success: false,

                error:
                    error.message
            };
        }

        return {
            success: true
        };

    } catch (error) {

        console.warn(
            'GEF: erro ao fazer logout:',
            error
        );

        return {

            success: false,

            error:
                error?.message ||
                'Falha ao terminar a sessão.'
        };
    }
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================
//
// Mantido para compatibilidade com módulos antigos.
//
// O auth.js atual utiliza os exports nomeados.

export default supabase;
