/**
 * GEF - GESTÃO FINANCEIRA | I18N & CURRENCY ENGINE
 * Suporte a múltiplos idiomas (Português, English) e moedas internacionais:
 * - Moçambique (MT - MZN)
 * - Angola (Kz - AOA)
 * - Brasil (R$ - BRL)
 * - RSA / África do Sul (R - ZAR)
 * - EUA (US$ - USD)
 */

const STORAGE_LANG_KEY = 'gef_language_v1';
const STORAGE_CURR_KEY = 'gef_currency_v1';

export const SUPPORTED_LANGUAGES = [
  { id: 'pt', name: 'Português', flag: '🇲🇿' },
  { id: 'en', name: 'English', flag: '🌐' }
];

export const SUPPORTED_CURRENCIES = [
  { id: 'MT', country: 'Moçambique', code: 'MZN', symbol: 'MT', locale: 'pt-MZ' },
  { id: 'Kz', country: 'Angola', code: 'AOA', symbol: 'Kz', locale: 'pt-AO' },
  { id: 'R$', country: 'Brasil', code: 'BRL', symbol: 'R$', locale: 'pt-BR' },
  { id: 'R', country: 'RSA (África do Sul)', code: 'ZAR', symbol: 'R', locale: 'en-ZA' },
  { id: '$', country: 'EUA (Dólar Americano)', code: 'USD', symbol: '$', locale: 'en-US' }
];

const TRANSLATIONS = {
  pt: {
    dashboard: 'Painel',
    pos: 'Frente de Caixa (PDV)',
    sales: 'Histórico de Vendas',
    quotes: 'Orçamentos',
    products: 'Produtos & Materiais',
    stock: 'Estoque & Kardex',
    losses: 'Perdas & Avarias',
    cash: 'Caixa & Fechamento',
    customers: 'Clientes & Fiado',
    deliveries: 'Entregas em Canteiro',
    reports: 'Relatórios & DRE',
    settings: 'Configurações',
    ambassadors: 'Portal Embaixadores',
    saas_monitor: 'Monitor SaaS Global',
    stores: 'Gestão de Filiais',
    operational: 'Operacional',
    open_cash: 'Caixa Aberto',
    closed_cash: 'Caixa Fechado',
    currency: 'Moeda',
    language: 'Idioma',
    charge: 'Cobrar',
    pay: 'Pagar',
    receive: 'Receber',
    total_debt: 'Dívida Pendente',
    credit_limit: 'Limite de Crédito',
    save: 'Salvar',
    cancel: 'Cancelar',
    whatsapp: 'WhatsApp',
    sms: 'SMS'
  },
  en: {
    dashboard: 'Dashboard',
    pos: 'Point of Sale (POS)',
    sales: 'Sales History',
    quotes: 'Quotes & Estimates',
    products: 'Products & Materials',
    stock: 'Inventory & Kardex',
    losses: 'Losses & Damages',
    cash: 'Cash Register & Shift',
    customers: 'Customers & Credit (Fiado)',
    deliveries: 'Site Deliveries',
    reports: 'Reports & P&L',
    settings: 'Settings',
    ambassadors: 'Ambassadors Portal',
    saas_monitor: 'Global SaaS Monitor',
    stores: 'Branches Management',
    operational: 'Operational',
    open_cash: 'Register Open',
    closed_cash: 'Register Closed',
    currency: 'Currency',
    language: 'Language',
    charge: 'Collect / Charge',
    pay: 'Pay',
    receive: 'Receive',
    total_debt: 'Outstanding Debt',
    credit_limit: 'Credit Limit',
    save: 'Save',
    cancel: 'Cancel',
    whatsapp: 'WhatsApp',
    sms: 'SMS'
  }
};

class I18nService {
  constructor() {
    this.currentLanguage = localStorage.getItem(STORAGE_LANG_KEY) || 'pt';
    this.currentCurrency = localStorage.getItem(STORAGE_CURR_KEY) || 'MT';
  }

  getLanguage() {
    return this.currentLanguage;
  }

  setLanguage(lang) {
    if (['pt', 'en'].includes(lang)) {
      this.currentLanguage = lang;
      localStorage.setItem(STORAGE_LANG_KEY, lang);
      window.dispatchEvent(new CustomEvent('gef_language_changed', { detail: lang }));
    }
  }

  getCurrency() {
    return this.currentCurrency;
  }

  getCurrencyObj() {
    return SUPPORTED_CURRENCIES.find(c => c.id === this.currentCurrency) || SUPPORTED_CURRENCIES[0];
  }

  setCurrency(currId) {
    const found = SUPPORTED_CURRENCIES.find(c => c.id === currId);
    if (found) {
      this.currentCurrency = found.id;
      localStorage.setItem(STORAGE_CURR_KEY, found.id);
      window.dispatchEvent(new CustomEvent('gef_currency_changed', { detail: found }));
    }
  }

  t(key, fallback = '') {
    const dict = TRANSLATIONS[this.currentLanguage] || TRANSLATIONS.pt;
    return dict[key] || fallback || key;
  }

  formatMoney(amount, overrideSymbol = null) {
    const num = Number(amount || 0);
    const curr = this.getCurrencyObj();
    const symbol = overrideSymbol || curr.symbol;
    const formatted = num.toLocaleString(curr.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${formatted} ${symbol}`;
  }
}

export const i18n = new I18nService();
