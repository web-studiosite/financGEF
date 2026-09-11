-- ==============================================================================
-- GEF - GESTÃO FINANCEIRA | SCHEMA SQL & RLS SUPABASE ROBUSTO
-- Compatível com PostgreSQL / Supabase
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE FILIAIS / LOJAS (STORES) & LICENCIAMENTO SAAS
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    trade_name TEXT,
    nuit_nif TEXT,
    city TEXT DEFAULT 'Maputo',
    province TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    currency TEXT DEFAULT 'MT', -- Suporte: MT (Moçambique), Kz (Angola), R$ (Brasil), R (RSA), $ (EUA)
    language TEXT DEFAULT 'pt', -- Suporte: pt (Português), en (English)
    is_headquarters BOOLEAN DEFAULT FALSE,
    valor_mensalidade NUMERIC(12, 2) DEFAULT 4500.00, -- Valor manual de mensalidade da filial
    data_inicio_teste TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_fim_teste DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'), -- Vencimento da subscrição
    acesso_ativo BOOLEAN DEFAULT TRUE,
    motivo_bloqueio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PERFIS DE USUÁRIO (PROFILES) SINCRONIZADOS COM AUTH.USERS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SUPERADMIN', 'ADMIN', 'GERENTE', 'CASHIER', 'ESTOQUISTA', 'EMBAIXADOR')),
    store_id TEXT REFERENCES public.stores(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CLIENTES, CRÉDITO (FIADO) E SUBSCRIÇÃO / MENSALIDADE
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    document TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    credit_limit NUMERIC(12, 2) DEFAULT 0.00,
    current_debt NUMERIC(12, 2) DEFAULT 0.00,
    -- Mensalidade manual do cliente e vencimento:
    subscription_fee NUMERIC(12, 2) DEFAULT NULL,
    subscription_end_date DATE DEFAULT NULL,
    is_subscription_active BOOLEAN GENERATED ALWAYS AS (
        subscription_end_date IS NULL OR subscription_end_date >= CURRENT_DATE
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. PRODUTOS & MATERIAIS DE CONSTRUÇÃO
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT DEFAULT 'UN',
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(12, 2),
    min_stock NUMERIC(12, 2) DEFAULT 5.00,
    current_stock NUMERIC(12, 2) DEFAULT 0.00,
    stock_loja NUMERIC(12, 2) DEFAULT 0.00,
    stock_armazem NUMERIC(12, 2) DEFAULT 0.00,
    stock_patio NUMERIC(12, 2) DEFAULT 0.00,
    is_fractional BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. VENDAS (SALES)
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    total_gross NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total_net NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('DINHEIRO', 'M-PESA', 'E-MOLA', 'POS_CARTAO', 'TRANSFERENCIA', 'A_PRAZO', 'FIADO', 'MULTIPLE')),
    status TEXT NOT NULL DEFAULT 'CONCLUIDA' CHECK (status IN ('CONCLUIDA', 'CANCELADA', 'PENDENTE')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ITENS DA VENDA (SALE ITEMS)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 3) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    location TEXT DEFAULT 'LOJA' CHECK (location IN ('LOJA', 'ARMAZEM', 'PATIO'))
);

-- 8. FECHAMENTO CEGO & SESSÕES DE CAIXA
CREATE TABLE IF NOT EXISTS public.cash_sessions (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_balance NUMERIC(12, 2) DEFAULT 0.00,
    declared_cash NUMERIC(12, 2),
    expected_cash NUMERIC(12, 2),
    difference NUMERIC(12, 2),
    is_closed BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- 9. PROGRAMA DE EMBAIXADORES & COMISSÕES
CREATE TABLE IF NOT EXISTS public.ambassadors (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    pix_mpesa TEXT NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    commission_rate NUMERIC(5, 2) DEFAULT 10.00,
    total_earned NUMERIC(12, 2) DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 10. FUNÇÕES AUXILIARES & VERIFICAÇÃO DE ASSINATURA / TRAVA RLS
-- ==============================================================================

-- Função para verificar se a loja está liberada ou se a subscrição expirou
CREATE OR REPLACE FUNCTION public.fn_is_store_unlocked(check_store_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    store_record RECORD;
BEGIN
    SELECT acesso_ativo, data_fim_teste INTO store_record
    FROM public.stores
    WHERE id = check_store_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Se marcado como inativo ou se a data de fim já foi atingida (<= CURRENT_DATE)
    IF store_record.acesso_ativo = FALSE OR store_record.data_fim_teste < CURRENT_DATE THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) ROBUSTO
-- ==============================================================================

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

-- Helper para recuperar a role do usuário logado
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Helper para recuperar a loja do usuário logado
CREATE OR REPLACE FUNCTION public.get_auth_user_store_id()
RETURNS TEXT AS $$
    SELECT store_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- POLÍTICAS: STORES
-- Superadmin tem acesso total
CREATE POLICY "Superadmin tem acesso irrestrito a stores"
ON public.stores FOR ALL
TO authenticated
USING (public.get_auth_user_role() = 'SUPERADMIN')
WITH CHECK (public.get_auth_user_role() = 'SUPERADMIN');

-- Usuários comuns podem visualizar apenas sua loja
CREATE POLICY "Usuários podem ver a própria loja"
ON public.stores FOR SELECT
TO authenticated
USING (id = public.get_auth_user_store_id() OR public.get_auth_user_role() = 'SUPERADMIN');

-- POLÍTICAS: PROFILES
CREATE POLICY "Superadmin gerencia todos os perfis"
ON public.profiles FOR ALL
TO authenticated
USING (public.get_auth_user_role() = 'SUPERADMIN');

CREATE POLICY "Usuários visualizam perfis de sua própria loja"
ON public.profiles FOR SELECT
TO authenticated
USING (store_id = public.get_auth_user_store_id() OR id = auth.uid());

-- POLÍTICAS: PRODUCTS
-- Leitura permitida para a própria loja
CREATE POLICY "Leitura de produtos da filial"
ON public.products FOR SELECT
TO authenticated
USING (store_id = public.get_auth_user_store_id() OR public.get_auth_user_role() = 'SUPERADMIN');

-- Modificação SOMENTE se a loja NÃO estiver com a trava RLS ativada (Subscrição Válida)
CREATE POLICY "Modificação de produtos sujeita à trava de subscrição ativa"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
    (public.get_auth_user_role() = 'SUPERADMIN') OR
    (store_id = public.get_auth_user_store_id() AND public.fn_is_store_unlocked(store_id) = TRUE)
);

CREATE POLICY "Atualização de produtos sujeita à trava de subscrição ativa"
ON public.products FOR UPDATE
TO authenticated
USING (
    (public.get_auth_user_role() = 'SUPERADMIN') OR
    (store_id = public.get_auth_user_store_id() AND public.fn_is_store_unlocked(store_id) = TRUE)
);

-- POLÍTICAS: SALES & SALE ITEMS (TRAVA RLS AUTOMÁTICA NO VENCIMENTO)
CREATE POLICY "Leitura de vendas da própria loja"
ON public.sales FOR SELECT
TO authenticated
USING (store_id = public.get_auth_user_store_id() OR public.get_auth_user_role() = 'SUPERADMIN');

-- CRÍTICO: Novas vendas só podem ser criadas se a loja estiver em dia (fn_is_store_unlocked = TRUE)
CREATE POLICY "Vendas bloqueadas automaticamente se a assinatura estiver vencida"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (
    (public.get_auth_user_role() = 'SUPERADMIN') OR
    (store_id = public.get_auth_user_store_id() AND public.fn_is_store_unlocked(store_id) = TRUE)
);

CREATE POLICY "Leitura de itens da venda"
ON public.sale_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sales s 
        WHERE s.id = sale_items.sale_id 
        AND (s.store_id = public.get_auth_user_store_id() OR public.get_auth_user_role() = 'SUPERADMIN')
    )
);

CREATE POLICY "Inserção de itens sujeita à validade da assinatura"
ON public.sale_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sales s 
        WHERE s.id = sale_items.sale_id 
        AND (s.store_id = public.get_auth_user_store_id() OR public.get_auth_user_role() = 'SUPERADMIN')
        AND (public.get_auth_user_role() = 'SUPERADMIN' OR public.fn_is_store_unlocked(s.store_id) = TRUE)
    )
);

-- POLÍTICAS: CUSTOMERS & FIADO
CREATE POLICY "Acesso aos clientes da loja"
ON public.customers FOR ALL
TO authenticated
USING (store_id = public.get_auth_user_store_id() OR public.get_auth_user_role() = 'SUPERADMIN')
WITH CHECK (store_id = public.get_auth_user_store_id() OR public.get_auth_user_role() = 'SUPERADMIN');

-- POLÍTICAS: SESSÕES DE CAIXA
CREATE POLICY "Controle de caixa por filial"
ON public.cash_sessions FOR ALL
TO authenticated
USING (store_id = public.get_auth_user_store_id() OR public.get_auth_user_role() = 'SUPERADMIN')
WITH CHECK (store_id = public.get_auth_user_store_id() OR public.get_auth_user_role() = 'SUPERADMIN');

-- ==============================================================================
-- 12. VIEWS DE LEMBRETE DE RENOVAÇÃO (5 DIAS ANTES DE EXPIRAR)
-- ==============================================================================

-- Visão para monitorar lojas com subscrição vencendo em 5 dias ou menos:
CREATE OR REPLACE VIEW public.vw_stores_renewal_reminders AS
SELECT 
    id,
    code,
    name,
    phone,
    email,
    valor_mensalidade,
    data_fim_teste,
    (data_fim_teste - CURRENT_DATE) AS dias_restantes,
    CASE 
        WHEN data_fim_teste < CURRENT_DATE THEN 'EXPIRADO_TRAVADO'
        WHEN (data_fim_teste - CURRENT_DATE) <= 5 THEN 'AVISO_5_DIAS'
        ELSE 'REGULAR'
    END AS status_alerta
FROM public.stores
WHERE data_fim_teste - CURRENT_DATE <= 5;

-- Visão para monitorar clientes com mensalidade vencendo em 5 dias ou menos:
CREATE OR REPLACE VIEW public.vw_customers_renewal_reminders AS
SELECT 
    id,
    store_id,
    name,
    phone,
    subscription_fee,
    subscription_end_date,
    (subscription_end_date - CURRENT_DATE) AS dias_restantes,
    current_debt,
    CASE 
        WHEN subscription_end_date < CURRENT_DATE THEN 'MENSALIDADE_VENCIDA'
        WHEN (subscription_end_date - CURRENT_DATE) <= 5 THEN 'AVISO_5_DIAS'
        ELSE 'REGULAR'
    END AS status_renovacao
FROM public.customers
WHERE subscription_end_date IS NOT NULL 
  AND (subscription_end_date - CURRENT_DATE) <= 5;

-- ==============================================================================
-- 13. TRIGGER DE SINCRONIZAÇÃO AUTOMÁTICA DE AUTH.USERS COM PROFILES
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, store_id, active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'CASHIER'),
        COALESCE(NEW.raw_user_meta_data->>'store_id', 'store-001'),
        TRUE
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        store_id = EXCLUDED.store_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 14. SEED INICIAL DE LOJAS
-- ==============================================================================
INSERT INTO public.stores (id, code, name, trade_name, nuit_nif, city, currency, is_headquarters, valor_mensalidade, data_fim_teste, acesso_ativo)
VALUES 
('store-001', 'LOJA-01', 'GEF - Ferragens & Materiais Matriz', 'GEF Ferragens Matriz', '400192837', 'Maputo', 'MT', TRUE, 5500.00, CURRENT_DATE + INTERVAL '30 days', TRUE),
('store-002', 'LOJA-02', 'GEF - Unidade Matola Canteiro', 'GEF Matola', '400192838', 'Matola', 'MT', FALSE, 4500.00, CURRENT_DATE + INTERVAL '30 days', TRUE)
ON CONFLICT (id) DO NOTHING;
