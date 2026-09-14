/**
 * GEF - GESTÃO FINANCEIRA
 * CORE DATABASE & BUSINESS ENGINE
 *
 * ARQUITETURA:
 * - Dados de negócio: Supabase/PostgreSQL
 * - Autenticação: Supabase Auth
 * - RLS: responsabilidade do PostgreSQL
 * - SEM localStorage para dados de negócio
 * - SUPERADMIN: store_id = NULL
 * - SUPERADMIN: acesso global às lojas
 * - UTILIZADOR NORMAL: limitado à sua store_id
 */

import * as SupabaseAuth from './supabase.js';
import i18n from './i18n.js';

/* ============================================================
   SUPABASE CLIENT
   ============================================================ */

const getClient = () =>
    SupabaseAuth.supabase ||
    SupabaseAuth.supabaseClient ||
    SupabaseAuth.client ||
    (
        typeof SupabaseAuth.getSupabaseClient === 'function'
            ? SupabaseAuth.getSupabaseClient()
            : null
    ) ||
    (
        typeof SupabaseAuth.getClient === 'function'
            ? SupabaseAuth.getClient()
            : null
    );

const ROLE = Object.freeze({
    SUPERADMIN: 'SUPERADMIN',
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    CASHIER: 'CASHIER',
    STOCK: 'STOCK',
    ACCOUNTANT: 'ACCOUNTANT'
});

const ALL_STORES = 'ALL';

/* ============================================================
   HELPERS
   ============================================================ */

const nowIso = () => new Date().toISOString();

function clean(value) {
    return value === undefined ? null : value;
}

function unwrap(result, operation = 'Operação Supabase') {
    if (!result) {
        throw new Error(`${operation}: resposta vazia.`);
    }

    if (result.error) {
        throw result.error;
    }

    return result.data;
}

function normalizeRole(role) {
    return String(role || '').trim().toUpperCase();
}

/* ============================================================
   MAPPERS
   Mantêm compatibilidade com nomes usados pelo frontend.
   ============================================================ */

function mapStore(row) {
    if (!row) return null;

    return {
        ...row,

        storeId: row.id,

        tradeName:
            row.trade_name ??
            row.tradeName,

        nuitNif:
            row.nuit_nif ??
            row.nuitNif,

        isHeadquarters:
            row.is_headquarters ??
            row.isHeadquarters,

        valorMensalidade:
            row.valor_mensalidade ??
            row.valorMensalidade,

        dataInicioTeste:
            row.data_inicio_teste ??
            row.dataInicioTeste,

        dataFimTeste:
            row.data_fim_teste ??
            row.dataFimTeste,

        acessoAtivo:
            row.acesso_ativo ??
            row.acessoAtivo,

        motivoBloqueio:
            row.motivo_bloqueio ??
            row.motivoBloqueio
    };
}

function mapProfile(row) {
    if (!row) return null;

    return {
        ...row,

        storeId: row.store_id,

        fullName: row.full_name,

        active: row.active !== false
    };
}

function mapProduct(row) {
    if (!row) return null;

    return {
        ...row,

        storeId: row.store_id,

        costPrice:
            Number(row.cost_price ?? 0),

        salePrice:
            Number(row.sale_price ?? 0),

        wholesalePrice:
            Number(row.wholesale_price ?? 0),

        minStock:
            Number(row.min_stock ?? 0),

        minStockAlert:
            Number(row.min_stock ?? 0),

        currentStock:
            Number(row.current_stock ?? 0),

        stockLoja:
            Number(row.stock_loja ?? 0),

        stockArmazem:
            Number(row.stock_armazem ?? 0),

        stockPatio:
            Number(row.stock_patio ?? 0),

        isFractional:
            !!row.is_fractional,

        stockByLocation: {
            loja: Number(row.stock_loja ?? 0),
            armazem: Number(row.stock_armazem ?? 0),
            patio: Number(row.stock_patio ?? 0)
        },

        active:
            row.active !== false
    };
}

function mapCustomer(row) {
    if (!row) return null;

    return {
        ...row,

        storeId: row.store_id,

        currentDebt:
            Number(row.current_debt ?? 0),

        creditLimit:
            Number(row.credit_limit ?? 0),

        subscriptionFee:
            Number(row.subscription_fee ?? 0),

        subscriptionEndDate:
            row.subscription_end_date
    };
}

function mapSupplier(row) {
    if (!row) return null;

    return {
        ...row,
        storeId: row.store_id
    };
}

function mapCashSession(row) {
    if (!row) return null;

    return {
        ...row,

        storeId: row.store_id,

        operatorId:
            row.operator_id,

        openingBalance:
            Number(row.opening_balance ?? 0),

        declaredCash:
            row.declared_cash == null
                ? null
                : Number(row.declared_cash),

        expectedCash:
            row.expected_cash == null
                ? null
                : Number(row.expected_cash),

        difference:
            row.difference == null
                ? null
                : Number(row.difference),

        isClosed:
            !!row.is_closed
    };
}

function mapSale(row) {
    if (!row) return null;

    return {
        ...row,

        storeId: row.store_id,

        customerId:
            row.customer_id,

        operatorId:
            row.operator_id,

        totalGross:
            Number(row.total_gross ?? 0),

        discount:
            Number(row.discount ?? 0),

        totalNet:
            Number(row.total_net ?? 0)
    };
}

function mapPurchase(row) {
    if (!row) return null;

    return {
        ...row,

        storeId:
            row.store_id,

        supplierId:
            row.supplier_id,

        total:
            Number(row.total ?? row.total_net ?? 0)
    };
}

function mapAmbassador(row) {
    if (!row) return null;

    return {
        ...row,

        userId:
            row.user_id,

        referralCode:
            row.referral_code,

        commissionRate:
            Number(row.commission_rate ?? 0),

        totalEarned:
            Number(row.total_earned ?? 0)
    };
}

/* ============================================================
   DATABASE
   ============================================================ */

class GefDatabase {

    constructor() {
        this.initialized = false;
        this._authUser = null;
        this._profile = null;

        /*
         * Isto é apenas preferência da interface.
         * NÃO é cache de dados.
         */
        this._currentStoreId = null;
    }

    /* ========================================================
       INITIALIZAÇÃO
       ======================================================== */

    async init() {

        const supabase = getClient();

        if (!supabase) {
            throw new Error(
                'Supabase não está disponível. Verifique o export do cliente em supabase.js.'
            );
        }

        const {
            data: { user } = {},
            error
        } = await supabase.auth.getUser();

        if (error) {
            throw error;
        }

        this._authUser = user || null;

        if (user) {

            const {
                data: profile,
                error: profileError
            } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) {
                throw profileError;
            }

            this._profile = mapProfile(profile);

            if (!this._profile) {
                throw new Error(
                    'Perfil do utilizador não encontrado.'
                );
            }

            if (this._profile.active === false) {
                throw new Error(
                    'Utilizador inativo.'
                );
            }

            const role = normalizeRole(
                this._profile.role
            );

            /*
             * REGRA CRÍTICA:
             * SUPERADMIN NÃO TEM LOJA.
             */
            if (role === ROLE.SUPERADMIN) {

                if (this._profile.storeId !== null) {

                    throw new Error(
                        'Configuração inválida: SUPERADMIN deve ter store_id = NULL.'
                    );
                }

            } else {

                if (!this._profile.storeId) {

                    throw new Error(
                        'Utilizador normal sem loja associada.'
                    );
                }
            }
        }

        this.initialized = true;

        return this;
    }

    async _ensureContext() {

        if (!this.initialized) {
            await this.init();
        }

        return {
            supabase: getClient(),
            user: this._authUser,
            profile: this._profile
        };
    }

    async refreshAuthContext() {

        this.initialized = false;
        this._authUser = null;
        this._profile = null;

        return this.init();
    }

    /* ========================================================
       UTILIZADOR
       ======================================================== */

    isSuperAdmin() {

        return (
            normalizeRole(this._profile?.role) ===
            ROLE.SUPERADMIN
        );
    }

    getCurrentUser() {

        if (!this._profile) {
            return null;
        }

        return {
            ...this._profile,

            id:
                this._profile.id,

            email:
                this._profile.email,

            fullName:
                this._profile.fullName,

            role:
                normalizeRole(this._profile.role),

            storeId:
                this._profile.storeId ?? null,

            supabaseAuth:
                true,

            active:
                this._profile.active !== false
        };
    }

    /* ========================================================
       LOJA ATUAL
       ======================================================== */

    getCurrentStoreId() {

        /*
         * SUPERADMIN pode trabalhar com todas as lojas.
         */
        if (this.isSuperAdmin()) {

            return (
                this._currentStoreId ||
                ALL_STORES
            );
        }

        /*
         * Utilizador normal NÃO escolhe outra loja.
         */
        return this._profile?.storeId || null;
    }

    setCurrentStoreId(storeId) {

        if (!this.isSuperAdmin()) {

            if (
                storeId !==
                this._profile?.storeId
            ) {
                throw new Error(
                    'Este utilizador não pode mudar de loja.'
                );
            }
        }

        this._currentStoreId =
            storeId || ALL_STORES;

        return this._currentStoreId;
    }

    async _assertStoreAccess(storeId) {

        const { profile } =
            await this._ensureContext();

        if (!storeId) {
            throw new Error(
                'store_id é obrigatório.'
            );
        }

        if (
            normalizeRole(profile?.role) ===
            ROLE.SUPERADMIN
        ) {
            return true;
        }

        const ownStore =
            profile?.store_id ??
            profile?.storeId;

        if (ownStore !== storeId) {

            throw new Error(
                'Acesso negado à loja selecionada.'
            );
        }

        return true;
    }

    /* ========================================================
       GENERIC HELPERS
       ======================================================== */

    async _single(
        table,
        id,
        columns = '*'
    ) {

        const { supabase } =
            await this._ensureContext();

        const {
            data,
            error
        } = await supabase
            .from(table)
            .select(columns)
            .eq('id', id)
            .maybeSingle();

        return unwrap(
            { data, error },
            `Leitura de ${table}`
        );
    }

    async _upsert(
        table,
        payload,
        options = {}
    ) {

        const { supabase } =
            await this._ensureContext();

        const {
            data,
            error
        } = await supabase
            .from(table)
            .upsert(payload, options)
            .select()
            .maybeSingle();

        return unwrap(
            { data, error },
            `Gravação de ${table}`
        );
    }

    async _delete(table, id) {

        const { supabase } =
            await this._ensureContext();

        const { error } =
            await supabase
                .from(table)
                .delete()
                .eq('id', id);

        if (error) {
            throw error;
        }

        return true;
    }

    /* ========================================================
       STORES
       ======================================================== */

    async getStores() {

        const {
            data,
            error
        } = await getClient()
            .from('stores')
            .select('*')
            .order('name');

        return (
            unwrap(
                { data, error },
                'Leitura de lojas'
            ) || []
        ).map(mapStore);
    }

    async getCurrentStore() {

        const id =
            this.getCurrentStoreId();

        if (id === ALL_STORES) {
            return null;
        }

        const row =
            await this._single(
                'stores',
                id
            );

        return mapStore(row);
    }

    async saveStore(store) {

        if (!this.isSuperAdmin()) {

            throw new Error(
                'Apenas SUPERADMIN pode gerir lojas.'
            );
        }

        const payload = {

            id:
                store.id ??
                store.storeId,

            code:
                store.code ?? null,

            name:
                store.name,

            trade_name:
                store.trade_name ??
                store.tradeName ??
                null,

            nuit_nif:
                store.nuit_nif ??
                store.nuitNif ??
                null,

            city:
                store.city ??
                'Maputo',

            province:
                store.province ??
                null,

            address:
                store.address ??
                null,

            phone:
                store.phone ??
                null,

            email:
                store.email ??
                null,

            currency:
                store.currency ??
                'MT',

            language:
                store.language ??
                'pt',

            is_headquarters:
                store.is_headquarters ??
                store.isHeadquarters ??
                false,

            valor_mensalidade:
                clean(
                    store.valor_mensalidade ??
                    store.valorMensalidade
                ),

            data_inicio_teste:
                clean(
                    store.data_inicio_teste ??
                    store.dataInicioTeste
                ),

            data_fim_teste:
                clean(
                    store.data_fim_teste ??
                    store.dataFimTeste
                ),

            acesso_ativo:
                store.acesso_ativo ??
                store.acessoAtivo ??
                true,

            motivo_bloqueio:
                store.motivo_bloqueio ??
                store.motivoBloqueio ??
                null
        };

        return mapStore(
            await this._upsert(
                'stores',
                payload
            )
        );
    }

    async deleteStore(storeId) {

        if (!this.isSuperAdmin()) {

            throw new Error(
                'Apenas SUPERADMIN pode eliminar lojas.'
            );
        }

        return this._delete(
            'stores',
            storeId
        );
    }

    async getConfig() {

        const store =
            await this.getCurrentStore();

        return store || {};
    }

    async saveConfig(config) {

        const current =
            await this.getCurrentStore();

        return this.saveStore({
            ...(current || {}),
            ...config
        });
    }

    /* ========================================================
       UNITS
       ======================================================== */

    async getUnits() {

        const {
            data,
            error
        } = await getClient()
            .from('units')
            .select('*')
            .order('name');

        return (
            unwrap(
                { data, error },
                'Leitura de unidades'
            ) || []
        );
    }

    /* ========================================================
       PRODUCTS
       ======================================================== */

    async getProducts(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('products')
                .select('*')
                .order('name');

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );

        } else if (
            !this.isSuperAdmin()
        ) {

            query =
                query.eq(
                    'store_id',
                    this._profile.storeId
                );
        }

        const {
            data,
            error
        } = await query;

        return (
            unwrap(
                { data, error },
                'Leitura de produtos'
            ) || []
        ).map(mapProduct);
    }

    async getProductById(productId) {

        return mapProduct(
            await this._single(
                'products',
                productId
            )
        );
    }

    async saveProduct(product) {

        const storeId =
            product.store_id ??
            product.storeId ??
            this.getCurrentStoreId();

        if (
            storeId === ALL_STORES ||
            !storeId
        ) {
            throw new Error(
                'Produto requer uma loja específica.'
            );
        }

        await this._assertStoreAccess(
            storeId
        );

        const stock =
            product.stockByLocation || {};

        const payload = {

            id:
                product.id,

            store_id:
                storeId,

            code:
                product.code ??
                null,

            barcode:
                product.barcode ??
                null,

            name:
                product.name,

            category:
                product.category ??
                null,

            unit:
                product.unit ??
                null,

            cost_price:
                Number(
                    product.cost_price ??
                    product.costPrice ??
                    0
                ),

            sale_price:
                Number(
                    product.sale_price ??
                    product.salePrice ??
                    0
                ),

            wholesale_price:
                Number(
                    product.wholesale_price ??
                    product.wholesalePrice ??
                    0
                ),

            min_stock:
                Number(
                    product.min_stock ??
                    product.minStock ??
                    product.minStockAlert ??
                    0
                ),

            current_stock:
                Number(
                    product.current_stock ??
                    product.currentStock ??
                    (
                        Number(
                            stock.loja ??
                            product.stockLoja ??
                            0
                        ) +
                        Number(
                            stock.armazem ??
                            product.stockArmazem ??
                            0
                        ) +
                        Number(
                            stock.patio ??
                            product.stockPatio ??
                            0
                        )
                    )
                ),

            stock_loja:
                Number(
                    product.stock_loja ??
                    product.stockLoja ??
                    stock.loja ??
                    0
                ),

            stock_armazem:
                Number(
                    product.stock_armazem ??
                    product.stockArmazem ??
                    stock.armazem ??
                    0
                ),

            stock_patio:
                Number(
                    product.stock_patio ??
                    product.stockPatio ??
                    stock.patio ??
                    0
                ),

            is_fractional:
                !!(
                    product.is_fractional ??
                    product.isFractional
                ),

            active:
                product.active !== false
        };

        return mapProduct(
            await this._upsert(
                'products',
                payload
            )
        );
    }

    async deleteProduct(productId) {

        return this._delete(
            'products',
            productId
        );
    }

    async getAllBatches(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('batches')
                .select('*');

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );
        }

        const {
            data,
            error
        } = await query.order(
            'expiry_date',
            {
                ascending: true,
                nullsFirst: false
            }
        );

        return unwrap(
            { data, error },
            'Leitura de lotes'
        ) || [];
    }

    /* ========================================================
       CUSTOMERS
       ======================================================== */

    async getCustomers(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('customers')
                .select('*')
                .order('name');

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );
        }

        const {
            data,
            error
        } = await query;

        return (
            unwrap(
                { data, error },
                'Leitura de clientes'
            ) || []
        ).map(mapCustomer);
    }

    async saveCustomer(customer) {

        const storeId =
            customer.store_id ??
            customer.storeId ??
            this.getCurrentStoreId();

        if (
            !storeId ||
            storeId === ALL_STORES
        ) {
            throw new Error(
                'Cliente requer uma loja específica.'
            );
        }

        await this._assertStoreAccess(
            storeId
        );

        const payload = {

            id:
                customer.id,

            store_id:
                storeId,

            name:
                customer.name,

            document:
                customer.document ??
                customer.taxId ??
                null,

            phone:
                customer.phone ??
                null,

            email:
                customer.email ??
                null,

            address:
                customer.address ??
                null,

            credit_limit:
                Number(
                    customer.credit_limit ??
                    customer.creditLimit ??
                    0
                ),

            current_debt:
                Number(
                    customer.current_debt ??
                    customer.currentDebt ??
                    0
                ),

            subscription_fee:
                Number(
                    customer.subscription_fee ??
                    customer.subscriptionFee ??
                    0
                ),

            subscription_end_date:
                customer.subscription_end_date ??
                customer.subscriptionEndDate ??
                null
        };

        return mapCustomer(
            await this._upsert(
                'customers',
                payload
            )
        );
    }

    async deleteCustomer(customerId) {

        return this._delete(
            'customers',
            customerId
        );
    }

    /* ========================================================
       SUPPLIERS
       ======================================================== */

    async getSuppliers(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('suppliers')
                .select('*')
                .order('name');

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );
        }

        const {
            data,
            error
        } = await query;

        return (
            unwrap(
                { data, error },
                'Leitura de fornecedores'
            ) || []
        ).map(mapSupplier);
    }

    async saveSupplier(supplier) {

        const storeId =
            supplier.store_id ??
            supplier.storeId ??
            this.getCurrentStoreId();

        if (
            !storeId ||
            storeId === ALL_STORES
        ) {
            throw new Error(
                'Fornecedor requer uma loja específica.'
            );
        }

        await this._assertStoreAccess(
            storeId
        );

        return mapSupplier(
            await this._upsert(
                'suppliers',
                {
                    id:
                        supplier.id,

                    store_id:
                        storeId,

                    name:
                        supplier.name,

                    document:
                        supplier.document ??
                        supplier.taxId ??
                        null,

                    phone:
                        supplier.phone ??
                        null,

                    email:
                        supplier.email ??
                        null,

                    address:
                        supplier.address ??
                        null,

                    active:
                        supplier.active !== false
                }
            )
        );
    }

    async deleteSupplier(supplierId) {

        return this._delete(
            'suppliers',
            supplierId
        );
    }

    /* ========================================================
       CASH
       ======================================================== */

    async getCashSessions(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('cash_sessions')
                .select('*')
                .order(
                    'opened_at',
                    {
                        ascending: false
                    }
                );

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );
        }

        const {
            data,
            error
        } = await query;

        return (
            unwrap(
                { data, error },
                'Leitura de sessões de caixa'
            ) || []
        ).map(mapCashSession);
    }

    async getActiveCashSession(
        storeId = this.getCurrentStoreId()
    ) {

        const sessions =
            await this.getCashSessions(
                storeId
            );

        return (
            sessions.find(
                session =>
                    !session.isClosed
            ) || null
        );
    }

    async openCashSession({
        storeId = this.getCurrentStoreId(),
        openingBalance = 0,
        notes = null
    } = {}) {

        if (
            !storeId ||
            storeId === ALL_STORES
        ) {
            throw new Error(
                'Selecione uma loja para abrir o caixa.'
            );
        }

        await this._assertStoreAccess(
            storeId
        );

        const existing =
            await this.getActiveCashSession(
                storeId
            );

        if (existing) {
            throw new Error(
                'Já existe um caixa aberto nesta loja.'
            );
        }

        const {
            data,
            error
        } = await getClient()
            .from('cash_sessions')
            .insert({
                id:
                    crypto.randomUUID(),

                store_id:
                    storeId,

                operator_id:
                    this._authUser?.id ??
                    null,

                opened_at:
                    nowIso(),

                opening_balance:
                    Number(
                        openingBalance || 0
                    ),

                is_closed:
                    false,

                notes
            })
            .select()
            .single();

        return mapCashSession(
            unwrap(
                { data, error },
                'Abertura de caixa'
            )
        );
    }

    async closeCashSession(
        sessionId,
        declaredCash,
        notes = null
    ) {

        const session =
            await this._single(
                'cash_sessions',
                sessionId
            );

        if (!session) {
            throw new Error(
                'Sessão de caixa não encontrada.'
            );
        }

        await this._assertStoreAccess(
            session.store_id
        );

        const {
            data,
            error
        } = await getClient()
            .from('cash_sessions')
            .update({
                closed_at:
                    nowIso(),

                declared_cash:
                    Number(
                        declaredCash || 0
                    ),

                is_closed:
                    true,

                notes
            })
            .eq(
                'id',
                sessionId
            )
            .select()
            .single();

        return mapCashSession(
            unwrap(
                { data, error },
                'Fecho de caixa'
            )
        );
    }

    async registerSangria(
        sessionId,
        amount,
        reason,
        notes = null
    ) {

        const session =
            await this._single(
                'cash_sessions',
                sessionId
            );

        if (!session) {
            throw new Error(
                'Sessão de caixa não encontrada.'
            );
        }

        await this._assertStoreAccess(
            session.store_id
        );

        const {
            data,
            error
        } = await getClient()
            .from('cash_movements')
            .insert({
                id:
                    crypto.randomUUID(),

                session_id:
                    sessionId,

                type:
                    'SANGRIA',

                amount:
                    Number(amount || 0),

                reason:
                    reason ?? null,

                notes,

                operator_id:
                    this._authUser?.id ??
                    null,

                created_at:
                    nowIso()
            })
            .select()
            .single();

        return unwrap(
            { data, error },
            'Registo de sangria'
        );
    }

    async getCashMovements(
        sessionId
    ) {

        const {
            data,
            error
        } = await getClient()
            .from('cash_movements')
            .select('*')
            .eq(
                'session_id',
                sessionId
            )
            .order(
                'created_at',
                {
                    ascending: false
                }
            );

        return unwrap(
            { data, error },
            'Leitura de movimentos de caixa'
        ) || [];
    }

    async addCashMovement(
        movement
    ) {

        const sessionId =
            movement.session_id ??
            movement.sessionId;

        const session =
            await this._single(
                'cash_sessions',
                sessionId
            );

        if (!session) {
            throw new Error(
                'Sessão de caixa não encontrada.'
            );
        }

        await this._assertStoreAccess(
            session.store_id
        );

        const {
            data,
            error
        } = await getClient()
            .from('cash_movements')
            .insert({
                id:
                    movement.id ??
                    crypto.randomUUID(),

                session_id:
                    sessionId,

                type:
                    movement.type,

                amount:
                    Number(
                        movement.amount || 0
                    ),

                reason:
                    movement.reason ??
                    null,

                notes:
                    movement.notes ??
                    null,

                operator_id:
                    movement.operator_id ??
                    movement.operatorId ??
                    this._authUser?.id ??
                    null,

                created_at:
                    movement.created_at ??
                    nowIso()
            })
            .select()
            .single();

        return unwrap(
            { data, error },
            'Movimento de caixa'
        );
    }

    /* ========================================================
       SALES
       ======================================================== */

    async getSales(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('sales')
                .select(
                    '*, sale_items(*)'
                )
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );
        }

        const {
            data,
            error
        } = await query;

        return (
            unwrap(
                { data, error },
                'Leitura de vendas'
            ) || []
        ).map(row => ({
            ...mapSale(row),
            items:
                row.sale_items || []
        }));
    }

    async processAtomicSale(
        saleData
    ) {

        const storeId =
            saleData.store_id ??
            saleData.storeId ??
            this.getCurrentStoreId();

        if (
            !storeId ||
            storeId === ALL_STORES
        ) {
            throw new Error(
                'Venda requer uma loja específica.'
            );
        }

        await this._assertStoreAccess(
            storeId
        );

        const items =
            (saleData.items || [])
                .map(item => ({
                    product_id:
                        item.product_id ??
                        item.productId,

                    quantity:
                        Number(
                            item.quantity || 0
                        ),

                    unit_price:
                        Number(
                            item.unit_price ??
                            item.unitPrice ??
                            0
                        ),

                    location:
                        item.location ??
                        'loja'
                }));

        if (!items.length) {
            throw new Error(
                'A venda não possui produtos.'
            );
        }

        const {
            data,
            error
        } = await getClient()
            .rpc(
                'process_atomic_sale',
                {
                    p_store_id:
                        storeId,

                    p_operator_id:
                        this._authUser?.id ??
                        null,

                    p_customer_id:
                        saleData.customer_id ??
                        saleData.customerId ??
                        null,

                    p_items:
                        items,

                    p_payment_method:
                        saleData.payment_method ??
                        saleData.paymentMethod ??
                        'CASH',

                    p_discount:
                        Number(
                            saleData.discount || 0
                        ),

                    p_extra_info:
                        saleData.extra_info ??
                        saleData.extraInfo ??
                        null
                }
            );

        return unwrap(
            { data, error },
            'Processamento atómico da venda'
        );
    }

    async processSale(
        saleData
    ) {

        const result =
            await this.processAtomicSale(
                saleData
            );

        return (
            result?.sale ??
            result
        );
    }

    async reverseSale(
        saleId,
        reason = null
    ) {

        const sale =
            await this._single(
                'sales',
                saleId
            );

        if (!sale) {
            throw new Error(
                'Venda não encontrada.'
            );
        }

        await this._assertStoreAccess(
            sale.store_id
        );

        const {
            data,
            error
        } = await getClient()
            .rpc(
                'reverse_sale',
                {
                    p_sale_id:
                        saleId,

                    p_reason:
                        reason,

                    p_operator_id:
                        this._authUser?.id ??
                        null
                }
            );

        return unwrap(
            { data, error },
            'Estorno da venda'
        );
    }

    async revertSale(
        saleId,
        reason = null
    ) {

        return this.reverseSale(
            saleId,
            reason
        );
    }

    /* ========================================================
       PURCHASES
       ======================================================== */

    async getPurchases(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('purchases')
                .select(
                    '*, purchase_items(*)'
                )
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );
        }

        const {
            data,
            error
        } = await query;

        return (
            unwrap(
                { data, error },
                'Leitura de compras'
            ) || []
        ).map(row => ({
            ...mapPurchase(row),
            items:
                row.purchase_items || []
        }));
    }

    async savePurchase(
        purchase
    ) {

        const storeId =
            purchase.store_id ??
            purchase.storeId ??
            this.getCurrentStoreId();

        if (
            !storeId ||
            storeId === ALL_STORES
        ) {
            throw new Error(
                'Compra requer uma loja específica.'
            );
        }

        await this._assertStoreAccess(
            storeId
        );

        const purchaseId =
            purchase.id ??
            crypto.randomUUID();

        const payload = {

            id:
                purchaseId,

            store_id:
                storeId,

            supplier_id:
                purchase.supplier_id ??
                purchase.supplierId ??
                null,

            invoice_number:
                purchase.invoice_number ??
                purchase.invoiceNumber ??
                null,

            total:
                Number(
                    purchase.total ??
                    purchase.totalNet ??
                    0
                ),

            status:
                purchase.status ??
                'COMPLETED',

            notes:
                purchase.notes ??
                null,

            created_at:
                purchase.created_at ??
                nowIso()
        };

        const {
            data,
            error
        } = await getClient()
            .from('purchases')
            .upsert(payload)
            .select()
            .single();

        const saved =
            unwrap(
                { data, error },
                'Gravação da compra'
            );

        if (
            Array.isArray(
                purchase.items
            ) &&
            purchase.items.length
        ) {

            const rows =
                purchase.items.map(
                    item => ({
                        id:
                            item.id ??
                            crypto.randomUUID(),

                        purchase_id:
                            purchaseId,

                        product_id:
                            item.product_id ??
                            item.productId,

                        quantity:
                            Number(
                                item.quantity || 0
                            ),

                        unit_cost:
                            Number(
                                item.unit_cost ??
                                item.unitCost ??
                                item.costPrice ??
                                0
                            ),

                        total_cost:
                            Number(
                                item.total_cost ??
                                item.totalCost ??
                                0
                            ),

                        batch_id:
                            item.batch_id ??
                            item.batchId ??
                            null
                    })
                );

            const {
                error: itemError
            } = await getClient()
                .from('purchase_items')
                .upsert(rows);

            if (itemError) {
                throw itemError;
            }
        }

        return mapPurchase(saved);
    }

    /* ========================================================
       LOSSES
       ======================================================== */

    async getLosses(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('losses')
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );
        }

        const {
            data,
            error
        } = await query;

        return unwrap(
            { data, error },
            'Leitura de perdas'
        ) || [];
    }

    async registerLoss(
        loss
    ) {

        const storeId =
            loss.store_id ??
            loss.storeId ??
            this.getCurrentStoreId();

        if (
            !storeId ||
            storeId === ALL_STORES
        ) {
            throw new Error(
                'Perda requer uma loja específica.'
            );
        }

        await this._assertStoreAccess(
            storeId
        );

        const {
            data,
            error
        } = await getClient()
            .from('losses')
            .insert({
                id:
                    loss.id ??
                    crypto.randomUUID(),

                store_id:
                    storeId,

                product_id:
                    loss.product_id ??
                    loss.productId,

                quantity:
                    Number(
                        loss.quantity || 0
                    ),

                reason:
                    loss.reason ??
                    null,

                location:
                    loss.location ??
                    'loja',

                operator_id:
                    this._authUser?.id ??
                    null,

                notes:
                    loss.notes ??
                    null,

                created_at:
                    loss.created_at ??
                    nowIso()
            })
            .select()
            .single();

        return unwrap(
            { data, error },
            'Registo de perda'
        );
    }

    /* ========================================================
       QUOTES
       ======================================================== */

    async getQuotes(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('quotes')
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );
        }

        const {
            data,
            error
        } = await query;

        return unwrap(
            { data, error },
            'Leitura de orçamentos'
        ) || [];
    }

    async saveQuote(
        quote
    ) {

        const storeId =
            quote.store_id ??
            quote.storeId ??
            this.getCurrentStoreId();

        if (
            !storeId ||
            storeId === ALL_STORES
        ) {
            throw new Error(
                'Orçamento requer uma loja específica.'
            );
        }

        await this._assertStoreAccess(
            storeId
        );

        return this._upsert(
            'quotes',
            {
                ...quote,

                id:
                    quote.id ??
                    crypto.randomUUID(),

                store_id:
                    storeId
            }
        );
    }

    async deleteQuote(id) {

        return this._delete(
            'quotes',
            id
        );
    }

    /* ========================================================
       DELIVERIES
       ======================================================== */

    async getDeliveries(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('deliveries')
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );
        }

        const {
            data,
            error
        } = await query;

        return unwrap(
            { data, error },
            'Leitura de entregas'
        ) || [];
    }

    async saveDelivery(
        delivery
    ) {

        const storeId =
            delivery.store_id ??
            delivery.storeId ??
            this.getCurrentStoreId();

        if (
            !storeId ||
            storeId === ALL_STORES
        ) {
            throw new Error(
                'Entrega requer uma loja específica.'
            );
        }

        await this._assertStoreAccess(
            storeId
        );

        return this._upsert(
            'deliveries',
            {
                ...delivery,

                id:
                    delivery.id ??
                    crypto.randomUUID(),

                store_id:
                    storeId
            }
        );
    }

    async deleteDelivery(id) {

        return this._delete(
            'deliveries',
            id
        );
    }

    /* ========================================================
       TRANSFERS
       ======================================================== */

    async getTransfers(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('transfers')
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.or(
                    `from_store_id.eq.${storeId},to_store_id.eq.${storeId}`
                );
        }

        const {
            data,
            error
        } = await query;

        return unwrap(
            { data, error },
            'Leitura de transferências'
        ) || [];
    }

    async saveTransfer(
        transfer
    ) {

        const fromStore =
            transfer.from_store_id ??
            transfer.fromStoreId;

        const toStore =
            transfer.to_store_id ??
            transfer.toStoreId;

        await this._assertStoreAccess(
            fromStore
        );

        await this._assertStoreAccess(
            toStore
        );

        return this._upsert(
            'transfers',
            {
                ...transfer,

                id:
                    transfer.id ??
                    crypto.randomUUID(),

                from_store_id:
                    fromStore,

                to_store_id:
                    toStore
            }
        );
    }

    async transferStock({
        fromStoreId,
        toStoreId,
        productId,
        quantity,
        location = 'loja',
        notes = null
    }) {

        await this._assertStoreAccess(
            fromStoreId
        );

        await this._assertStoreAccess(
            toStoreId
        );

        const {
            data,
            error
        } = await getClient()
            .rpc(
                'transfer_stock',
                {
                    p_from_store_id:
                        fromStoreId,

                    p_to_store_id:
                        toStoreId,

                    p_product_id:
                        productId,

                    p_quantity:
                        Number(quantity),

                    p_location:
                        location,

                    p_operator_id:
                        this._authUser?.id ??
                        null,

                    p_notes:
                        notes
                }
            );

        return unwrap(
            { data, error },
            'Transferência de stock'
        );
    }

    /* ========================================================
       CUSTOMER CREDIT
       ======================================================== */

    async getCustomerCreditHistory(
        customerId
    ) {

        const {
            data,
            error
        } = await getClient()
            .from('credit_txs')
            .select('*')
            .eq(
                'customer_id',
                customerId
            )
            .order(
                'created_at',
                {
                    ascending: false
                }
            );

        return unwrap(
            { data, error },
            'Histórico de crédito'
        ) || [];
    }

    async registerCustomerPayment({
        customerId,
        amount,
        paymentMethod = 'CASH',
        notes = null
    }) {

        const customer =
            await this._single(
                'customers',
                customerId
            );

        if (!customer) {
            throw new Error(
                'Cliente não encontrado.'
            );
        }

        await this._assertStoreAccess(
            customer.store_id
        );

        const {
            data,
            error
        } = await getClient()
            .rpc(
                'register_customer_payment',
                {
                    p_customer_id:
                        customerId,

                    p_amount:
                        Number(amount),

                    p_payment_method:
                        paymentMethod,

                    p_operator_id:
                        this._authUser?.id ??
                        null,

                    p_notes:
                        notes
                }
            );

        return unwrap(
            { data, error },
            'Pagamento de cliente'
        );
    }

    /* ========================================================
       AMBASSADORS
       ======================================================== */

    async getAmbassadors() {

        const {
            data,
            error
        } = await getClient()
            .from('ambassadors')
            .select('*')
            .order('name');

        return (
            unwrap(
                { data, error },
                'Leitura de embaixadores'
            ) || []
        ).map(mapAmbassador);
    }

    async saveAmbassador(
        ambassador
    ) {

        if (!this.isSuperAdmin()) {

            throw new Error(
                'Apenas SUPERADMIN pode gerir embaixadores.'
            );
        }

        return mapAmbassador(
            await this._upsert(
                'ambassadors',
                {
                    id:
                        ambassador.id ??
                        crypto.randomUUID(),

                    user_id:
                        ambassador.user_id ??
                        ambassador.userId ??
                        null,

                    name:
                        ambassador.name,

                    phone:
                        ambassador.phone ??
                        null,

                    pix_mpesa:
                        ambassador.pix_mpesa ??
                        ambassador.pixMpesa ??
                        null,

                    referral_code:
                        ambassador.referral_code ??
                        ambassador.referralCode ??
                        null,

                    commission_rate:
                        Number(
                            ambassador.commission_rate ??
                            ambassador.commissionRate ??
                            10
                        ),

                    total_earned:
                        Number(
                            ambassador.total_earned ??
                            ambassador.totalEarned ??
                            0
                        ),

                    active:
                        ambassador.active !== false
                }
            )
        );
    }

    async addAmbassadorReferredStore(
        ambassadorStore
    ) {

        if (!this.isSuperAdmin()) {

            throw new Error(
                'Apenas SUPERADMIN pode gerir referências.'
            );
        }

        return this._upsert(
            'ambassador_stores',
            {
                id:
                    ambassadorStore.id ??
                    crypto.randomUUID(),

                ambassador_id:
                    ambassadorStore.ambassador_id ??
                    ambassadorStore.ambassadorId,

                store_id:
                    ambassadorStore.store_id ??
                    ambassadorStore.storeId,

                referral_code:
                    ambassadorStore.referral_code ??
                    ambassadorStore.referralCode ??
                    null,

                created_at:
                    ambassadorStore.created_at ??
                    nowIso()
            }
        );
    }

    async payAmbassadorCommission(
        ambassadorId,
        amount = null,
        notes = null
    ) {

        if (!this.isSuperAdmin()) {

            throw new Error(
                'Apenas SUPERADMIN pode pagar comissões.'
            );
        }

        const {
            data,
            error
        } = await getClient()
            .from('ambassador_payouts')
            .insert({
                id:
                    crypto.randomUUID(),

                ambassador_id:
                    ambassadorId,

                amount:
                    amount == null
                        ? 0
                        : Number(amount),

                notes,

                paid_at:
                    nowIso(),

                paid_by:
                    this._authUser?.id ??
                    null
            })
            .select()
            .single();

        return unwrap(
            { data, error },
            'Pagamento de comissão'
        );
    }

    /* ========================================================
       SAAS
       ======================================================== */

    async checkStoreLock(
        storeId = this.getCurrentStoreId()
    ) {

        if (
            !storeId ||
            storeId === ALL_STORES
        ) {
            return {
                locked: false
            };
        }

        const store =
            mapStore(
                await this._single(
                    'stores',
                    storeId
                )
            );

        if (!store) {

            return {
                locked: true,
                reason: 'STORE_NOT_FOUND'
            };
        }

        if (
            store.acessoAtivo === false
        ) {

            return {
                locked: true,

                reason:
                    store.motivoBloqueio ||
                    'STORE_BLOCKED',

                store
            };
        }

        const end =
            store.dataFimTeste;

        if (
            end &&
            new Date(end).getTime() <
            Date.now()
        ) {

            return {
                locked: true,

                reason:
                    'SUBSCRIPTION_EXPIRED',

                store
            };
        }

        return {
            locked: false,
            store
        };
    }

    async updateStoreSaas(
        storeId,
        values
    ) {

        if (!this.isSuperAdmin()) {

            throw new Error(
                'Apenas SUPERADMIN pode alterar SaaS.'
            );
        }

        const payload = {

            valor_mensalidade:
                values.valor_mensalidade ??
                values.valorMensalidade,

            data_inicio_teste:
                values.data_inicio_teste ??
                values.dataInicioTeste,

            data_fim_teste:
                values.data_fim_teste ??
                values.dataFimTeste,

            acesso_ativo:
                values.acesso_ativo ??
                values.acessoAtivo,

            motivo_bloqueio:
                values.motivo_bloqueio ??
                values.motivoBloqueio ??
                null
        };

        const {
            data,
            error
        } = await getClient()
            .from('stores')
            .update(payload)
            .eq(
                'id',
                storeId
            )
            .select()
            .single();

        return mapStore(
            unwrap(
                { data, error },
                'Atualização SaaS'
            )
        );
    }

    async toggleStoreAccess(
        storeId,
        active,
        reason = null
    ) {

        return this.updateStoreSaas(
            storeId,
            {
                acessoAtivo:
                    !!active,

                motivoBloqueio:
                    active
                        ? null
                        : reason
            }
        );
    }

    async renewStoreSubscription(
        storeId,
        endDate
    ) {

        return this.updateStoreSaas(
            storeId,
            {
                dataFimTeste:
                    endDate,

                acessoAtivo:
                    true,

                motivoBloqueio:
                    null
            }
        );
    }

    async setStoreExpirationDate(
        storeId,
        endDate
    ) {

        return this.updateStoreSaas(
            storeId,
            {
                dataFimTeste:
                    endDate
            }
        );
    }

    /*
     * SEGURANÇA:
     *
     * Não existe master code no frontend.
     * Não colocar códigos secretos neste arquivo.
     */
    async unlockWithMasterCode() {

        throw new Error(
            'Desbloqueio por master code no frontend foi removido por segurança. ' +
            'O desbloqueio administrativo deve ser feito no Supabase.'
        );
    }

    /* ========================================================
       DASHBOARD
       ======================================================== */

    async getDashboardStats(
        storeId = this.getCurrentStoreId()
    ) {

        const [
            products,
            sales,
            customers,
            sessions
        ] = await Promise.all([
            this.getProducts(storeId),
            this.getSales(storeId),
            this.getCustomers(storeId),
            this.getCashSessions(storeId)
        ]);

        const today =
            new Date()
                .toISOString()
                .slice(0, 10);

        const todaySales =
            sales.filter(
                sale =>
                    String(
                        sale.created_at || ''
                    ).slice(0, 10) === today
            );

        const salesTotal =
            todaySales
                .filter(
                    sale =>
                        String(
                            sale.status || ''
                        ).toUpperCase() !==
                        'REVERSED'
                )
                .reduce(
                    (sum, sale) =>
                        sum +
                        Number(
                            sale.totalNet || 0
                        ),
                    0
                );

        const lowStock =
            products.filter(
                product =>
                    Number(
                        product.currentStock || 0
                    ) <=
                    Number(
                        product.minStockAlert || 0
                    )
            );

        const debt =
            customers.reduce(
                (sum, customer) =>
                    sum +
                    Number(
                        customer.currentDebt || 0
                    ),
                0
            );

        return {

            totalProducts:
                products.length,

            totalCustomers:
                customers.length,

            totalSalesToday:
                todaySales.length,

            salesToday:
                salesTotal,

            lowStockCount:
                lowStock.length,

            lowStockProducts:
                lowStock,

            totalCustomerDebt:
                debt,

            activeCashSessions:
                sessions.filter(
                    session =>
                        !session.isClosed
                ).length
        };
    }

    /* ========================================================
       AUDIT
       ======================================================== */

    async getAuditLogs(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('audit_logs')
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );
        }

        const {
            data,
            error
        } = await query;

        return unwrap(
            { data, error },
            'Leitura de auditoria'
        ) || [];
    }

    async addAuditLog(
        log
    ) {

        const storeId =
            log.store_id ??
            log.storeId ??
            null;

        if (storeId) {

            await this._assertStoreAccess(
                storeId
            );
        }

        const {
            data,
            error
        } = await getClient()
            .from('audit_logs')
            .insert({
                id:
                    log.id ??
                    crypto.randomUUID(),

                store_id:
                    storeId,

                user_id:
                    log.user_id ??
                    log.userId ??
                    this._authUser?.id ??
                    null,

                action:
                    log.action,

                entity_type:
                    log.entity_type ??
                    log.entityType ??
                    null,

                entity_id:
                    log.entity_id ??
                    log.entityId ??
                    null,

                old_data:
                    log.old_data ??
                    log.oldData ??
                    null,

                new_data:
                    log.new_data ??
                    log.newData ??
                    null,

                metadata:
                    log.metadata ??
                    null,

                created_at:
                    log.created_at ??
                    nowIso()
            })
            .select()
            .single();

        return unwrap(
            { data, error },
            'Auditoria'
        );
    }

    /* ========================================================
       INVENTORIES
       ======================================================== */

    async getInventories(
        storeId = this.getCurrentStoreId()
    ) {

        const { supabase } =
            await this._ensureContext();

        let query =
            supabase
                .from('inventories')
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );

        if (
            storeId &&
            storeId !== ALL_STORES
        ) {

            await this._assertStoreAccess(
                storeId
            );

            query =
                query.eq(
                    'store_id',
                    storeId
                );
        }

        const {
            data,
            error
        } = await query;

        return unwrap(
            { data, error },
            'Leitura de inventários'
        ) || [];
    }

    async saveInventoryAudit(
        inventory
    ) {

        const storeId =
            inventory.store_id ??
            inventory.storeId ??
            this.getCurrentStoreId();

        if (
            !storeId ||
            storeId === ALL_STORES
        ) {
            throw new Error(
                'Inventário requer uma loja específica.'
            );
        }

        await this._assertStoreAccess(
            storeId
        );

        return this._upsert(
            'inventories',
            {
                ...inventory,

                id:
                    inventory.id ??
                    crypto.randomUUID(),

                store_id:
                    storeId,

                operator_id:
                    inventory.operator_id ??
                    inventory.operatorId ??
                    this._authUser?.id ??
                    null
            }
        );
    }
}

/* ============================================================
   EXPORTS
   ============================================================ */

const db =
    new GefDatabase();

export {
    GefDatabase,
    db,
    ROLE,
    ALL_STORES
};

export default db;
