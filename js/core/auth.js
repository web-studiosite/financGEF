/**
 * GEF - GESTÃO FINANCEIRA | AUTH SERVICE
 *
 * JavaScript Puro (Vanilla JS)
 *
 * AUTENTICAÇÃO:
 * - Somente Supabase Auth
 * - Sem usuários Demo
 * - Sem login offline
 * - Sem fallback automático para CASHIER
 * - Perfil e função vêm do Supabase
 */

import {
  normalizeRole,
  canSwitchStores
} from './permissions.js';

import { db } from './database.js';

import {
  loginWithSupabase,
  registerWithSupabase,
  logoutWithSupabase,
  isSupabaseConfigured
} from './supabase.js';

const AUTH_STORAGE_KEY =
  'gef_authenticated_user_v2';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = new Set();
    this.init();
  }

  /**
   * Recupera somente uma sessão já validada.
   *
   * A sessão armazenada não cria um usuário novo.
   * Se a função for inválida, a sessão é eliminada.
   */
  init() {
    try {
      const saved =
        localStorage.getItem(
          AUTH_STORAGE_KEY
        );

      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);

      if (!parsed || !parsed.id) {
        localStorage.removeItem(
          AUTH_STORAGE_KEY
        );

        this.currentUser = null;
        return;
      }

      const role = normalizeRole(
        parsed.role,
        parsed.id
      );

      /*
       * Nunca transformar função inválida
       * automaticamente em CASHIER.
       */
      if (!role) {
        localStorage.removeItem(
          AUTH_STORAGE_KEY
        );

        this.currentUser = null;
        return;
      }

      this.currentUser = {
        ...parsed,
        role,
        storeId:
          role === 'SUPERADMIN'
            ? 'ALL'
            : (
                parsed.storeId ||
                'store-001'
              )
      };

    } catch (error) {
      console.warn(
        'Sessão armazenada inválida:',
        error
      );

      localStorage.removeItem(
        AUTH_STORAGE_KEY
      );

      this.currentUser = null;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);

    listener(this.currentUser);

    return () =>
      this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(
      fn => fn(this.currentUser)
    );
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return (
      !!this.currentUser &&
      this.currentUser.active !== false
    );
  }

  /**
   * LOGIN REAL
   *
   * Não existe:
   * - Demo
   * - login local
   * - fallback
   * - criação automática
   * - transformação em CASHIER
   */
  async signIn(email, password) {
    const cleanEmail =
      (email || '')
        .trim()
        .toLowerCase();

    /*
     * Validação básica.
     */
    if (!cleanEmail || !password) {
      return {
        success: false,
        error:
          'Informe o email e a senha.'
      };
    }

    /*
     * Supabase precisa estar configurado.
     */
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error:
          'O sistema de autenticação não está configurado. Contacte o administrador.'
      };
    }

    try {
      /*
       * LOGIN REAL NO SUPABASE
       */
      const supaRes =
        await loginWithSupabase(
          cleanEmail,
          password
        );

      /*
       * Login e perfil válidos.
       */
      if (
        supaRes.success &&
        supaRes.user
      ) {
        this.currentUser =
          supaRes.user;

        /*
         * Garantir que SUPERADMIN
         * trabalhe sempre com todas as lojas.
         */
        const role = normalizeRole(
          this.currentUser.role,
          this.currentUser.id
        );

        if (!role) {
          this.currentUser = null;

          localStorage.removeItem(
            AUTH_STORAGE_KEY
          );

          return {
            success: false,
            error:
              'A função deste utilizador é inválida. Contacte o administrador.'
          };
        }

        this.currentUser = {
          ...this.currentUser,
          role,
          storeId:
            role === 'SUPERADMIN'
              ? 'ALL'
              : (
                  this.currentUser.storeId ||
                  'store-001'
                )
        };

        /*
         * Não guardar sessão inválida.
         */
        if (
          this.currentUser.active === false
        ) {
          this.currentUser = null;

          localStorage.removeItem(
            AUTH_STORAGE_KEY
          );

          return {
            success: false,
            error:
              'Este utilizador está desativado. Contacte o administrador.'
          };
        }

        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify(
            this.currentUser
          )
        );

        this.notify();

        return {
          success: true,
          user: this.currentUser,
          fromSupabase: true
        };
      }

      /*
       * Perfil inexistente ou inválido.
       *
       * NÃO continuar para nenhum fallback.
       */
      if (supaRes.isProfileError) {
        this.currentUser = null;

        localStorage.removeItem(
          AUTH_STORAGE_KEY
        );

        return {
          success: false,
          error:
            supaRes.error ||
            'O perfil deste utilizador não está configurado corretamente.'
        };
      }

      /*
       * Erro de configuração do Supabase.
       */
      if (supaRes.isConfigError) {
        this.currentUser = null;

        localStorage.removeItem(
          AUTH_STORAGE_KEY
        );

        return {
          success: false,
          error:
            supaRes.error ||
            'Erro na configuração do sistema de autenticação.'
        };
      }

      /*
       * Qualquer outro erro de autenticação.
       */
      this.currentUser = null;

      localStorage.removeItem(
        AUTH_STORAGE_KEY
      );

      return {
        success: false,
        error:
          supaRes.error ||
          'Credenciais inválidas. Verifique o email e a senha.'
      };

    } catch (error) {
      console.error(
        'Erro no login Supabase:',
        error
      );

      this.currentUser = null;

      localStorage.removeItem(
        AUTH_STORAGE_KEY
      );

      return {
        success: false,
        error:
          'Não foi possível autenticar. Verifique as credenciais e a conexão com o servidor.'
      };
    }
  }

  /**
   * REGISTRO REAL NO SUPABASE
   */
  async signUp(
    email,
    password,
    fullName,
    role = 'CASHIER',
    storeId = 'store-001'
  ) {
    const cleanEmail =
      (email || '').trim();

    const cleanName =
      (fullName || '').trim();

    /*
     * Validação.
     */
    if (
      !cleanEmail ||
      !password ||
      !cleanName
    ) {
      return {
        success: false,
        error:
          'Preencha todos os campos obrigatórios.'
      };
    }

    /*
     * Normalizar função.
     */
    const normalizedRole =
      normalizeRole(role);

    if (!normalizedRole) {
      return {
        success: false,
        error:
          'Função de utilizador inválida.'
      };
    }

    /*
     * Supabase obrigatório.
     */
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error:
          'O sistema de autenticação não está configurado.'
      };
    }

    try {
      /*
       * REGISTRO REAL NO SUPABASE
       */
      const supaRes =
        await registerWithSupabase(
          cleanEmail,
          password,
          cleanName,
          normalizedRole,
          storeId
        );

      if (!supaRes.success) {
        return {
          success: false,
          error:
            supaRes.error ||
            'Não foi possível criar o utilizador.'
        };
      }

      /*
       * Não criar usuário local.
       *
       * O Supabase é a única fonte de autenticação.
       */
      if (supaRes.user) {
        const roleFromSupabase =
          normalizeRole(
            supaRes.user.role,
            supaRes.user.id
          );

        if (!roleFromSupabase) {
          return {
            success: false,
            error:
              'O utilizador foi criado, mas a função atribuída é inválida.'
          };
        }

        this.currentUser = {
          ...supaRes.user,
          role: roleFromSupabase,
          storeId:
            roleFromSupabase === 'SUPERADMIN'
              ? 'ALL'
              : (
                  supaRes.user.storeId ||
                  storeId
                )
        };

        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify(
            this.currentUser
          )
        );

        this.notify();

        return {
          success: true,
          user: this.currentUser,
          fromSupabase: true
        };
      }

      /*
       * Caso o Supabase tenha criado a conta,
       * mas não devolva uma sessão de usuário.
       */
      return {
        success: true,
        user: null,
        fromSupabase: true,
        message:
          'Utilizador criado com sucesso. Faça login para continuar.'
      };

    } catch (error) {
      console.error(
        'Erro ao registrar no Supabase:',
        error
      );

      return {
        success: false,
        error:
          'Não foi possível criar o utilizador. Verifique os dados e tente novamente.'
      };
    }
  }

  /**
   * Troca de loja.
   */
  switchActiveStore(storeId) {
    if (!this.currentUser) {
      return;
    }

    if (
      !canSwitchStores(
        this.currentUser
      )
    ) {
      console.warn(
        'Troca de loja não autorizada para esta função.'
      );

      return;
    }

    const stores =
      db.getStores();

    const assignedStore =
      stores.find(
        s => s.id === storeId
      );

    const storeName =
      storeId === 'ALL'
        ? 'Todas as Filiais (Consolidado)'
        : (
            assignedStore?.tradeName ||
            assignedStore?.name ||
            'Loja Ativa'
          );

    this.currentUser = {
      ...this.currentUser,
      storeId,
      storeName
    };

    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify(
        this.currentUser
      )
    );

    this.notify();
  }

  /**
   * Logout real.
   */
  async signOut() {
    try {
      await logoutWithSupabase();
    } catch (error) {
      console.warn(
        'Erro ao terminar sessão no Supabase:',
        error
      );
    }

    this.currentUser = null;

    localStorage.removeItem(
      AUTH_STORAGE_KEY
    );

    this.notify();
  }
}

export const auth =
  new AuthService();
