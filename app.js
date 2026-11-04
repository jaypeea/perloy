(() => {
  'use strict';

  const STORAGE_KEY = 'perloy_dictionary_state_v1';
  const OLD_KEYS = ['smartstock_inventory_state_v2', 'smartstock_step1_state_v1'];
  const LEGACY_USD_TO_PHP = 63.049;
  const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
  const integer = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });
  const dateLabel = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });
  const $ = id => document.getElementById(id);
  const copy = value => JSON.parse(JSON.stringify(value));
  const text = value => String(value ?? '').trim();
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  const SCHEMA = {
    tblProduct: [
      ['ProductID', 'Int', '5', 'Unique ID number of the product'],
      ['ProductSKU', 'Varchar', '9', 'Unique SKU using the SKU- prefix and an entered numeric suffix'],
      ['ProductName', 'Varchar', '50', 'Name of the product'],
      ['ProductPrice', 'Double', 'Not listed', 'Price of the product, in PHP'],
      ['ProductDescription', 'Varchar', '100', 'Description of the product']
    ],
    tblSupplier: [
      ['SupplierID', 'Int', '5', 'Unique ID number of the supplier'],
      ['SupplierName', 'Varchar', 'Not listed', 'Name of the supplier'],
      ['SupplierAddress', 'Varchar', 'Not listed', 'Address of the supplier'],
      ['SupplierContact', 'Integer', '15', 'Contact number of the supplier']
    ],
    tblStock: [
      ['StockID', 'Int', '5', 'Stock record ID'],
      ['ProductID', 'Int', '5', 'ID of the product'],
      ['StockQty', 'Int', 'Not listed', 'Quantity of the stock'],
      ['Remarks', 'Varchar', 'Not listed', 'Stock remarks']
    ],
    tblSales: [
      ['TransacNo', 'Int', '5', 'Transaction number'],
      ['CustomerName', 'Varchar', '100', 'Name entered when the sale is recorded'],
      ['Date', 'Date', 'Not listed', 'Date of the transaction'],
      ['ProductID', 'Int', '5', 'ID of the product'],
      ['Qty', 'Int', 'Not listed', 'Quantity sold'],
      ['TotalPrice', 'Double', 'Not listed', 'Total price, in PHP']
    ],
    tblSupply: [
      ['SupplyID', 'Int', '5', 'ID number of the supply'],
      ['ProductID', 'Int', '5', 'ID of the product'],
      ['SupplierID', 'Int', '5', 'ID of the supplier'],
      ['Qty', 'Int', 'Not listed', 'Quantity received'],
      ['DateAdded', 'Date', 'Not listed', 'Date the supply was added']
    ]
  };

  function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const EMPTY_DATA = {
    schemaVersion: 4,
    tblProduct: [],
    tblSupplier: [],
    tblStock: [],
    tblSales: [],
    tblSupply: []
  };
  // Fingerprints let the first version's built-in sample rows be removed during upgrade.
  const STARTER_ROWS = {
    products: [
      { ProductID: 10001, ProductName: 'Industrial thermal printer', ProductType: 'Printing equipment', ProductPrice: 22945.75, ProductDescription: 'Direct thermal unit for dispatch labels.', CriticalLvl: 24 },
      { ProductID: 10002, ProductName: 'Wireless barcode scanner', ProductType: 'Scanning equipment', ProductPrice: 6810.4, ProductDescription: 'Bluetooth scanner with charging cradle.', CriticalLvl: 18 },
      { ProductID: 10003, ProductName: 'Heavy-duty shipping scale', ProductType: 'Weighing equipment', ProductPrice: 10580.25, ProductDescription: 'Platform scale for warehouse parcels.', CriticalLvl: 16 },
      { ProductID: 10004, ProductName: 'RFID inventory tag roll', ProductType: 'Consumables', ProductPrice: 3604.8, ProductDescription: 'Roll of 500 adhesive RFID tags.', CriticalLvl: 40 }
    ],
    suppliers: [
      { SupplierID: 20001, SupplierName: 'Metrobyte Office Systems', SupplierAddress: 'Makati City', SupplierContact: '+63 2 8796 4210' },
      { SupplierID: 20002, SupplierName: 'Northline Warehouse Supply', SupplierAddress: 'Caloocan City', SupplierContact: '+63 2 8365 7184' }
    ],
    stocks: [
      { StockID: 30001, ProductID: 10001, StockQty: 95, Remarks: 'Ready for dispatch' },
      { StockID: 30002, ProductID: 10002, StockQty: 48, Remarks: 'Charging cradles included' },
      { StockID: 30003, ProductID: 10003, StockQty: 14, Remarks: 'Check reorder before next batch' },
      { StockID: 30004, ProductID: 10004, StockQty: 160, Remarks: '500 tags per roll' }
    ],
    sales: [
      { TransacNo: 40001, CustomerName: 'Rafael Santos', ProductID: 10002, Qty: 3, TotalPrice: 20431.2 },
      { TransacNo: 40002, CustomerName: 'Sofia Mercado', ProductID: 10001, Qty: 1, TotalPrice: 22945.75 },
      { TransacNo: 40003, CustomerName: 'Mika Reyes', ProductID: 10004, Qty: 6, TotalPrice: 21628.8 }
    ],
    supplies: [
      { SupplyID: 50001, ProductID: 10001, SupplierID: 20001, Qty: 20 },
      { SupplyID: 50002, ProductID: 10004, SupplierID: 20002, Qty: 80 }
    ]
  };

  let data = copy(EMPTY_DATA);
  let toastTimer;
  let stateNotice = '';

  function validDictionary(value) {
    return value && [1, 2, 3, 4].includes(value.schemaVersion) && Object.keys(SCHEMA).every(table => Array.isArray(value[table]));
  }

  function normalizeDictionary(value) {
    const normalized = copy(EMPTY_DATA);
    for (const table of Object.keys(SCHEMA)) {
      normalized[table] = value[table].filter(row => row && typeof row === 'object').map(row => ({ ...row }));
    }
    const oldCustomerNames = new Map((Array.isArray(value.tblCustomer) ? value.tblCustomer : []).map(customer => [
      String(customer.CustomID), `${text(customer.CustomFirstName)} ${text(customer.CustomLastName)}`.trim()
    ]));
    normalized.tblSupplier.forEach(row => { row.SupplierContact = String(row.SupplierContact ?? ''); });
    normalized.tblProduct.forEach(row => {
      row.ProductID = Number(row.ProductID);
      row.ProductPrice = Number(row.ProductPrice) || 0;
      row.CriticalLvl = Number(row.CriticalLvl) || 0;
    });
    normalized.tblStock.forEach(row => { row.StockID = Number(row.StockID); row.ProductID = Number(row.ProductID); row.StockQty = Number(row.StockQty) || 0; });
    normalized.tblSales.forEach(row => {
      row.TransacNo = Number(row.TransacNo);
      row.CustomerName = text(row.CustomerName) || oldCustomerNames.get(String(row.CustomID)) || '';
      delete row.CustomID;
      row.ProductID = Number(row.ProductID); row.Qty = Number(row.Qty) || 0; row.TotalPrice = Number(row.TotalPrice) || 0;
    });
    normalized.tblSupply.forEach(row => {
      row.SupplyID = Number(row.SupplyID); row.ProductID = Number(row.ProductID);
      row.SupplierID = Number(row.SupplierID); row.Qty = Number(row.Qty) || 0;
    });
    return normalized;
  }

  function migrateOldState(old, wasUsd) {
    const migrated = copy(EMPTY_DATA);
    const products = Array.isArray(old.products) ? old.products.slice(0, 8999) : [];
    const sales = Array.isArray(old.transactions) ? old.transactions : [];
    const toPhp = value => Math.round((Number(value) || 0) * (wasUsd ? LEGACY_USD_TO_PHP : 1) * 100) / 100;
    const productIdByName = new Map();

    products.forEach((product, index) => {
      const productId = index + 1;
      const name = text(product.name) || `Migrated product ${index + 1}`;
      productIdByName.set(name.toLowerCase(), productId);
      migrated.tblProduct.push({
        ProductID: productId,
        ProductName: name.slice(0, 50),
        ProductType: text(product.type) || 'General merchandise',
        ProductPrice: toPhp(product.price),
        ProductDescription: ''
      });
      migrated.tblStock.push({
        StockID: index + 1,
        ProductID: productId,
        StockQty: Math.max(0, Math.round(Number(product.stock) || 0)),
        Remarks: ''
      });
    });

    const suppliersByName = new Map();
    let salesId = 1;
    let supplyId = 1;
    sales.forEach(transaction => {
      const productId = productIdByName.get(text(transaction.productName).toLowerCase());
      if (!productId) return;
      const quantity = Math.max(1, Math.round(Number(transaction.qty) || 1));
      const transactionDate = text(transaction.date || transaction.Date || transaction.DateAdded);
      if (transaction.type === 'SALE') {
        const product = migrated.tblProduct.find(item => item.ProductID === productId);
        const amount = transaction.amount == null ? Number(product.ProductPrice) * quantity : transaction.amount;
        migrated.tblSales.push({
          TransacNo: salesId++, CustomerName: text(transaction.customerName || transaction.customer).slice(0, 100),
          Date: transactionDate, ProductID: productId, Qty: quantity, TotalPrice: toPhp(amount)
        });
      } else {
        const supplierName = text(transaction.supplierName);
        let supplierId = 0;
        if (supplierName) {
          if (!suppliersByName.has(supplierName.toLocaleLowerCase())) {
            supplierId = migrated.tblSupplier.length + 1;
            suppliersByName.set(supplierName.toLocaleLowerCase(), supplierId);
            migrated.tblSupplier.push({ SupplierID: supplierId, SupplierName: supplierName, SupplierAddress: '', SupplierContact: '' });
          }
          supplierId = suppliersByName.get(supplierName.toLocaleLowerCase());
        }
        migrated.tblSupply.push({ SupplyID: supplyId++, ProductID: productId, SupplierID: supplierId, Qty: quantity, DateAdded: transactionDate });
      }
    });
    return migrated;
  }

  function removeSeedRecords(upgrading = false) {
    const salesCount = data.tblSales.length;
    const supplyCount = data.tblSupply.length;
    const isSeedProduct = product => STARTER_ROWS.products.some(seed => seed.ProductID === product.ProductID &&
      seed.ProductName === product.ProductName && seed.ProductType === product.ProductType &&
      seed.ProductPrice === product.ProductPrice && seed.ProductDescription === product.ProductDescription && seed.CriticalLvl === product.CriticalLvl);
    const isSeedSupplier = supplier => STARTER_ROWS.suppliers.some(seed => seed.SupplierID === supplier.SupplierID &&
      seed.SupplierName === supplier.SupplierName && seed.SupplierAddress === supplier.SupplierAddress && seed.SupplierContact === supplier.SupplierContact);
    const isSeedSale = sale => STARTER_ROWS.sales.some(seed => seed.TransacNo === sale.TransacNo &&
      seed.CustomerName === sale.CustomerName && seed.ProductID === sale.ProductID && seed.Qty === sale.Qty && seed.TotalPrice === sale.TotalPrice);
    const isSeedSupply = supply => STARTER_ROWS.supplies.some(seed => {
      const seedSupplierName = STARTER_ROWS.suppliers.find(item => item.SupplierID === seed.SupplierID)?.SupplierName;
      const supplier = data.tblSupplier.find(item => item.SupplierID === seed.SupplierID);
      return seed.SupplyID === supply.SupplyID && seed.ProductID === supply.ProductID &&
        seed.SupplierID === supply.SupplierID && seed.Qty === supply.Qty &&
        (!supplier || supplier.SupplierName === seedSupplierName);
    });
    data.tblSales = data.tblSales.filter(sale => !isSeedSale(sale));
    data.tblSupply = data.tblSupply.filter(supply => !isSeedSupply(supply));
    const removedTransactions = salesCount !== data.tblSales.length || supplyCount !== data.tblSupply.length;

    const usedProductIds = new Set([
      ...data.tblSales.map(sale => sale.ProductID),
      ...data.tblSupply.map(supply => supply.ProductID)
    ]);
    const hasEnteredStock = product => {
      const stock = data.tblStock.find(item => item.ProductID === product.ProductID);
      const seed = STARTER_ROWS.stocks.find(item => item.ProductID === product.ProductID);
      return stock && seed && (stock.StockID !== seed.StockID || stock.StockQty !== seed.StockQty || text(stock.Remarks) !== seed.Remarks);
    };
    const productsBefore = data.tblProduct.length;
    const dataSeedProducts = data.tblProduct.filter(product => isSeedProduct(product) && (usedProductIds.has(product.ProductID) || hasEnteredStock(product)));
    data.tblProduct = data.tblProduct.filter(product => !isSeedProduct(product) || usedProductIds.has(product.ProductID) || hasEnteredStock(product));
    const suppliersBefore = data.tblSupplier.length;
    data.tblSupplier = data.tblSupplier.filter(supplier => !isSeedSupplier(supplier) || data.tblSupply.some(supply => supply.SupplierID === supplier.SupplierID));
    const productIds = new Set(data.tblProduct.map(product => product.ProductID));
    const stockBefore = data.tblStock.length;
    data.tblStock = data.tblStock.filter(stock => productIds.has(stock.ProductID));

    if (upgrading || removedTransactions) {
      data.tblProduct.filter(product => dataSeedProducts.includes(product) && usedProductIds.has(product.ProductID)).forEach(product => {
        const stock = data.tblStock.find(item => item.ProductID === product.ProductID);
        if (!stock || !STARTER_ROWS.stocks.some(seed => seed.StockID === stock.StockID && seed.ProductID === stock.ProductID)) return;
        const supplied = data.tblSupply.filter(item => item.ProductID === product.ProductID).reduce((sum, item) => sum + item.Qty, 0);
        const sold = data.tblSales.filter(item => item.ProductID === product.ProductID).reduce((sum, item) => sum + item.Qty, 0);
        stock.StockQty = Math.max(0, supplied - sold);
        stock.Remarks = '';
      });
    }
    return removedTransactions || productsBefore !== data.tblProduct.length || suppliersBefore !== data.tblSupplier.length || stockBefore !== data.tblStock.length;
  }

  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!validDictionary(parsed)) throw new Error('The saved data does not match the current table structure.');
        data = normalizeDictionary(parsed);
        const removedSeeds = removeSeedRecords(parsed.schemaVersion === 1);
        normalizeProductSkus();
        if (!saveData()) {
          stateNotice = 'Saved data could not be updated. The browser’s previous records remain unchanged.';
          return;
        }
        if (removedSeeds) stateNotice = 'Starter records were removed. Your recorded products, sales, and receipts remain saved.';
        else if (parsed.schemaVersion === 1) stateNotice = 'Sales now store the customer name directly. Saved customer names were carried over.';
        return;
      }
      for (const oldKey of OLD_KEYS) {
        const oldValue = localStorage.getItem(oldKey);
        if (!oldValue) continue;
        const parsed = JSON.parse(oldValue);
        if (!Array.isArray(parsed.products)) continue;
        data = migrateOldState(parsed, oldKey === 'smartstock_step1_state_v1');
        normalizeProductSkus();
        if (!saveData()) {
          stateNotice = 'Saved data could not be updated. The browser’s previous records remain unchanged.';
          return;
        }
        stateNotice = 'Previous inventory records were carried over. Only transactions entered in the earlier log appear here.';
        return;
      }
      data = copy(EMPTY_DATA);
      saveData();
    } catch (error) {
      data = copy(EMPTY_DATA);
      stateNotice = 'Saved data could not be read. The ledger is empty, and the browser’s saved data was left untouched.';
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      setNotice('Changes are visible in this tab but could not be saved in browser storage. Export a copy before closing.', true);
      return false;
    }
  }

  function setNotice(message, isError = false) {
    const notice = $('appNotice');
    notice.textContent = message;
    notice.classList.toggle('notice-error', isError);
    notice.hidden = false;
  }

  function notify(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  function commit(message) {
    const saved = saveData();
    renderAll();
    if (saved) notify(message);
  }

  function nextIntId(table, field) {
    const max = data[table].reduce((largest, row) => Math.max(largest, Number(row[field]) || 0), 0);
    if (max >= 99999) throw new Error(`${field} has reached the five-digit ID limit.`);
    return max + 1;
  }

  function productStock(productId) {
    return data.tblStock.find(stock => Number(stock.ProductID) === Number(productId));
  }

  function normalizeProductSkus() {
    const used = new Set();
    data.tblProduct.forEach(product => {
      const existingSuffix = Number(String(product.ProductSKU || '').match(/^SKU-(\d{1,5})$/i)?.[1]);
      let suffix = Number.isInteger(existingSuffix) && existingSuffix >= 1 && existingSuffix <= 99999
        ? existingSuffix
        : Math.min(99999, Math.max(1, Number(product.ProductID) || 1));
      let sku = `SKU-${suffix}`;
      while (used.has(sku.toLocaleLowerCase())) {
        suffix = suffix === 99999 ? 1 : suffix + 1;
        sku = `SKU-${suffix}`;
      }
      product.ProductSKU = sku;
      delete product.ProductType;
      delete product.CriticalLvl;
      used.add(sku.toLocaleLowerCase());
    });
  }

  function productById(productId) {
    return data.tblProduct.find(product => Number(product.ProductID) === Number(productId));
  }

  function supplierName(supplierId) {
    return data.tblSupplier.find(item => Number(item.SupplierID) === Number(supplierId))?.SupplierName || 'Unknown supplier';
  }

  function formatMoney(value) { return money.format(Number(value) || 0); }
  function formatDate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Date unavailable';
    return dateLabel.format(new Date(`${value}T00:00:00`));
  }
  function countLabel(count, noun) { return `${integer.format(count)} ${noun}${count === 1 ? '' : 's'}`; }

  function renderMetrics() {
    const units = data.tblStock.reduce((total, stock) => total + (Number(stock.StockQty) || 0), 0);
    const outOfStock = data.tblProduct.filter(product => (productStock(product.ProductID)?.StockQty ?? 0) <= 0).length;
    const salesValue = data.tblSales.reduce((total, sale) => total + (Number(sale.TotalPrice) || 0), 0);
    $('metricProducts').textContent = integer.format(data.tblProduct.length);
    $('metricUnits').textContent = integer.format(units);
    $('metricOutOfStock').textContent = integer.format(outOfStock);
    $('metricSales').textContent = formatMoney(salesValue);
    $('salesNavCount').textContent = integer.format(data.tblSales.length);
    $('suppliesNavCount').textContent = integer.format(data.tblSupply.length);
    $('suppliersNavCount').textContent = integer.format(data.tblSupplier.length);
  }

  function renderInventory() {
    const search = text($('inventorySearch').value).toLocaleLowerCase();
    const filter = $('stockFilter').value;
    const products = data.tblProduct.filter(product => {
      const stock = productStock(product.ProductID);
      const haystack = [product.ProductName, product.ProductSKU, product.ProductDescription, stock?.Remarks, product.ProductID].join(' ').toLocaleLowerCase();
      const isOutOfStock = (stock?.StockQty ?? 0) <= 0;
      return haystack.includes(search) && (filter === 'all' || (filter === 'out' ? isOutOfStock : !isOutOfStock));
    });
    $('inventoryRows').innerHTML = products.map(product => {
      const stock = productStock(product.ProductID) || { StockQty: 0, Remarks: '' };
      const isOutOfStock = stock.StockQty <= 0;
      const stockMarkup = `<span class="stock-number">${integer.format(stock.StockQty)}</span><span class="status ${isOutOfStock ? 'status-out' : 'status-ready'}">${isOutOfStock ? 'Out of stock' : 'In stock'}</span>`;
      return `<tr>
        <td><div class="primary-cell">${escapeHtml(product.ProductName)}</div>${stock.Remarks ? `<div class="secondary-cell">${escapeHtml(stock.Remarks)}</div>` : ''}</td>
        <td class="sku-cell" translate="no">${escapeHtml(product.ProductSKU)}</td>
        <td class="numeric stock-cell">${stockMarkup}</td>
        <td class="numeric price-cell">${formatMoney(product.ProductPrice)}</td>
        <td class="actions-cell">
          <button class="row-action" type="button" data-action="sell" data-id="${product.ProductID}" aria-label="Record a sale of ${escapeHtml(product.ProductName)}">Sell</button>
          <button class="row-action" type="button" data-action="receive" data-id="${product.ProductID}" aria-label="Receive ${escapeHtml(product.ProductName)}">Receive</button>
          <button class="row-action" type="button" data-action="edit-product" data-id="${product.ProductID}" aria-label="Edit ${escapeHtml(product.ProductName)}">Edit</button>
          <button class="row-action row-action-danger" type="button" data-action="delete-product" data-id="${product.ProductID}" aria-label="Delete ${escapeHtml(product.ProductName)}">Delete</button>
        </td>
      </tr>`;
    }).join('');
    const noResults = products.length === 0;
    $('inventoryEmpty').hidden = !noResults;
    $('inventoryEmptyMessage').textContent = data.tblProduct.length === 0 ? 'Add a product to begin tracking stock.' : 'Try another product name or clear the current filters.';
    const hasCatalog = data.tblProduct.length > 0;
    const hasFilters = Boolean(search) || filter !== 'all';
    $('emptyAddProduct').hidden = !noResults || (hasCatalog && !hasFilters);
    $('emptyAddProduct').textContent = hasCatalog ? 'Clear search and filters' : 'Add a product';
    $('inventoryRows').closest('table').hidden = noResults;
  }

  function fillSelect(selectId, rows, valueField, labelFor, prompt) {
    const select = $(selectId);
    const oldValue = select.value;
    select.innerHTML = `<option value="">${escapeHtml(prompt)}</option>` + rows.map(row => `<option value="${escapeHtml(row[valueField])}">${escapeHtml(labelFor(row))}</option>`).join('');
    select.disabled = rows.length === 0;
    if (rows.some(row => String(row[valueField]) === oldValue)) select.value = oldValue;
  }

  function renderSelects() {
    const products = data.tblProduct.map(product => ({ ...product, StockQty: productStock(product.ProductID)?.StockQty ?? 0 }));
    fillSelect('saleProduct', products, 'ProductID', product => `${product.ProductName} · ${integer.format(product.StockQty)} on hand`, 'Choose a product');
    fillSelect('supplyProduct', products, 'ProductID', product => `${product.ProductName} · ${integer.format(product.StockQty)} on hand`, 'Choose a product');
    fillSelect('supplySupplier', data.tblSupplier, 'SupplierID', supplier => supplier.SupplierName, 'Choose a supplier');
    $('saveSale').disabled = !products.length;
    $('saleRecovery').hidden = products.length > 0;
    $('saveSupply').disabled = !products.length || !data.tblSupplier.length;
    $('supplyRecovery').hidden = data.tblSupplier.length > 0;
    updateSaleTotal();
  }

  function renderSales() {
    const rows = [...data.tblSales].sort((a, b) => b.TransacNo - a.TransacNo);
    $('saleCount').textContent = countLabel(rows.length, 'record');
    $('salesEmpty').hidden = rows.length > 0;
    $('salesRows').closest('table').hidden = rows.length === 0;
    $('salesRows').innerHTML = rows.map(sale => {
      const product = productById(sale.ProductID);
      return `<tr>
        <td><div class="primary-cell">${escapeHtml(formatDate(sale.Date))}</div><div class="secondary-cell">#${integer.format(sale.TransacNo)}</div></td>
        <td>${escapeHtml(sale.CustomerName || 'Not provided')}</td>
        <td>${escapeHtml(product?.ProductName || 'Deleted product')}</td>
        <td class="numeric">${integer.format(sale.Qty)}</td>
        <td class="numeric price-cell">${formatMoney(sale.TotalPrice)}</td>
      </tr>`;
    }).join('');
  }

  function renderSupplies() {
    const rows = [...data.tblSupply].sort((a, b) => b.SupplyID - a.SupplyID);
    $('supplyCount').textContent = countLabel(rows.length, 'record');
    $('suppliesEmpty').hidden = rows.length > 0;
    $('suppliesRows').closest('table').hidden = rows.length === 0;
    $('suppliesRows').innerHTML = rows.map(supply => {
      const product = productById(supply.ProductID);
      return `<tr>
        <td><div class="primary-cell">${escapeHtml(formatDate(supply.DateAdded))}</div><div class="secondary-cell">#${integer.format(supply.SupplyID)}</div></td>
        <td>${escapeHtml(supplierName(supply.SupplierID))}</td>
        <td>${escapeHtml(product?.ProductName || 'Deleted product')}</td>
        <td class="numeric">${integer.format(supply.Qty)}</td>
      </tr>`;
    }).join('');
  }

  function renderSuppliers() {
    const rows = data.tblSupplier;
    $('suppliersEmpty').hidden = rows.length > 0;
    $('supplierRows').closest('table').hidden = rows.length === 0;
    $('supplierRows').innerHTML = rows.map(supplier => `
      <tr>
        <td><div class="primary-cell">${escapeHtml(supplier.SupplierName)}</div><div class="secondary-cell">ID ${integer.format(supplier.SupplierID)}</div></td>
        <td>${escapeHtml(supplier.SupplierAddress || 'Not provided')}</td>
        <td class="contact-cell">${escapeHtml(supplier.SupplierContact || 'Not provided')}</td>
        <td class="actions-cell"><button class="row-action" type="button" data-action="edit-supplier" data-id="${supplier.SupplierID}">Edit</button><button class="row-action row-action-danger" type="button" data-action="delete-supplier" data-id="${supplier.SupplierID}">Delete</button></td>
      </tr>`).join('');
  }

  function renderSchema() {
    $('schemaContent').innerHTML = Object.entries(SCHEMA).map(([table, fields]) => `
      <section class="schema-table">
        <h3 translate="no">${table}</h3>
        <div class="schema-scroll"><table><thead><tr><th scope="col">Field name</th><th scope="col">Data type</th><th scope="col">Size</th><th scope="col">Description</th></tr></thead>
        <tbody>${fields.map(([field, type, size, description]) => `<tr><td><code translate="no">${field}</code></td><td>${type}</td><td>${size}</td><td>${escapeHtml(description)}</td></tr>`).join('')}</tbody></table></div>
      </section>`).join('');
  }

  function renderAll() {
    renderMetrics();
    renderInventory();
    renderSelects();
    renderSales();
    renderSupplies();
    renderSuppliers();
    $('mainContent').setAttribute('aria-busy', 'false');
  }

  function setDateDefaults() {
    const today = localDate();
    $('todayLabel').textContent = dateLabel.format(new Date(`${today}T00:00:00`)).toLocaleUpperCase('en-PH');
    $('saleDate').value = today;
    $('supplyDate').value = today;
  }

  function updateSaleTotal() {
    const product = productById($('saleProduct').value);
    const quantity = Math.max(0, Number($('saleQty').value) || 0);
    $('saleTotal').textContent = formatMoney(product ? product.ProductPrice * quantity : 0);
    const stock = product && productStock(product.ProductID);
    $('saleQty').max = stock ? String(stock.StockQty) : '0';
  }

  function openDialog(dialogId) {
    const dialog = $(dialogId);
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('input:not([type="hidden"]), textarea, select')?.focus();
  }

  function closeDialogs() {
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  }

  function clearError(id) {
    const error = $(id);
    error.textContent = '';
    error.hidden = true;
  }

  function showError(id, message) {
    const error = $(id);
    error.textContent = message;
    error.hidden = false;
  }

  function navigate(view) {
    document.querySelectorAll('.nav-link').forEach(button => {
      if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('.view').forEach(section => { section.hidden = section.id !== `view-${view}`; });
  }

  function openSaleFor(productId) {
    navigate('sales');
    $('saleProduct').value = String(productId);
    $('saleQty').value = '1';
    updateSaleTotal();
    $('saleCustomer').focus();
  }

  function openSupplyFor(productId) {
    navigate('supplies');
    $('supplyProduct').value = String(productId);
    if (data.tblSupplier.length) $('supplySupplier').value = String(data.tblSupplier[0].SupplierID);
    $('supplyQty').value = '1';
    $('supplySupplier').focus();
  }

  function resetProductForm() {
    $('productForm').reset();
    $('productId').value = '';
    $('productSkuNumber').readOnly = false;
    $('productSkuNumber').value = '';
    $('productSkuHint').textContent = 'Enter a unique number from 1 to 99999.';
    $('productDialogTitle').textContent = 'Add product';
    $('saveProduct').textContent = 'Save product';
    $('productError').hidden = true;
    $('stockQty').value = '0';
    $('deleteProduct').hidden = true;
  }

  function editProduct(productId) {
    const product = productById(productId);
    if (!product) return;
    const stock = productStock(productId) || {};
    $('productId').value = product.ProductID;
    $('productSkuNumber').value = product.ProductSKU.replace(/^SKU-/i, '');
    $('productSkuNumber').readOnly = false;
    $('productSkuHint').textContent = 'Enter a unique number from 1 to 99999. Sales and stock remain linked to the internal product ID.';
    $('productName').value = product.ProductName;
    $('productPrice').value = product.ProductPrice;
    $('productDescription').value = product.ProductDescription;
    $('stockQty').value = stock.StockQty ?? 0;
    $('stockRemarks').value = stock.Remarks || '';
    $('productDialogTitle').textContent = 'Edit product';
    $('saveProduct').textContent = 'Save changes';
    $('deleteProduct').hidden = false;
    clearError('productError');
    openDialog('productDialog');
  }

  function editSupplier(supplierId) {
    const supplier = data.tblSupplier.find(item => Number(item.SupplierID) === Number(supplierId));
    if (!supplier) return;
    $('supplierId').value = supplier.SupplierID;
    $('supplierName').value = supplier.SupplierName;
    $('supplierAddress').value = supplier.SupplierAddress;
    $('supplierContact').value = supplier.SupplierContact;
    $('supplierDialogTitle').textContent = 'Edit supplier';
    clearError('supplierError');
    openDialog('supplierDialog');
  }

  function saveProduct(event) {
    event.preventDefault();
    clearError('productError');
    const editId = Number($('productId').value) || null;
    const skuNumber = Number($('productSkuNumber').value);
    const sku = `SKU-${skuNumber}`;
    const name = text($('productName').value);
    const price = Number($('productPrice').value);
    const stockQty = Number($('stockQty').value);
    if (!name || !Number.isInteger(skuNumber) || skuNumber < 1 || skuNumber > 99999 || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stockQty) || stockQty < 0) {
      showError('productError', 'Enter a product name, a SKU number from 1 to 99999, a positive price, and a whole-number stock quantity.');
      return;
    }
    const duplicateSku = data.tblProduct.find(product => product.ProductSKU?.toLocaleLowerCase() === sku.toLocaleLowerCase() && product.ProductID !== editId);
    if (duplicateSku) {
      showError('productError', `${sku} is already assigned to ${duplicateSku.ProductName}.`);
      $('productSkuNumber').focus();
      return;
    }
    const duplicate = data.tblProduct.find(product => product.ProductName.toLocaleLowerCase() === name.toLocaleLowerCase() && product.ProductID !== editId);
    if (duplicate) {
      showError('productError', 'A product with this name already exists.');
      $('productName').focus();
      return;
    }
    const fields = {
      ProductSKU: sku,
      ProductName: name.slice(0, 50),
      ProductPrice: Math.round(price * 100) / 100,
      ProductDescription: text($('productDescription').value).slice(0, 100)
    };
    try {
      if (editId) {
        const product = productById(editId);
        Object.assign(product, fields);
        const stock = productStock(editId);
        if (stock) {
          stock.StockQty = stockQty;
          stock.Remarks = text($('stockRemarks').value);
        } else {
          data.tblStock.push({ StockID: nextIntId('tblStock', 'StockID'), ProductID: editId, StockQty: stockQty, Remarks: text($('stockRemarks').value) });
        }
      } else {
        const productId = nextIntId('tblProduct', 'ProductID');
        data.tblProduct.push({ ProductID: productId, ...fields });
        data.tblStock.push({ StockID: nextIntId('tblStock', 'StockID'), ProductID: productId, StockQty: stockQty, Remarks: text($('stockRemarks').value) });
      }
    } catch (error) {
      showError('productError', error.message);
      return;
    }
    closeDialogs();
    commit(editId ? 'Product changes saved.' : 'Product added to inventory.');
  }

  function saveSupplier(event) {
    event.preventDefault();
    clearError('supplierError');
    const name = text($('supplierName').value);
    if (!name) return showError('supplierError', 'Enter a supplier name.');
    const editId = Number($('supplierId').value) || null;
    const duplicate = data.tblSupplier.find(supplier => supplier.SupplierName.toLocaleLowerCase() === name.toLocaleLowerCase() && supplier.SupplierID !== editId);
    if (duplicate) return showError('supplierError', 'A supplier with this name already exists.');
    const fields = {
      SupplierName: name, SupplierAddress: text($('supplierAddress').value),
      SupplierContact: text($('supplierContact').value).slice(0, 15)
    };
    try {
      if (editId) Object.assign(data.tblSupplier.find(supplier => supplier.SupplierID === editId), fields);
      else data.tblSupplier.push({ SupplierID: nextIntId('tblSupplier', 'SupplierID'), ...fields });
    } catch (error) { return showError('supplierError', error.message); }
    closeDialogs();
    commit(editId ? 'Supplier changes saved.' : 'Supplier added.');
  }

  function recordSale(event) {
    event.preventDefault();
    $('saleError').hidden = true;
    const customerName = text($('saleCustomer').value).slice(0, 100);
    const productId = Number($('saleProduct').value);
    const quantity = Number($('saleQty').value);
    const product = productById(productId);
    const stock = product && productStock(productId);
    if (!customerName || !product || !stock) return showError('saleError', 'Enter a customer name and choose a product before saving the sale.');
    if (!Number.isInteger(quantity) || quantity < 1) return showError('saleError', 'Quantity must be a whole number greater than zero.');
    if (quantity > stock.StockQty) return showError('saleError', `Only ${integer.format(stock.StockQty)} units are available. Reduce the quantity or record a supply first.`);
    if (!$('saleDate').value) return showError('saleError', 'Choose the sale date.');
    try {
      data.tblSales.push({
        TransacNo: nextIntId('tblSales', 'TransacNo'), CustomerName: customerName, Date: $('saleDate').value,
        ProductID: productId, Qty: quantity, TotalPrice: Math.round(product.ProductPrice * quantity * 100) / 100
      });
    } catch (error) { return showError('saleError', error.message); }
    stock.StockQty -= quantity;
    $('saleCustomer').value = '';
    $('saleProduct').value = '';
    $('saleQty').value = '1';
    $('saleDate').value = localDate();
    commit('Sale recorded and stock updated.');
  }

  function recordSupply(event) {
    event.preventDefault();
    $('supplyError').hidden = true;
    const supplierId = Number($('supplySupplier').value);
    const productId = Number($('supplyProduct').value);
    const quantity = Number($('supplyQty').value);
    const product = productById(productId);
    const stock = product && productStock(productId);
    if (!supplierId || !data.tblSupplier.some(supplier => supplier.SupplierID === supplierId) || !product || !stock) return showError('supplyError', 'Choose a supplier and product before saving the receipt.');
    if (!Number.isInteger(quantity) || quantity < 1) return showError('supplyError', 'Quantity must be a whole number greater than zero.');
    if (!$('supplyDate').value) return showError('supplyError', 'Choose the date the supply was added.');
    try {
      data.tblSupply.push({ SupplyID: nextIntId('tblSupply', 'SupplyID'), ProductID: productId, SupplierID: supplierId, Qty: quantity, DateAdded: $('supplyDate').value });
    } catch (error) { return showError('supplyError', error.message); }
    stock.StockQty += quantity;
    $('supplyQty').value = '1';
    $('supplyDate').value = localDate();
    commit('Supply receipt saved and stock updated.');
  }

  function deleteProduct(productId) {
    const id = Number(productId);
    if (data.tblSales.some(sale => sale.ProductID === id) || data.tblSupply.some(supply => supply.ProductID === id)) {
      notify('This product has history. Keep it in the catalogue to preserve its records.');
      return;
    }
    const product = productById(id);
    if (!product || !window.confirm(`Delete “${product.ProductName}” and its stock record?`)) return;
    data.tblProduct = data.tblProduct.filter(item => item.ProductID !== id);
    data.tblStock = data.tblStock.filter(stock => stock.ProductID !== id);
    closeDialogs();
    commit('Product deleted.');
  }

  function deleteSupplier(supplierId) {
    const id = Number(supplierId);
    if (data.tblSupply.some(supply => supply.SupplierID === id)) return notify('This supplier has receipt history and cannot be deleted.');
    const supplier = data.tblSupplier.find(item => item.SupplierID === id);
    if (!supplier || !window.confirm(`Delete “${supplier.SupplierName}”?`)) return;
    data.tblSupplier = data.tblSupplier.filter(item => item.SupplierID !== id);
    commit('Supplier deleted.');
  }

  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      currency: 'PHP',
      tables: Object.fromEntries(Object.keys(SCHEMA).map(table => [table, data[table]]))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `perloy-inventory-${localDate()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    notify('Data export downloaded.');
  }

  function handleInventoryAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'edit-product') editProduct(id);
    if (action === 'sell') openSaleFor(id);
    if (action === 'receive') openSupplyFor(id);
    if (action === 'delete-product') deleteProduct(id);
  }

  function handleSupplierAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'edit-supplier') editSupplier(button.dataset.id);
    if (action === 'delete-supplier') deleteSupplier(button.dataset.id);
  }

  function initializeSchema() {
    loadData();
    renderSchema();
    setDateDefaults();
    renderAll();
    if (stateNotice) setNotice(stateNotice, stateNotice.startsWith('Saved data could not'));

    document.querySelectorAll('.nav-link').forEach(button => button.addEventListener('click', () => navigate(button.dataset.view)));
    $('addProduct').addEventListener('click', () => { resetProductForm(); openDialog('productDialog'); });
    $('addProductFromSale').addEventListener('click', () => { resetProductForm(); openDialog('productDialog'); });
    $('emptyAddProduct').addEventListener('click', () => {
      if (data.tblProduct.length) {
        $('inventorySearch').value = '';
        $('stockFilter').value = 'all';
        renderInventory();
      } else {
        resetProductForm();
        openDialog('productDialog');
      }
    });
    $('addSupplier').addEventListener('click', () => { $('supplierForm').reset(); $('supplierId').value = ''; $('supplierDialogTitle').textContent = 'Add supplier'; clearError('supplierError'); openDialog('supplierDialog'); });
    $('emptyAddSupplier').addEventListener('click', () => $('addSupplier').click());
    $('addSupplierFromSupply').addEventListener('click', () => $('addSupplier').click());
    $('openSchema').addEventListener('click', () => openDialog('schemaDialog'));
    $('exportData').addEventListener('click', exportData);
    document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', closeDialogs));
    $('inventorySearch').addEventListener('input', renderInventory);
    $('stockFilter').addEventListener('change', renderInventory);
    $('inventoryRows').addEventListener('click', handleInventoryAction);
    $('supplierRows').addEventListener('click', handleSupplierAction);
    $('productForm').addEventListener('submit', saveProduct);
    $('supplierForm').addEventListener('submit', saveSupplier);
    $('saleForm').addEventListener('submit', recordSale);
    $('supplyForm').addEventListener('submit', recordSupply);
    $('saleProduct').addEventListener('change', updateSaleTotal);
    $('saleQty').addEventListener('input', updateSaleTotal);
    $('deleteProduct').addEventListener('click', () => deleteProduct($('productId').value));
    $('saleForm').addEventListener('input', () => { $('saleError').hidden = true; });
    $('supplyForm').addEventListener('input', () => { $('supplyError').hidden = true; });
  }

  document.addEventListener('DOMContentLoaded', initializeSchema, { once: true });
})();
