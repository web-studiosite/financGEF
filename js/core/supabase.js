/**
 * GEF - GESTÃO FINANCEIRA | CONEXÃO SUPABASE & REAL AUTH
 *
 * Cliente Supabase centralizado.
 *
 * REGRAS DE AUTENTICAÇÃO:
 * - Credenciais inválidas = acesso recusado
 * - Perfil inexistente = acesso recusado
 * - Erro ao carregar perfil = acesso recusado
 * - Perfil inativo = acesso recusado
 * - Role vem EXCLUSIVAMENTE de public.profiles
 * - Nunca inventar CASHIER
 * - Nunca usar metadata.role como fallback de segurança
 *
 * IMPORTANTE:
 * 1. Use somente a chave pública ANON/PUBLISHABLE.
 * 2. NUNCA coloque a service_role key neste ficheiro.
 *
 * Compatível com:
 * - auth.js
 * - login real Supabase
 * - registro real Supabase
 * - logout real Supabase
 * - sessão persistente
 * - modo demo quando Supabase não está configurado
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';


// ============================================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================================

const SUPABASE_URL =
    'https://ympvphijbheyzifemoti.supabase.co';

const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltcHZwaGlqYmhleXp'
    + 'pZmVtb3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMTg2NzIsImV4cCI6MjEwNDg5NDY3Mn0.'
    + 'h4pho05EF1PEj_qi2vLLT655mJs7AUNjubtZOCpgYK0';


// ============================================================================
// CONFIGURAÇÃO INTERNA
// ============================================================================

const CONFIG_STORAGE_KEY = 'gef_supabase_config_v1';


// ============================================================================
// NORMALIZAR CONFIGURAÇÃO
// ============================================================================

function normalizeConfig(url, key) {

    const cleanUrl = String(url || '')
        .trim()
        .replace(/\/+$/, '');

    const cleanKey = String(key || '')
        .trim();

    return {
        url: cleanUrl,
        anonKey: cleanKey
    };
}


// ============================================================================
// VALIDAR URL SUPABASE
// ============================================================================

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


// ============================================================================
// VALIDAR CHAVE PÚBLICA
// ============================================================================

function isValidSupabaseKey(key) {

    if (!key || key.length < 20) {
        return false;
    }

    const lower = key.toLowerCase();

    return (
        !lower.includes('sua_chave') &&
        !lower.includes('sua-chave') &&
        !lower.includes('sua chave') &&
        !lower.includes('sua_chave_publicavel') &&
        !lower.includes('sua-chave-publicavel') &&
        !lower.includes('aqui') &&
        !lower.includes('supabase_anon_key') &&
        !lower.includes('seu-projeto')
    );
}


// ============================================================================
// VERIFICAR CONFIGURAÇÃO REAL
// ============================================================================

function isRealConfig(url, key) {

    return (
        isValidSupabaseUrl(url) &&
        isValidSupabaseKey(key)
    );
}


// ============================================================================
// CONFIGURAÇÃO DIRETA DO FICHEIRO
// ============================================================================
//
// A configuração escrita neste ficheiro tem prioridade.
//

const DIRECT_CONFIG = normalizeConfig(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// ============================================================================
// CARREGAR CONFIGURAÇÃO
// ============================================================================

function loadConfig() {

    // ------------------------------------------------------------------------
    // 1. PRIMEIRO: credenciais diretamente definidas neste ficheiro
    // ------------------------------------------------------------------------

    if (
        isRealConfig(
            DIRECT_CONFIG.url,
            DIRECT_CONFIG.anonKey
        )
    ) {

        return DIRECT_CONFIG;
    }


    // ------------------------------------------------------------------------
    // 2. SEGUNDO: configuração de ambiente
    // ------------------------------------------------------------------------

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


    // ------------------------------------------------------------------------
    // 3. TERCEIRO: configuração antiga do navegador
    // ------------------------------------------------------------------------

    try {

        const saved =
            localStorage.getItem(CONFIG_STORAGE_KEY);

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


    // ------------------------------------------------------------------------
    // 4. Nenhuma configuração válida
    // ------------------------------------------------------------------------

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
// VERIFICAR SE O SUPABASE ESTÁ CONFIGURADO
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

        isConfigured:
            isSupabaseConfigured()

    };
}


// ============================================================================
// INICIALIZAR CLIENTE
// ============================================================================

function initClient() {

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

                    storageKey:
                        'gef-supabase-auth'
                },

                global: {

                    headers: {

                        'x-application-name':
                            'GEF'
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


// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

initClient();


// ============================================================================
// SALVAR CONFIGURAÇÃO
// ============================================================================

export function saveSupabaseConfig(
    url,
    anonKey
) {

    const newConfig =
        normalizeConfig(
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

            error:
                'URL ou chave pública do Supabase inválida.'
        };
    }


    currentConfig = newConfig;


    try {

        localStorage.setItem(

            CONFIG_STORAGE_KEY,

            JSON.stringify(
                currentConfig
            )
        );

    } catch (error) {

        console.warn(
            'GEF: não foi possível guardar a configuração:',
            error
        );
    }


    initClient();


    return {

        success:
            Boolean(supabase),

        isConfigured:
            isSupabaseConfigured(),

        error:
            supabase
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

    // ------------------------------------------------------------------------
    // VERIFICAR CONFIGURAÇÃO
    // ------------------------------------------------------------------------

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


    const cleanEmail =
        String(email || '')
            .trim()
            .toLowerCase();


    if (
        !cleanEmail ||
        !password
    ) {

        return {

            success: false,

            error:
                'Informe o e-mail e a senha.'
        };
    }


    try {

        // --------------------------------------------------------------------
        // LOGIN REAL
        // --------------------------------------------------------------------

        const {
            data,
            error
        } =
            await supabase.auth.signInWithPassword({

                email:
                    cleanEmail,

                password:
                    password
            });


        // --------------------------------------------------------------------
        // CREDENCIAIS INVÁLIDAS
        // --------------------------------------------------------------------

        if (error) {

            // Garantir que nenhuma sessão parcial permaneça.
            try {
                await supabase.auth.signOut();
            } catch (_) {}

            return {

                success: false,

                error:
                    'E-mail ou senha incorretos.'
            };
        }


        // --------------------------------------------------------------------
        // UTILIZADOR NÃO RETORNADO
        // --------------------------------------------------------------------

        if (!data?.user) {

            try {
                await supabase.auth.signOut();
            } catch (_) {}

            return {

                success: false,

                error:
                    'Não foi possível autenticar o utilizador.'
            };
        }


        // --------------------------------------------------------------------
        // BUSCAR PERFIL REAL
        // --------------------------------------------------------------------
        //
        // ATENÇÃO:
        // O perfil é obrigatório.
        //
        // Não existe fallback para CASHIER.
        // Não existe fallback para metadata.role.
        //
        // --------------------------------------------------------------------

        let profile = null;


        try {

            const {
                data: profData,
                error: profError

            } =
                await supabase

                    .from('profiles')

                    .select('*')

                    .eq(
                        'id',
                        data.user.id
                    )

                    .maybeSingle();


            // ---------------------------------------------------------------
            // ERRO AO CONSULTAR PERFIL
            // ---------------------------------------------------------------

            if (profError) {

                console.error(
                    'GEF: erro ao consultar public.profiles:',
                    profError
                );

                try {
                    await supabase.auth.signOut();
                } catch (_) {}

                return {

                    success: false,

                    error:
                        'Não foi possível verificar o perfil do utilizador. Acesso bloqueado.'
                };
            }


            // ---------------------------------------------------------------
            // PERFIL NÃO EXISTE
            // ---------------------------------------------------------------

            if (!profData) {

                try {
                    await supabase.auth.signOut();
                } catch (_) {}

                return {

                    success: false,

                    error:
                        'Perfil do utilizador não encontrado. Acesso bloqueado.'
                };
            }


            profile = profData;


        } catch (error) {

            console.error(
                'GEF: erro inesperado ao consultar perfil:',
                error
            );

            try {
                await supabase.auth.signOut();
            } catch (_) {}

            return {

                success: false,

                error:
                    'Erro ao verificar o perfil do utilizador. Acesso bloqueado.'
            };
        }


        // --------------------------------------------------------------------
        // PERFIL INATIVO
        // --------------------------------------------------------------------

        if (profile.active !== true) {

            try {
                await supabase.auth.signOut();
            } catch (_) {}

            return {

                success: false,

                error:
                    'Este utilizador está inativo. Acesso bloqueado.'
            };
        }


        // --------------------------------------------------------------------
        // ROLE OBRIGATÓRIO
        // --------------------------------------------------------------------

        if (
            !profile.role ||
            typeof profile.role !== 'string' ||
            !profile.role.trim()
        ) {

            try {
                await supabase.auth.signOut();
            } catch (_) {}

            return {

                success: false,

                error:
                    'Função do utilizador não definida. Acesso bloqueado.'
            };
        }


        // --------------------------------------------------------------------
        // ROLE REAL
        // --------------------------------------------------------------------
        //
        // A função vem EXCLUSIVAMENTE de public.profiles.
        //
        // NÃO usar:
        // metadata.role
        //
        // NÃO usar:
        // 'CASHIER'
        //
        // --------------------------------------------------------------------

        const role =
            String(profile.role)
                .trim()
                .toUpperCase();


        // --------------------------------------------------------------------
        // STORE REAL
        // --------------------------------------------------------------------
        //
        // Não inventar store-001.
        //
        // SUPERADMIN pode ter store_id NULL.
        // --------------------------------------------------------------------

        const storeId =
            profile.store_id || null;


        // --------------------------------------------------------------------
        // NOME REAL DO PERFIL
        // --------------------------------------------------------------------

        const fullName =
            profile.full_name ||
            cleanEmail.split('@')[0];


        // --------------------------------------------------------------------
        // UTILIZADOR DA APLICAÇÃO
        // --------------------------------------------------------------------

        const appUser = {

            id:
                data.user.id,

            email:
                data.user.email ||
                cleanEmail,

            fullName:
                fullName,

            role:
                role,

            storeId:
                storeId,

            supabaseAuth:
                true,

            active:
                true
        };


        // --------------------------------------------------------------------
        // LOGIN CONCLUÍDO
        // --------------------------------------------------------------------

        return {

            success: true,

            user:
                appUser,

            session:
                data.session
        };


    } catch (error) {

        // --------------------------------------------------------------------
        // QUALQUER ERRO NÃO PREVISTO = FORA
        // --------------------------------------------------------------------

        try {
            await supabase.auth.signOut();
        } catch (_) {}

        return {

            success: false,

            error:
                error?.message ||
                'Falha na autenticação. Acesso bloqueado.'
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

    // ------------------------------------------------------------------------
    // VERIFICAR CONFIGURAÇÃO
    // ------------------------------------------------------------------------

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

        } =
            await supabase.auth.signUp({

                email:
                    String(
                        email || ''
                    ).trim().toLowerCase(),

                password:
                    password,

                options: {

                    data: {

                        full_name:
                            String(
                                fullName || ''
                            ).trim(),

                        role:
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
        } =
            await supabase.auth.signOut();


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
// ============================================================================

export default supabase;
