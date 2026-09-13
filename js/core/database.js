/**
 * GEF - GESTÃO FINANCEIRA | CORE DATABASE & BUSINESS ENGINE
 * JavaScript Puro (Vanilla JS)
 * Implementação completa de FEFO, Vendas Atômicas, Multi-Loja, Trava SaaS e Auditoria
 */

import { i18n } from './i18n.js';

const STORAGE_KEYS = {
  STORES: 'gef_stores_v2',
  PROFILES: 'gef_profiles_v2',
  UNITS: 'gef_units_v2',
  PRODUCTS: 'gef_products_v2',
  PACKAGES: 'gef_packages_v2',
  BATCHES: 'gef_batches_v2',
  SUPPLIERS: 'gef_suppliers_v2',
  PURCHASES: 'gef_purchases_v2',
  PURCHASE_ITEMS: 'gef_purchase_items_v2',
  STOCK_MOVEMENTS: 'gef_stock_movements_v2',
  CASH_REGISTERS: 'gef_cash_registers_v2',
  CASH_SESSIONS: 'gef_cash_sessions_v2',
  CASH_MOVEMENTS: 'gef_cash_movements_v2',
  SALES: 'gef_sales_v2',
  SALE_ITEMS: 'gef_sale_items_v2',
  LOSSES: 'gef_losses_v2',
  CAPITAL_TRANSACTIONS: 'gef_capital_tx_v2',
  FINANCIAL_TRANSACTIONS: 'gef_financial_tx_v2',
  DAILY_CLOSINGS: 'gef_daily_closings_v2',
  AUDIT_LOGS: 'gef_audit_logs_v2',
  CUSTOMERS: 'gef_customers_v2',
  CURRENT_STORE_ID: 'gef_current_store_id_v2',
  AMBASSADORS: 'gef_ambassadors_v2',
  QUOTES: 'gef_quotes_v1',
  DELIVERIES: 'gef_deliveries_v1',
  TRANSFERS: 'gef_transfers_v1',
  CREDIT_TXS: 'gef_credit_txs_v1',
  INVENTORIES: 'gef_inventories_v1'
};

class GefDatabase {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    // Check if seeds are already loaded in localStorage, if not fetch from json/
    try {
      if (!localStorage.getItem(STORAGE_KEYS.STORES)) {
        const res = await fetch('json/stores.json');
        if (res.ok) {
          const data = await res.json();
          this.set(STORAGE_KEYS.STORES, data);
        }
      }
      if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
        const res = await fetch('json/products.json');
        if (res.ok) {
          const data = await res.json();
          this.set(STORAGE_KEYS.PRODUCTS, data);
        }
      }
      if (!localStorage.getItem(STORAGE_KEYS.UNITS)) {
        const res = await fetch('json/units.json');
        if (res.ok) {
          const data = await res.json();
          this.set(STORAGE_KEYS.UNITS, data);
        }
      }
      if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
        const res = await fetch('json/suppliers.json');
        if (res.ok) {
          const data = await res.json();
          this.set(STORAGE_KEYS.SUPPLIERS, data);
        }
      }
      if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
        const res = await fetch('json/customers.json');
        if (res.ok) {
          const data = await res.json();
          this.set(STORAGE_KEYS.CUSTOMERS, data);
        }
      }
      if (!localStorage.getItem(STORAGE_KEYS.AMBASSADORS)) {
        const res = await fetch('json/ambassadors.json');
        if (res.ok) {
          const data = await res.json();
          this.set(STORAGE_KEYS.AMBASSADORS, data);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar arquivos JSON iniciais, usando fallback:', e);
    }
    
    // Sincroniza moeda e idioma da filial ativa
    const currentStore = this.getCurrentStore();
    if (currentStore) {
      if (currentStore.currency) i18n.setCurrency(currentStore.currency);
      if (currentStore.language) i18n.setLanguage(currentStore.language);
    }
    
    this.initialized = true;
  }

  get(key, defaultVal) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error('Falha ao salvar no localStorage:', e);
    }
  }

  // --- STORES & MULTI-TENANCY ---
  getStores() {
    return this.get(STORAGE_KEYS.STORES, []);
  }

  getCurrentStoreId() {
    const id = this.get(STORAGE_KEYS.CURRENT_STORE_ID, 'store-001');
    const stores = this.getStores();
    return stores.some(s => s.id === id) ? id : (stores[0]?.id || 'store-001');
  }

  setCurrentStoreId(storeId) {
    this.set(STORAGE_KEYS.CURRENT_STORE_ID, storeId);
    const store = this.getStores().find(s => s.id === storeId);
    if (store) {
      if (store.currency) i18n.setCurrency(store.currency);
      if (store.language) i18n.setLanguage(store.language);
    }
  }

  getCurrentStore() {
    const id = this.getCurrentStoreId();
    const stores = this.getStores();
    return stores.find(s => s.id === id) || stores[0] || {
      id: 'store-001',
      code: 'LOJA-01',
      name: 'GEF - Ferragens & Materiais de Construção',
      tradeName: 'GEF Ferragens',
      currency: 'MT'
    };
  }

  saveStore(store) {
    const stores = this.getStores();
    const idx = stores.findIndex(s => s.id === store.id);
    if (idx >= 0) stores[idx] = store;
    else stores.push(store);
    this.set(STORAGE_KEYS.STORES, stores);
    if (store.id === this.getCurrentStoreId()) {
      if (store.currency) i18n.setCurrency(store.currency);
      if (store.language) i18n.setLanguage(store.language);
    }
    return store;
  }

  deleteStore(storeId) {
    const stores = this.getStores();
    const filtered = stores.filter(s => s.id !== storeId);
    this.set(STORAGE_KEYS.STORES, filtered);
    return true;
  }

  getConfig() {
    const store = this.getCurrentStore();
    return {
      ...store,
      companyName: store.name,
      brandName: store.tradeName || store.name,
      nuit: store.cnpjNif,
      receiptPrinterWidth: store.receiptPrinterWidth || '80mm',
      receiptFooterMessage: store.receiptFooter || store.receiptFooterMessage || 'Garantia de ferramentas: 30 dias com apresentação deste recibo.'
    };
  }

  saveConfig(config) {
    const store = this.getCurrentStore();
    if (config.companyName || config.name) store.name = config.companyName || config.name;
    if (config.brandName || config.tradeName) store.tradeName = config.brandName || config.tradeName;
    if (config.nuit || config.cnpjNif) store.cnpjNif = config.nuit || config.cnpjNif;
    if (config.phone) store.phone = config.phone;
    if (config.email) store.email = config.email;
    if (config.address) store.address = config.address;
    if (config.currency) {
      store.currency = config.currency;
      i18n.setCurrency(config.currency);
    }
    if (config.language) {
      store.language = config.language;
      i18n.setLanguage(config.language);
    }
    if (config.receiptFooterMessage || config.receiptFooter) {
      store.receiptFooter = config.receiptFooterMessage || config.receiptFooter;
    }
    if (config.receiptPrinterWidth) store.receiptPrinterWidth = config.receiptPrinterWidth;
    if (config.scalePort) store.scalePort = config.scalePort;
    if (config.scaleBaudRate) store.scaleBaudRate = config.scaleBaudRate;
    this.saveStore(store);
  }

  // --- UNITS ---
  getUnits() {
    return this.get(STORAGE_KEYS.UNITS, []);
  }

  // --- PRODUCTS & BATCHES ---
  getProducts(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const list = this.get(STORAGE_KEYS.PRODUCTS, []);
    return list
      .filter(p => targetStore === 'ALL' || (p.storeId || 'store-001') === targetStore)
      .map(p => {
        const stock = p.stockByLocation || {
          LOJA: p.currentStockBase || 0,
          ARMAZEM: 0,
          PATIO: 0
        };
        const conversions = p.conversions || p.packages || [];
        return {
          ...p,
          stockByLocation: {
            LOJA: stock.LOJA ?? p.currentStockBase ?? 0,
            ARMAZEM: stock.ARMAZEM ?? 0,
            PATIO: stock.PATIO ?? 0,
            ...stock
          },
          conversions: conversions.map(c => ({
            ...c,
            packagingName: c.packagingName || c.packageName || 'Embalagem',
            multiplier: c.multiplier ?? c.multiplierToBase ?? 1,
            multiplierToBase: c.multiplierToBase ?? c.multiplier ?? 1
          })),
          minStockAlert: p.minStockAlert ?? p.minStockBase ?? 10,
          minStockBase: p.minStockBase ?? p.minStockAlert ?? 10
        };
      });
  }

  getProductById(id) {
    const all = this.get(STORAGE_KEYS.PRODUCTS, []);
    return all.find(p => p.id === id);
  }

  saveProduct(product) {
    const all = this.get(STORAGE_KEYS.PRODUCTS, []);
    product.storeId = product.storeId || this.getCurrentStoreId();
    const idx = all.findIndex(p => p.id === product.id);
    if (idx >= 0) all[idx] = product;
    else all.unshift(product);
    this.set(STORAGE_KEYS.PRODUCTS, all);
    return product;
  }

  deleteProduct(id) {
    const all = this.get(STORAGE_KEYS.PRODUCTS, []);
    const filtered = all.filter(p => p.id !== id);
    this.set(STORAGE_KEYS.PRODUCTS, filtered);
    return true;
  }

  // --- ALL BATCHES (FEFO Tracking) ---
  getAllBatches(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const products = this.getProducts(targetStore);
    const batches = [];
    products.forEach(p => {
      if (p.batches) {
        p.batches.forEach(b => {
          if (targetStore === 'ALL' || (b.storeId || p.storeId) === targetStore) {
            batches.push({
              ...b,
              productName: p.name
            });
          }
        });
      }
    });
    return batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }

  // --- CUSTOMERS ---
  getCustomers(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const raw = this.get(STORAGE_KEYS.CUSTOMERS, []);
    return raw
      .filter(c => targetStore === 'ALL' || (c.storeId || 'store-001') === targetStore)
      .map(c => {
        const debt = Number(c.currentDebt ?? c.creditBalance ?? 0);
        const limit = Number(c.creditLimit ?? 0);
        return {
          ...c,
          currentDebt: isNaN(debt) ? 0 : debt,
          creditBalance: isNaN(debt) ? 0 : debt,
          creditLimit: isNaN(limit) ? 0 : limit,
          document: c.document || c.taxId || '',
          taxId: c.taxId || c.document || ''
        };
      });
  }

  saveCustomer(customer) {
    const all = this.get(STORAGE_KEYS.CUSTOMERS, []);
    customer.storeId = customer.storeId || this.getCurrentStoreId();
    const idx = all.findIndex(c => c.id === customer.id);
    if (idx >= 0) all[idx] = customer;
    else all.unshift(customer);
    this.set(STORAGE_KEYS.CUSTOMERS, all);
    return customer;
  }

  deleteCustomer(id) {
    const all = this.get(STORAGE_KEYS.CUSTOMERS, []);
    const filtered = all.filter(c => c.id !== id);
    this.set(STORAGE_KEYS.CUSTOMERS, filtered);
    return true;
  }

  // --- SUPPLIERS ---
  getSuppliers(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const raw = this.get(STORAGE_KEYS.SUPPLIERS, []);
    return raw.filter(s => targetStore === 'ALL' || (s.storeId || 'store-001') === targetStore);
  }

  saveSupplier(supplier) {
    const all = this.get(STORAGE_KEYS.SUPPLIERS, []);
    supplier.storeId = supplier.storeId || this.getCurrentStoreId();
    const idx = all.findIndex(s => s.id === supplier.id);
    if (idx >= 0) all[idx] = supplier;
    else all.unshift(supplier);
    this.set(STORAGE_KEYS.SUPPLIERS, all);
    return supplier;
  }

  deleteSupplier(id) {
    const all = this.get(STORAGE_KEYS.SUPPLIERS, []);
    const filtered = all.filter(s => s.id !== id);
    this.set(STORAGE_KEYS.SUPPLIERS, filtered);
    return true;
  }

  // --- CASH SESSIONS & SANGRIAS ---
  getCashSessions(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const list = this.get(STORAGE_KEYS.CASH_SESSIONS, []);
    return list.filter(s => targetStore === 'ALL' || s.storeId === targetStore);
  }

  getActiveCashSession(storeId) {
    const sessions = this.getCashSessions(storeId);
    return sessions.find(s => s.status === 'OPEN') || null;
  }

  openCashSession(operatorName, initialCash, storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const sessions = this.get(STORAGE_KEYS.CASH_SESSIONS, []);
    
    // Close previous open session
    sessions.forEach(s => {
      if (s.storeId === targetStore && s.status === 'OPEN') {
        s.status = 'CLOSED';
        s.closedAt = new Date().toISOString();
      }
    });

    const newSession = {
      id: 'session-' + Date.now(),
      storeId: targetStore,
      userId: 'user-001',
      operatorName: operatorName || 'Operador Caixa',
      openedAt: new Date().toISOString(),
      initialCash: Number(initialCash) || 0,
      initialFloat: Number(initialCash) || 0,
      expectedCash: Number(initialCash) || 0,
      totalSalesCash: 0,
      totalSalesCard: 0,
      totalSalesPix: 0,
      totalSalesOther: 0,
      totalSangrias: 0,
      totalEntries: 0,
      status: 'OPEN'
    };

    sessions.unshift(newSession);
    this.set(STORAGE_KEYS.CASH_SESSIONS, sessions);

    this.addCashMovement({
      id: 'mov-' + Date.now(),
      storeId: targetStore,
      sessionId: newSession.id,
      movementType: 'INITIAL',
      paymentMethod: 'CASH',
      amount: initialCash,
      reason: 'Abertura de Sessão de Caixa (Fundo de Troco)',
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      id: 'audit-' + Date.now(),
      storeId: targetStore,
      action: 'ABERTURA_CAIXA',
      entity: 'cash_sessions',
      entityId: newSession.id,
      details: `Caixa aberto por ${operatorName} com fundo de troco ${initialCash} MT.`,
      createdAt: new Date().toISOString()
    });

    return newSession;
  }

  closeCashSession(sessionId, countedCash, notes) {
    const sessions = this.get(STORAGE_KEYS.CASH_SESSIONS, []);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Sessão de caixa não encontrada.');
    if (session.status === 'CLOSED') throw new Error('Sessão já está fechada.');

    const difference = Number((countedCash - session.expectedCash).toFixed(2));
    session.closedAt = new Date().toISOString();
    session.countedCash = countedCash;
    session.cashDifference = difference;
    session.difference = difference;
    session.status = 'CLOSED';
    session.isClosed = true;
    session.notes = notes;

    this.set(STORAGE_KEYS.CASH_SESSIONS, sessions);

    this.addAuditLog({
      id: 'audit-' + Date.now(),
      storeId: session.storeId,
      action: 'FECHAMENTO_CAIXA',
      entity: 'cash_sessions',
      entityId: session.id,
      details: `Fechamento de caixa. Esperado: ${session.expectedCash}, Contado: ${countedCash}, Diferença: ${difference} MT.`,
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      expected_cash: session.expectedCash,
      expectedCash: session.expectedCash,
      counted_cash: countedCash,
      countedCash: countedCash,
      difference
    };
  }

  registerSangria(storeId, sessionId, amount, destination, reason, notes) {
    const targetStore = storeId || this.getCurrentStoreId();
    const sessions = this.get(STORAGE_KEYS.CASH_SESSIONS, []);
    const session = sessions.find(s => s.id === sessionId && s.storeId === targetStore);
    if (!session) throw new Error('Sessão de caixa não encontrada.');
    if (session.status !== 'OPEN') throw new Error('A sessão de caixa está fechada.');
    if (amount <= 0) throw new Error('O valor da sangria deve ser maior que zero.');

    const movId = 'mov-sangria-' + Date.now();

    this.addCashMovement({
      id: movId,
      storeId: targetStore,
      sessionId,
      movementType: destination || 'SANGRIA_BANK',
      paymentMethod: 'CASH',
      amount,
      reason,
      destination,
      notes,
      createdAt: new Date().toISOString()
    });

    session.totalSangrias = Number((session.totalSangrias + amount).toFixed(2));
    session.expectedCash = Number((session.expectedCash - amount).toFixed(2));
    this.set(STORAGE_KEYS.CASH_SESSIONS, sessions);

    this.addAuditLog({
      id: 'audit-' + Date.now(),
      storeId: targetStore,
      action: 'SANGRIA',
      entity: 'cash_movements',
      entityId: movId,
      details: `Sangria de ${amount} MT (${destination}). Motivo: ${reason}`,
      createdAt: new Date().toISOString()
    });

    return { success: true, movement_id: movId };
  }

  getCashMovements(sessionId) {
    const list = this.get(STORAGE_KEYS.CASH_MOVEMENTS, []);
    return sessionId ? list.filter(m => m.sessionId === sessionId) : list;
  }

  addCashMovement(mov) {
    const list = this.get(STORAGE_KEYS.CASH_MOVEMENTS, []);
    list.unshift(mov);
    this.set(STORAGE_KEYS.CASH_MOVEMENTS, list);
  }

  // --- SALES & ATOMIC POS (FEFO) ---
  getSales(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const list = this.get(STORAGE_KEYS.SALES, []);
    return list.filter(s => targetStore === 'ALL' || s.storeId === targetStore);
  }

  processAtomicSale(storeId, sessionId, customerName, customerTaxId, paymentMethod, discountAmount, items, extraInfo) {
    const products = this.getProducts();
    const targetStore = storeId || this.getCurrentStoreId();

    let activeSession = sessionId ? this.getCashSessions(targetStore).find(s => s.id === sessionId && s.status === 'OPEN') : null;
    if (!activeSession) {
      activeSession = this.getActiveCashSession(targetStore);
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.floor(100000 + Math.random() * 900000);
    const receiptNumber = `REC-${dateStr}-${randPart}`;
    const saleId = 'sale-' + Date.now() + '-' + randPart;

    let totalGross = 0;
    let totalCogs = 0;
    const saleItems = [];

    // Precalculate totals & stock validation
    for (const item of items) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) throw new Error(`Produto não encontrado: ${item.productId}`);
      const mult = item.multiplierToBase || item.multiplier || 1;
      const qtyNeeded = item.quantity * mult;
      if (prod.currentStockBase < qtyNeeded) {
        throw new Error(`Estoque insuficiente para "${prod.name}". Disponível: ${prod.currentStockBase} ${prod.baseUnit}, Solicitado: ${qtyNeeded} ${prod.baseUnit}`);
      }
      totalGross += Number((item.quantity * item.unitPrice).toFixed(2));
    }

    const discount = Number(discountAmount || 0);
    const totalNet = Math.max(0, Number((totalGross - discount).toFixed(2)));

    // Deduct stock using FEFO
    for (const item of items) {
      const prod = products.find(p => p.id === item.productId);
      const mult = item.multiplierToBase || item.multiplier || 1;
      let qtyNeeded = item.quantity * mult;
      let itemCogs = 0;

      if (!prod.batches) prod.batches = [];
      prod.batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      for (const batch of prod.batches) {
        if (qtyNeeded <= 0) break;
        if (batch.currentQuantityBase <= 0) continue;
        const qtyFromBatch = Math.min(batch.currentQuantityBase, qtyNeeded);
        const batchCogs = qtyFromBatch * (batch.costPerBase || prod.costPriceBase);
        itemCogs += batchCogs;

        batch.currentQuantityBase = Number((batch.currentQuantityBase - qtyFromBatch).toFixed(3));
        if (batch.currentQuantityBase <= 0) {
          batch.status = 'EXHAUSTED';
        }

        saleItems.push({
          saleId,
          storeId: targetStore,
          productId: prod.id,
          productCode: prod.code,
          productName: prod.name,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          packageId: item.packageId,
          packagingName: item.packagingName || item.packageName || prod.baseUnit,
          selectedUnit: item.selectedUnit || item.packagingName || prod.baseUnit,
          unitId: item.unitId,
          quantity: Number((qtyFromBatch / mult).toFixed(3)),
          quantitySold: Number((qtyFromBatch / mult).toFixed(3)),
          multiplierToBase: mult,
          quantityBase: qtyFromBatch,
          unitPrice: item.unitPrice,
          total: Number(((qtyFromBatch / mult) * item.unitPrice).toFixed(2)),
          totalPrice: Number(((qtyFromBatch / mult) * item.unitPrice).toFixed(2)),
          unitCogs: batch.costPerBase,
          costPriceBase: batch.costPerBase,
          totalCogs: Number(batchCogs.toFixed(4))
        });

        qtyNeeded -= qtyFromBatch;
      }

      if (qtyNeeded > 0) {
        const fallbackCost = prod.costPriceBase || 0;
        const batchCogs = qtyNeeded * fallbackCost;
        itemCogs += batchCogs;
        saleItems.push({
          saleId,
          storeId: targetStore,
          productId: prod.id,
          productCode: prod.code,
          productName: prod.name,
          packageId: item.packageId,
          packagingName: item.packagingName || item.packageName || prod.baseUnit,
          selectedUnit: item.selectedUnit || item.packagingName || prod.baseUnit,
          unitId: item.unitId,
          quantity: Number((qtyNeeded / mult).toFixed(3)),
          quantitySold: Number((qtyNeeded / mult).toFixed(3)),
          multiplierToBase: mult,
          quantityBase: qtyNeeded,
          unitPrice: item.unitPrice,
          total: Number(((qtyNeeded / mult) * item.unitPrice).toFixed(2)),
          totalPrice: Number(((qtyNeeded / mult) * item.unitPrice).toFixed(2)),
          unitCogs: fallbackCost,
          costPriceBase: fallbackCost,
          totalCogs: Number(batchCogs.toFixed(4))
        });
      }

      const totalUnitsSold = item.quantity * mult;
      prod.currentStockBase = Number((prod.currentStockBase - totalUnitsSold).toFixed(3));
      if (!prod.stockByLocation) {
        prod.stockByLocation = { LOJA: prod.currentStockBase, ARMAZEM: 0, PATIO: 0 };
      } else {
        prod.stockByLocation.LOJA = Math.max(0, Number(((prod.stockByLocation.LOJA || 0) - totalUnitsSold).toFixed(3)));
      }
      totalCogs += itemCogs;
    }

    this.set(STORAGE_KEYS.PRODUCTS, products);

    const grossProfit = Number((totalNet - totalCogs).toFixed(2));
    const sales = this.get(STORAGE_KEYS.SALES, []);
    const newSale = {
      id: saleId,
      storeId: targetStore,
      sessionId: activeSession?.id,
      saleNumber: 'VEN-' + (sales.length + 1001),
      receiptNumber,
      customerName: customerName || 'Consumidor Final',
      customerTaxId,
      customerPhone: extraInfo?.customerPhone,
      customerId: extraInfo?.customerId,
      cashierName: extraInfo?.cashierName || 'Operador Balcão',
      subtotal: totalGross,
      totalGross,
      discountAmount: discount,
      discount,
      totalNet,
      total: totalNet,
      totalCogs: Number(totalCogs.toFixed(4)),
      grossProfit,
      paymentMethod,
      paymentDetails: extraInfo?.paymentDetails || {},
      needsDelivery: extraInfo?.needsDelivery || false,
      notes: extraInfo?.notes || '',
      status: 'CONCLUIDA',
      location: extraInfo?.location || 'LOJA',
      createdAt: now.toISOString(),
      timestamp: now.toISOString(),
      items: saleItems
    };

    sales.unshift(newSale);
    this.set(STORAGE_KEYS.SALES, sales);

    // If Credit / Fiado, add to customer balance
    if (paymentMethod === 'CREDITO_FIADO' && extraInfo?.customerId) {
      const customers = this.getCustomers();
      const customer = customers.find(c => c.id === extraInfo.customerId);
      if (customer) {
        customer.currentDebt = (customer.currentDebt || 0) + totalNet;
        customer.creditBalance = customer.currentDebt;
        this.saveCustomer(customer);

        // Record credit transaction
        const creditTxs = this.get(STORAGE_KEYS.CREDIT_TXS, []);
        creditTxs.unshift({
          id: 'ctx-' + Date.now(),
          customerId: customer.id,
          customerName: customer.name,
          type: 'DEBITO_VENDA',
          amount: totalNet,
          newBalance: customer.currentDebt,
          notes: `Compra a fiado na Venda ${newSale.saleNumber}`,
          operatorName: newSale.cashierName,
          timestamp: now.toISOString()
        });
        this.set(STORAGE_KEYS.CREDIT_TXS, creditTxs);
      }
    }

    // Update Cash Session
    if (activeSession) {
      const sessions = this.get(STORAGE_KEYS.CASH_SESSIONS, []);
      const currentSession = sessions.find(s => s.id === activeSession.id);
      if (currentSession) {
        if (paymentMethod === 'DINHEIRO' || paymentMethod === 'CASH') {
          currentSession.totalSalesCash = Number((currentSession.totalSalesCash + totalNet).toFixed(2));
          currentSession.expectedCash = Number((currentSession.expectedCash + totalNet).toFixed(2));
        } else {
          currentSession.totalSalesOther = Number((currentSession.totalSalesOther + totalNet).toFixed(2));
        }
        this.set(STORAGE_KEYS.CASH_SESSIONS, sessions);
      }
      this.addCashMovement({
        id: 'mov-sale-' + Date.now(),
        storeId: targetStore,
        sessionId: activeSession.id,
        movementType: 'SALE',
        paymentMethod,
        amount: totalNet,
        reason: `Venda ${receiptNumber}`,
        createdAt: now.toISOString()
      });
    }

    this.addAuditLog({
      id: 'audit-' + Date.now(),
      storeId: targetStore,
      action: 'VENDA',
      entity: 'sales',
      entityId: saleId,
      details: `Venda ${newSale.saleNumber} (${receiptNumber}) total ${totalNet} MT via ${paymentMethod} para ${customerName}.`,
      createdAt: now.toISOString()
    });

    return {
      success: true,
      sale_id: saleId,
      receipt_number: receiptNumber,
      total_gross: totalGross,
      discount_amount: discount,
      total_net: totalNet,
      payment_method: paymentMethod,
      sale: newSale
    };
  }

  processSale(saleData) {
    return this.processAtomicSale(
      saleData.storeId || this.getCurrentStoreId(),
      saleData.sessionId || saleData.shiftId,
      saleData.customerName || 'Consumidor Final',
      saleData.customerTaxId || saleData.customerNuit,
      saleData.paymentMethod || 'DINHEIRO',
      saleData.discount || saleData.discountAmount || 0,
      saleData.items || [],
      {
        customerId: saleData.customerId,
        customerPhone: saleData.customerPhone,
        cashierName: saleData.cashierName || 'Operador Balcão',
        paymentDetails: saleData.paymentDetails,
        needsDelivery: saleData.needsDelivery,
        notes: saleData.notes,
        location: saleData.location || 'LOJA'
      }
    ).then(res => res.sale);
  }

  reverseSale(saleId, reason) {
    const sales = this.get(STORAGE_KEYS.SALES, []);
    const sale = sales.find(s => s.id === saleId);
    if (!sale) throw new Error('Venda não encontrada.');
    if (sale.status === 'CANCELADA' || sale.status === 'REVERSED') {
      throw new Error('Esta venda já foi estornada anteriormente.');
    }

    const products = this.getProducts();

    // Recompose product & batch stocks
    for (const item of sale.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.currentStockBase = Number((prod.currentStockBase + item.quantityBase).toFixed(3));
        if (prod.stockByLocation) {
          prod.stockByLocation.LOJA = (prod.stockByLocation.LOJA || 0) + item.quantityBase;
        }
        if (item.batchId && prod.batches) {
          const batch = prod.batches.find(b => b.id === item.batchId);
          if (batch) {
            batch.currentQuantityBase = Number((batch.currentQuantityBase + item.quantityBase).toFixed(3));
            batch.status = 'ACTIVE';
          }
        }
      }
    }
    this.set(STORAGE_KEYS.PRODUCTS, products);

    // If customer had credit debt, reverse it
    if (sale.paymentMethod === 'CREDITO_FIADO' && sale.customerId) {
      const customers = this.getCustomers();
      const customer = customers.find(c => c.id === sale.customerId);
      if (customer) {
        customer.currentDebt = Math.max(0, (customer.currentDebt || 0) - sale.total);
        customer.creditBalance = customer.currentDebt;
        this.saveCustomer(customer);
      }
    }

    sale.status = 'CANCELADA';
    sale.reversalReason = reason;
    sale.reversedAt = new Date().toISOString();
    this.set(STORAGE_KEYS.SALES, sales);

    this.addAuditLog({
      id: 'audit-' + Date.now(),
      storeId: sale.storeId,
      action: 'ESTORNO_VENDA',
      entity: 'sales',
      entityId: sale.id,
      details: `Estorno reverso atômico da venda ${sale.saleNumber}. Motivo: ${reason}`,
      createdAt: new Date().toISOString()
    });

    return true;
  }

  revertSale(saleId, operatorName, reason) {
    return this.reverseSale(saleId, reason || 'Estorno manual solicitado por ' + operatorName);
  }

  // --- PURCHASES ---
  getPurchases(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const list = this.get(STORAGE_KEYS.PURCHASES, []);
    return list.filter(p => targetStore === 'ALL' || p.storeId === targetStore);
  }

  savePurchase(purchase, operatorName) {
    const targetStore = purchase.storeId || this.getCurrentStoreId();
    const products = this.getProducts();

    // Add inventory for each purchased item
    for (const it of purchase.items || []) {
      const prod = products.find(p => p.id === it.productId);
      if (prod) {
        const qtyBase = it.quantityPurchased || it.quantity || 1;
        prod.currentStockBase = Number((prod.currentStockBase + qtyBase).toFixed(3));
        const destLoc = purchase.destinationLocation || 'ARMAZEM';
        if (!prod.stockByLocation) {
          prod.stockByLocation = { LOJA: 0, ARMAZEM: 0, PATIO: 0 };
        }
        prod.stockByLocation[destLoc] = (prod.stockByLocation[destLoc] || 0) + qtyBase;

        if (it.unitCost && it.unitCost > 0) {
          // Weighted average cost formula
          const prevTotalValue = (prod.currentStockBase - qtyBase) * prod.costPriceBase;
          const newAdditionValue = qtyBase * it.unitCost;
          prod.costPriceBase = Number(((prevTotalValue + newAdditionValue) / prod.currentStockBase).toFixed(2));
        }

        if (it.newSalePrice && it.newSalePrice > 0) {
          prod.salePriceBase = it.newSalePrice;
        }

        // Add Batch if specified
        if (it.batchNumber) {
          if (!prod.batches) prod.batches = [];
          prod.batches.push({
            id: 'batch-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            storeId: targetStore,
            productId: prod.id,
            productName: prod.name,
            batchNumber: it.batchNumber,
            supplierId: purchase.supplierId,
            initialQuantityBase: qtyBase,
            currentQuantityBase: qtyBase,
            costPerBase: it.unitCost || prod.costPriceBase,
            expiryDate: it.expiryDate || '2030-01-01',
            status: 'ACTIVE'
          });
        }
      }
    }
    this.set(STORAGE_KEYS.PRODUCTS, products);

    const purchases = this.get(STORAGE_KEYS.PURCHASES, []);
    purchase.storeId = targetStore;
    purchase.createdAt = new Date().toISOString();
    purchases.unshift(purchase);
    this.set(STORAGE_KEYS.PURCHASES, purchases);

    this.addAuditLog({
      id: 'audit-' + Date.now(),
      storeId: targetStore,
      action: 'ENTRADA_COMPRA',
      entity: 'purchases',
      entityId: purchase.id,
      details: `Entrada de compra NF ${purchase.invoiceNumber} do fornecedor ${purchase.supplierName} total ${purchase.totalCost} MT.`,
      createdAt: new Date().toISOString()
    });

    return purchase;
  }

  // --- LOSSES / AVARIAS ---
  getLosses(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const list = this.get(STORAGE_KEYS.LOSSES, []);
    return list.filter(l => targetStore === 'ALL' || l.storeId === targetStore);
  }

  registerLoss(loss) {
    const targetStore = loss.storeId || this.getCurrentStoreId();
    const products = this.getProducts();
    const prod = products.find(p => p.id === loss.productId);
    if (!prod) throw new Error('Produto não encontrado.');

    const qty = loss.quantityBase || 1;
    prod.currentStockBase = Math.max(0, Number((prod.currentStockBase - qty).toFixed(3)));
    const loc = loss.location || 'LOJA';
    if (prod.stockByLocation) {
      prod.stockByLocation[loc] = Math.max(0, (prod.stockByLocation[loc] || 0) - qty);
    }
    this.set(STORAGE_KEYS.PRODUCTS, products);

    const losses = this.get(STORAGE_KEYS.LOSSES, []);
    loss.storeId = targetStore;
    loss.timestamp = loss.timestamp || new Date().toISOString();
    losses.unshift(loss);
    this.set(STORAGE_KEYS.LOSSES, losses);

    this.addAuditLog({
      id: 'audit-' + Date.now(),
      storeId: targetStore,
      action: 'PERDA_REGISTRADA',
      entity: 'losses',
      entityId: loss.id,
      details: `Baixa de avaria/perda de ${qty} ${loss.baseUnit} de ${prod.name} (${loss.reason}). Prejuízo: ${loss.totalLossCost} MT.`,
      createdAt: new Date().toISOString()
    });

    return loss;
  }

  // --- QUOTES / ORÇAMENTOS DE OBRA ---
  getQuotes(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const list = this.get(STORAGE_KEYS.QUOTES, []);
    return list.filter(q => targetStore === 'ALL' || (q.storeId || 'store-001') === targetStore);
  }

  saveQuote(quote) {
    quote.storeId = quote.storeId || this.getCurrentStoreId();
    const list = this.getQuotes('ALL');
    const idx = list.findIndex(q => q.id === quote.id);
    if (idx >= 0) list[idx] = quote;
    else list.unshift(quote);
    this.set(STORAGE_KEYS.QUOTES, list);
    return quote;
  }

  deleteQuote(id) {
    const list = this.getQuotes('ALL');
    const filtered = list.filter(q => q.id !== id);
    this.set(STORAGE_KEYS.QUOTES, filtered);
    return true;
  }

  // --- DELIVERIES EM CANTEIRO ---
  getDeliveries(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const list = this.get(STORAGE_KEYS.DELIVERIES, []);
    return list.filter(d => targetStore === 'ALL' || (d.storeId || 'store-001') === targetStore);
  }

  saveDelivery(delivery) {
    delivery.storeId = delivery.storeId || this.getCurrentStoreId();
    const list = this.getDeliveries('ALL');
    const idx = list.findIndex(d => d.id === delivery.id);
    if (idx >= 0) list[idx] = delivery;
    else list.unshift(delivery);
    this.set(STORAGE_KEYS.DELIVERIES, list);
    return delivery;
  }

  deleteDelivery(id) {
    const list = this.getDeliveries('ALL');
    const filtered = list.filter(d => d.id !== id);
    this.set(STORAGE_KEYS.DELIVERIES, filtered);
    return true;
  }

  // --- TRANSFERS ---
  getTransfers(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const list = this.get(STORAGE_KEYS.TRANSFERS, []);
    return list.filter(t => targetStore === 'ALL' || (t.storeId || 'store-001') === targetStore);
  }

  saveTransfer(transfer) {
    transfer.storeId = transfer.storeId || this.getCurrentStoreId();
    const list = this.get(STORAGE_KEYS.TRANSFERS, []);
    list.unshift(transfer);
    this.set(STORAGE_KEYS.TRANSFERS, list);

    if (transfer.productId && transfer.quantityBase && transfer.fromLocation && transfer.toLocation) {
      const product = this.getProductById(transfer.productId);
      if (product) {
        if (!product.stockByLocation) {
          product.stockByLocation = { LOJA: product.currentStockBase || 0, ARMAZEM: 0, PATIO: 0 };
        }
        product.stockByLocation[transfer.fromLocation] = Math.max(0, (product.stockByLocation[transfer.fromLocation] || 0) - transfer.quantityBase);
        product.stockByLocation[transfer.toLocation] = (product.stockByLocation[transfer.toLocation] || 0) + transfer.quantityBase;
        this.saveProduct(product);
      }
    }
    return transfer;
  }

  transferStock(transferObj) {
    return this.saveTransfer(transferObj);
  }

  // --- CUSTOMER CREDIT & PAYMENTS ---
  getCustomerCreditHistory(customerId) {
    const all = this.get(STORAGE_KEYS.CREDIT_TXS, []);
    return all.filter(t => t.customerId === customerId);
  }

  registerCustomerPayment(customerId, amount, paymentMethod, operatorName, notes) {
    const customers = this.getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) throw new Error('Cliente não encontrado.');

    const oldDebt = customer.currentDebt || 0;
    const newDebt = Math.max(0, oldDebt - amount);
    customer.currentDebt = newDebt;
    customer.creditBalance = newDebt;
    this.saveCustomer(customer);

    const tx = {
      id: 'ctx-' + Date.now(),
      customerId,
      customerName: customer.name,
      type: 'PAGAMENTO',
      amount,
      balanceAfter: newDebt,
      newBalance: newDebt,
      description: notes || 'Amortização de dívida',
      notes: notes || 'Pagamento de conta',
      operatorName: operatorName || 'Operador',
      timestamp: new Date().toISOString()
    };

    const all = this.get(STORAGE_KEYS.CREDIT_TXS, []);
    all.unshift(tx);
    this.set(STORAGE_KEYS.CREDIT_TXS, all);

    this.addAuditLog({
      id: 'audit-' + Date.now(),
      storeId: customer.storeId || this.getCurrentStoreId(),
      action: 'RECEBIMENTO_DIVIDA',
      entity: 'customers',
      entityId: customerId,
      details: `Recebimento de dívida de ${amount} MT de ${customer.name} via ${paymentMethod}.`,
      createdAt: new Date().toISOString()
    });

    return tx;
  }

  // --- AMBASSADORS & PARTNERS ---
  getAmbassadors() {
    let list = this.get(STORAGE_KEYS.AMBASSADORS, []);
    if (!list || list.length === 0) {
      list = [
        {
          id: 'user-embaixador-05',
          name: 'Paulo Cossa (Embaixador Parceiro)',
          email: 'paulo.embaixador@gef.co.mz',
          phone: '+258 84 764 0849',
          code: 'GEF-PAULO-2026',
          commissionRate: 15,
          totalStores: 3,
          activeStores: 2,
          pendingCommissions: 1425.00,
          paidCommissions: 4275.00,
          paymentDetails: 'M-Pesa (+258 84 764 0849)',
          status: 'ATIVO',
          registeredStores: [
            {
              id: 'st-ref-01',
              name: 'Ferragens Aliança da Matola',
              ownerName: 'Alberto Macamo',
              phone: '+258 84 112 3344',
              city: 'Matola',
              monthlyFee: 3500,
              paymentStatus: 'PAGO',
              lastPaymentDate: '05/09/2026',
              nextDueDate: '05/10/2026',
              commissionRate: 15,
              monthlyCommission: 525,
              contractDurationMonths: 12,
              monthsActive: 4,
              monthsRemaining: 8,
              commissionDurationText: '12 meses (restam 8 meses)',
              totalCommissionEarned: 2100,
              registeredAt: '2026-05-10T10:00:00Z'
            },
            {
              id: 'st-ref-02',
              name: 'Construções & Materiais Costa do Sol',
              ownerName: 'Eng. Victor Mabote',
              phone: '+258 82 998 7766',
              city: 'Maputo',
              monthlyFee: 4500,
              paymentStatus: 'PAGO',
              lastPaymentDate: '01/09/2026',
              nextDueDate: '01/10/2026',
              commissionRate: 20,
              monthlyCommission: 900,
              contractDurationMonths: 24,
              monthsActive: 6,
              monthsRemaining: 18,
              commissionDurationText: '24 meses (restam 18 meses)',
              totalCommissionEarned: 5400,
              registeredAt: '2026-03-01T09:00:00Z'
            },
            {
              id: 'st-ref-03',
              name: 'Ferragem Central de Boane',
              ownerName: 'Dra. Elisa Sitoe',
              phone: '+258 84 555 4321',
              city: 'Boane',
              monthlyFee: 2500,
              paymentStatus: 'PENDENTE',
              lastPaymentDate: '10/08/2026',
              nextDueDate: '10/09/2026',
              commissionRate: 15,
              monthlyCommission: 375,
              contractDurationMonths: 12,
              monthsActive: 2,
              monthsRemaining: 10,
              commissionDurationText: '12 meses (restam 10 meses)',
              totalCommissionEarned: 750,
              registeredAt: '2026-07-15T08:00:00Z'
            }
          ],
          payoutHistory: [
            {
              id: 'LIQ-90142',
              date: '02/08/2026 14:20',
              amount: 2850.00,
              method: 'M-Pesa',
              receipt: 'MP-260802.9912.C01',
              status: 'LIQUIDADO'
            },
            {
              id: 'LIQ-88210',
              date: '03/07/2026 11:05',
              amount: 1425.00,
              method: 'M-Pesa',
              receipt: 'MP-260703.4410.A09',
              status: 'LIQUIDADO'
            }
          ]
        },
        {
          id: 'EMB-842',
          name: 'Mateus Chissano (Embaixador Maputo)',
          email: 'mateus.chissano@gefparceiros.co.mz',
          phone: '+258 84 333 1122',
          code: 'EMB-842',
          commissionRate: 15,
          totalStores: 2,
          activeStores: 2,
          pendingCommissions: 1050.00,
          paidCommissions: 3150.00,
          paymentDetails: 'M-Pesa (+258 84 333 1122)',
          status: 'ATIVO',
          registeredStores: [
            {
              id: 'st-ref-04',
              name: 'Ferragens & Tintas de Zimpeto',
              ownerName: 'Simão Nhantumbo',
              phone: '+258 84 990 1122',
              city: 'Maputo',
              monthlyFee: 3500,
              paymentStatus: 'PAGO',
              lastPaymentDate: '03/09/2026',
              nextDueDate: '03/10/2026',
              commissionRate: 15,
              monthlyCommission: 525,
              contractDurationMonths: 12,
              monthsActive: 3,
              monthsRemaining: 9,
              commissionDurationText: '12 meses (restam 9 meses)',
              totalCommissionEarned: 1575,
              registeredAt: '2026-06-01T10:00:00Z'
            },
            {
              id: 'st-ref-05',
              name: 'Depósito Progresso de Marracuene',
              ownerName: 'Helena Langa',
              phone: '+258 86 443 2211',
              city: 'Marracuene',
              monthlyFee: 3500,
              paymentStatus: 'PAGO',
              lastPaymentDate: '08/09/2026',
              nextDueDate: '08/10/2026',
              commissionRate: 15,
              monthlyCommission: 525,
              contractDurationMonths: 12,
              monthsActive: 3,
              monthsRemaining: 9,
              commissionDurationText: '12 meses (restam 9 meses)',
              totalCommissionEarned: 1575,
              registeredAt: '2026-06-10T11:00:00Z'
            }
          ],
          payoutHistory: [
            {
              id: 'LIQ-77123',
              date: '05/08/2026 16:45',
              amount: 2100.00,
              method: 'M-Pesa',
              receipt: 'MP-260805.7712.D04',
              status: 'LIQUIDADO'
            }
          ]
        }
      ];
      this.set(STORAGE_KEYS.AMBASSADORS, list);
    }

    // Normalization check for any existing items
    list = list.map(amb => {
      if (!amb.registeredStores) {
        amb.registeredStores = [];
      }
      if (!amb.payoutHistory) {
        amb.payoutHistory = [];
      }
      if (typeof amb.pendingCommissions !== 'number') {
        amb.pendingCommissions = 0;
      }
      if (typeof amb.paidCommissions !== 'number') {
        amb.paidCommissions = 0;
      }
      if (!amb.commissionRate) {
        amb.commissionRate = amb.commissionPercent || 15;
      }
      amb.totalStores = amb.registeredStores.length;
      amb.activeStores = amb.registeredStores.filter(s => s.paymentStatus === 'PAGO').length;
      return amb;
    });

    return list;
  }

  saveAmbassador(ambassador) {
    const list = this.getAmbassadors();
    const idx = list.findIndex(a => a.id === ambassador.id);
    if (idx >= 0) list[idx] = ambassador;
    else list.push(ambassador);
    this.set(STORAGE_KEYS.AMBASSADORS, list);
    return ambassador;
  }

  addAmbassadorReferredStore(ambassadorId, storeData) {
    const list = this.getAmbassadors();
    const amb = list.find(a => a.id === ambassadorId);
    if (!amb) throw new Error('Embaixador não encontrado.');

    if (!amb.registeredStores) amb.registeredStores = [];

    const monthlyFee = Number(storeData.monthlyFee) || 3500;
    const rate = Number(storeData.commissionRate) || amb.commissionRate || amb.commissionPercent || 15;
    const monthlyCommission = Number(((monthlyFee * rate) / 100).toFixed(2));
    const durationMonths = Number(storeData.contractDurationMonths) || 12;

    const newStore = {
      id: 'store-ref-' + Date.now(),
      name: storeData.name,
      ownerName: storeData.ownerName || 'Responsável Comercial',
      phone: storeData.phone || '+258 84 000 0000',
      city: storeData.city || 'Maputo',
      monthlyFee,
      paymentStatus: storeData.paymentStatus || 'PAGO', // 'PAGO', 'PENDENTE', 'ATRASADO'
      lastPaymentDate: new Date().toLocaleDateString('pt-PT'),
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT'),
      commissionRate: rate,
      monthlyCommission,
      contractDurationMonths: durationMonths,
      monthsActive: 1,
      monthsRemaining: Math.max(0, durationMonths - 1),
      commissionDurationText: durationMonths >= 99 ? 'Contrato Vitalício' : `${durationMonths} meses (restam ${durationMonths - 1} meses)`,
      totalCommissionEarned: monthlyCommission,
      registeredAt: new Date().toISOString()
    };

    amb.registeredStores.unshift(newStore);
    amb.totalStores = amb.registeredStores.length;
    amb.activeStores = amb.registeredStores.filter(s => s.paymentStatus === 'PAGO').length;
    amb.pendingCommissions = Number(((amb.pendingCommissions || 0) + monthlyCommission).toFixed(2));

    this.saveAmbassador(amb);
    return newStore;
  }

  payAmbassadorCommission(ambassadorId, amount, method, ref) {
    const list = this.getAmbassadors();
    const amb = list.find(a => a.id === ambassadorId);
    if (!amb) throw new Error('Embaixador não encontrado.');

    const paidAmount = (amount !== undefined && amount !== null && amount > 0) ? amount : (amb.pendingCommissions || 0);

    // Conforme exigência do sistema: O valor da comissão deve ser ZERADO quando o Super Administrador clicar em efetuar pagamento
    amb.pendingCommissions = 0;
    amb.paidCommissions = Number(((amb.paidCommissions || 0) + paidAmount).toFixed(2));

    if (!amb.payoutHistory) amb.payoutHistory = [];
    amb.payoutHistory.unshift({
      id: 'LIQ-' + Date.now().toString().slice(-6),
      date: new Date().toLocaleDateString('pt-PT') + ' ' + new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      amount: paidAmount,
      method: method || 'M-Pesa',
      receipt: ref || 'MP-' + Math.floor(100000 + Math.random() * 900000),
      status: 'LIQUIDADO'
    });

    this.saveAmbassador(amb);
    return amb;
  }

  // --- SAAS & LOCK ENGINE (TRAVA LRS) ---
  checkStoreLock(storeId) {
    const store = storeId ? this.getStores().find(s => s.id === storeId) || this.getCurrentStore() : this.getCurrentStore();
    if (!store) return { isLocked: false, daysRemaining: 999, reason: '', store: null };

    if (store.acesso_ativo === false) {
      return {
        isLocked: true,
        daysRemaining: 0,
        reason: store.motivo_bloqueio || 'Acesso suspenso pelo administrador do sistema GEF.',
        store
      };
    }

    if (store.data_fim_teste) {
      const now = new Date();
      const expiry = new Date(store.data_fim_teste);
      const diffMs = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        return {
          isLocked: true,
          daysRemaining: diffDays,
          reason: `O período de teste ou mensalidade da loja expirou em ${new Date(store.data_fim_teste).toLocaleDateString('pt-PT')}. Regularize a sua subscrição para continuar a faturar.`,
          store
        };
      }
      return {
        isLocked: false,
        daysRemaining: diffDays,
        reason: '',
        store
      };
    }

    return {
      isLocked: false,
      daysRemaining: 999,
      reason: '',
      store
    };
  }

  updateStoreSaas(storeId, updates) {
    const stores = this.getStores();
    const idx = stores.findIndex(s => s.id === storeId);
    if (idx === -1) return undefined;
    stores[idx] = { ...stores[idx], ...updates };
    this.set(STORAGE_KEYS.STORES, stores);
    return stores[idx];
  }

  toggleStoreAccess(storeId, acessoAtivo, motivo) {
    return this.updateStoreSaas(storeId, {
      acesso_ativo: acessoAtivo,
      motivo_bloqueio: motivo || (acessoAtivo ? undefined : 'Assinatura vencida / Bloqueio administrativo')
    });
  }

  renewStoreSubscription(storeId, daysToAdd = 30) {
    const store = this.getStores().find(s => s.id === storeId);
    if (!store) return undefined;
    const currentExpiry = store.data_fim_teste ? new Date(store.data_fim_teste) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    baseDate.setDate(baseDate.getDate() + daysToAdd);
    return this.updateStoreSaas(storeId, {
      acesso_ativo: true,
      data_fim_teste: baseDate.toISOString().split('T')[0],
      motivo_bloqueio: undefined
    });
  }

  setStoreExpirationDate(storeId, expiryDateStr) {
    const isFuture = new Date(expiryDateStr).getTime() > Date.now();
    return this.updateStoreSaas(storeId, {
      data_fim_teste: expiryDateStr,
      acesso_ativo: isFuture,
      motivo_bloqueio: isFuture ? undefined : 'Assinatura vencida'
    });
  }

  unlockWithMasterCode(storeId, code) {
    const clean = (code || '').trim().toUpperCase();
    if (clean === 'GEF-SUPERADMIN-2026' || clean === 'GEF-MASTER-UNBLOCK' || clean.startsWith('GEF-30D-') || clean.startsWith('GEF-EMERGENCIA-')) {
      const renewed = this.renewStoreSubscription(storeId, 30);
      if (renewed) {
        return { success: true, message: 'Loja desbloqueada com sucesso via Chave Mestre de Emergência (30 dias adicionados).' };
      }
      return { success: false, message: 'Filial não localizada para desbloqueio.' };
    }
    return { success: false, message: 'Código de desbloqueio inválido ou expirado.' };
  }

  // --- DASHBOARD METRICS ---
  getDashboardStats(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const products = this.getProducts(targetStore);
    const customers = this.getCustomers(targetStore);
    const sales = this.getSales(targetStore);
    const quotes = this.getQuotes(targetStore);
    const deliveries = this.getDeliveries(targetStore);
    const losses = this.getLosses(targetStore);

    const todayStr = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = todayStr.slice(0, 7) + '-01';

    const validSales = sales.filter(s => s.status === 'CONCLUIDA' || s.status === 'COMPLETED');
    const todaySales = validSales.filter(s => (s.createdAt || s.timestamp || '').startsWith(todayStr));
    const monthSales = validSales.filter(s => (s.createdAt || s.timestamp || '') >= firstDayOfMonth);

    const totalTodaySales = todaySales.reduce((acc, s) => acc + (s.total || s.totalNet || 0), 0);
    const todaySalesCount = todaySales.length;

    const monthSalesRevenue = monthSales.reduce((acc, s) => acc + (s.total || s.totalNet || 0), 0);
    const monthCogs = monthSales.reduce((acc, s) => acc + (s.totalCogs || 0), 0);
    const monthProfit = monthSalesRevenue - monthCogs;
    const projectedProfitMargin = monthSalesRevenue > 0 ? Number(((monthProfit / monthSalesRevenue) * 100).toFixed(1)) : 0;

    const batches = this.getAllBatches(targetStore);
    const batchCost = batches.reduce((sum, b) => sum + (b.currentQuantityBase * b.costPerBase), 0);
    const productCost = products.reduce((sum, p) => sum + (p.currentStockBase * p.costPriceBase), 0);
    const stockCostTotal = Number((batches.length > 0 ? batchCost : productCost).toFixed(2));
    const stockSaleValuation = Number(products.reduce((sum, p) => sum + (p.currentStockBase * p.salePriceBase), 0).toFixed(2));

    const activeShift = this.getActiveCashSession(targetStore);
    const currentCashInDrawer = activeShift ? (activeShift.expectedCash || 0) : 0;
    const totalRealEquity = Number((stockCostTotal + currentCashInDrawer).toFixed(2));

    const totalReceivable = customers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
    const lowStockList = products.filter(p => p.currentStockBase > 0 && p.currentStockBase <= p.minStockAlert);
    const outOfStockList = products.filter(p => p.currentStockBase <= 0);

    const totalLossCost = losses.reduce((sum, l) => sum + (l.totalLossCost || l.totalCost || 0), 0);

    // Top selling products
    const pMap = {};
    validSales.forEach(s => {
      (s.items || []).forEach(it => {
        const id = it.productId || it.productName;
        const name = it.productName || 'Material';
        const qty = it.quantity || 1;
        const sub = it.total || it.totalPrice || (qty * (it.unitPrice || 0));
        if (!pMap[id]) pMap[id] = { name, total: 0, qty: 0 };
        pMap[id].total += sub;
        pMap[id].qty += qty;
      });
    });
    const topSellingProducts = Object.values(pMap).sort((a, b) => b.total - a.total).slice(0, 5);

    return {
      totalTodaySales,
      todaySalesCount,
      totalRealEquity,
      stockCostTotal,
      stockSaleValuation,
      currentCashInDrawer,
      totalReceivable,
      lowStockCount: lowStockList.length,
      outOfStockCount: outOfStockList.length,
      pendingQuotesCount: quotes.filter(q => q.status === 'PENDENTE').length,
      pendingDeliveriesCount: deliveries.filter(d => d.status !== 'ENTREGUE' && d.status !== 'CANCELADA').length,
      recentSales: sales.slice(0, 8),
      topSellingProducts,
      projectedProfitMargin,
      totalLossCost
    };
  }

  // --- AUDIT LOGS ---
  getAuditLogs(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const list = this.get(STORAGE_KEYS.AUDIT_LOGS, []);
    return list.filter(l => targetStore === 'ALL' || !l.storeId || l.storeId === targetStore);
  }

  addAuditLog(log) {
    const list = this.get(STORAGE_KEYS.AUDIT_LOGS, []);
    list.unshift(log);
    if (list.length > 500) list.pop();
    this.set(STORAGE_KEYS.AUDIT_LOGS, list);
  }

  // --- INVENTORIES & PHYSICAL AUDITING (CONFRONTAÇÃO DE ESTOQUE) ---
  getInventories(storeId) {
    const targetStore = storeId || this.getCurrentStoreId();
    const list = this.get(STORAGE_KEYS.INVENTORIES, []);
    return list.filter(inv => targetStore === 'ALL' || (inv.storeId || 'store-001') === targetStore);
  }

  saveInventoryAudit({ storeId, operatorName, items, notes, reconcile }) {
    const targetStore = storeId || this.getCurrentStoreId();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const code = `INV-${dateStr}-${randPart}`;

    const products = this.getProducts();
    let totalItemsAudited = items.length;
    let totalDivergentItems = 0;
    let totalDivergenceValue = 0;

    const auditedItems = items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      const systemStock = item.systemStock ?? (prod?.currentStockBase || 0);
      const physicalStock = Number(item.physicalStock ?? systemStock);
      const diff = Number((physicalStock - systemStock).toFixed(3));
      const unitCost = prod?.costPriceBase || 0;
      const diffValue = Number((diff * unitCost).toFixed(2));

      if (diff !== 0) {
        totalDivergentItems++;
        totalDivergenceValue += diffValue;
      }

      // If reconciliation is confirmed, adjust system stocks
      if (reconcile && prod) {
        prod.currentStockBase = physicalStock;
        const loc = item.location || 'LOJA';
        if (!prod.stockByLocation) {
          prod.stockByLocation = { LOJA: physicalStock, ARMAZEM: 0, PATIO: 0 };
        }
        prod.stockByLocation[loc] = Math.max(0, (prod.stockByLocation[loc] || 0) + diff);
      }

      return {
        productId: item.productId,
        productCode: item.productCode || prod?.code,
        productName: item.productName || prod?.name,
        baseUnit: item.baseUnit || prod?.baseUnit || 'UN',
        location: item.location || 'LOJA',
        systemStock,
        physicalStock,
        divergence: diff,
        unitCost,
        diffValue
      };
    });

    if (reconcile) {
      this.set(STORAGE_KEYS.PRODUCTS, products);
    }

    const inventoryRecord = {
      id: 'inv-' + Date.now(),
      code,
      storeId: targetStore,
      operatorName: operatorName || 'Auditor',
      timestamp: now.toISOString(),
      notes: notes || '',
      reconciled: !!reconcile,
      totalItemsAudited,
      totalDivergentItems,
      totalDivergenceValue: Number(totalDivergenceValue.toFixed(2)),
      items: auditedItems
    };

    const inventories = this.get(STORAGE_KEYS.INVENTORIES, []);
    inventories.unshift(inventoryRecord);
    this.set(STORAGE_KEYS.INVENTORIES, inventories);

    // Register in Audit Logs
    this.addAuditLog({
      id: 'audit-' + Date.now(),
      storeId: targetStore,
      action: reconcile ? 'INVENTARIO_CONCILIADO' : 'INVENTARIO_CONFRONTACAO',
      entity: 'inventories',
      entityId: inventoryRecord.id,
      details: `${reconcile ? 'Ajuste e conciliação de inventário' : 'Confrontação de inventário físico'} [${code}]. ${totalItemsAudited} itens auditados, ${totalDivergentItems} divergentes. Impacto financeiro: ${totalDivergenceValue.toFixed(2)} MT. Responsável: ${operatorName}.`,
      createdAt: now.toISOString()
    });

    return inventoryRecord;
  }
}

export const db = new GefDatabase();
