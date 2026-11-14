import '../css/main.css';
import Alpine from 'alpinejs';
import { router } from './router.js';
import { api } from './api.js';
import { authStore } from './stores/auth.js';
import { uiStore } from './stores/ui.js';
import { formatters } from './utils/formatters.js';

window.Alpine = Alpine;

Alpine.store('auth', authStore);
Alpine.store('ui', uiStore);
Alpine.store('router', router);
Alpine.store('api', api);
Alpine.store('formatters', formatters);

Alpine.data('toastManager', () => ({}));

// Layout component
Alpine.data('layout', () => ({
  init() {
    this.$watch('$store.ui.sidebarOpen', (val) => {
      if (val) document.body.classList.add('sidebar-open');
      else document.body.classList.remove('sidebar-open');
    });
  },
}));

// Login form component
Alpine.data('loginForm', () => ({
  form: { email: '', password: '' },
  error: '',
  loading: false,
  async submit() {
    this.loading = true;
    this.error = '';
    try {
      await this.$store.auth.login(this.form.email, this.form.password);
    } catch (e) {
      this.error = e.message || 'Credenciales inválidas';
      this.$store.ui.showToast(this.error, 'error');
    } finally {
      this.loading = false;
    }
  },
}));

// Sidebar component
Alpine.data('sidebar', () => ({
  open: false,
  init() {
    this.open = this.$store.ui.sidebarOpen;
    this.$watch('$store.ui.sidebarOpen', (val) => {
      this.open = val;
    });
  },
  toggle() {
    this.$store.ui.toggleSidebar();
  },
  close() {
    this.$store.ui.closeSidebar();
  },
}));

const responseItems = (response) => {
  const data = response?.data;
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
};

const responseValue = (response) => response?.data?.data ?? response?.data;

// Dashboard component
Alpine.data('dashboard', () => ({
  stats: { activeOrders: 0, occupiedTables: 0, todaySales: 0, lowStock: 0 },
  recentOrders: [],
  loading: true,
  async init() {
    await this.load();
  },
  async load() {
    this.loading = true;
    try {
      const end = new Date();
      const start = new Date(end);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      const [salesRes, ordersRes, openOrdersRes, tablesRes, productsRes] = await Promise.all([
        this.$store.api.get(`/admin/reports/sales?${params}`),
        this.$store.api.get('/orders?limit=5'),
        this.$store.api.get('/orders/open'),
        this.$store.api.get('/tables?limit=100'),
        this.$store.api.get('/products?status=unavailable&limit=100'),
      ]);
      const orders = responseItems(ordersRes);
      const activeOrders = responseItems(openOrdersRes);
      const tables = responseItems(tablesRes);
      const tableById = new Map(tables.map((table) => [table.id, table]));
      this.recentOrders = orders.slice(0, 5).map((order) => ({
        ...order,
        table: order.dineInOrder ? tableById.get(order.dineInOrder.tableId) : null,
      }));
      this.stats = {
        activeOrders: activeOrders.length,
        occupiedTables: activeOrders.filter((order) => order.dineInOrder).length,
        todaySales: salesRes.data.summary?.totalSales ?? 0,
        lowStock: responseItems(productsRes).length,
      };
    } catch (e) {
      this.$store.ui.showToast('Error cargando dashboard', 'error');
    } finally {
      this.loading = false;
    }
  },
  createWalkInOrder() {
    this.$store.router.navigate('/orders');
  },
}));

// Tables component
Alpine.data('tables', () => ({
  tables: [],
  filter: 'all',
  loading: true,
  showModal: false,
  editing: null,
  form: { name: '', description: '', state: 'available' },
  get filteredTables() {
    if (this.filter === 'all') return this.tables;
    if (this.filter === 'occupied') return this.tables.filter((table) => table.currentOrder);
    return this.tables.filter((table) => table.state === this.filter);
  },
  async init() {
    await this.loadTables();
  },
  async loadTables() {
    this.loading = true;
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        this.$store.api.get('/tables?limit=100'),
        this.$store.api.get('/orders/open'),
      ]);
      const activeOrders = responseItems(ordersRes);
      const orderByTableId = new Map(
        activeOrders
          .filter((order) => order.dineInOrder)
          .map((order) => [order.dineInOrder.tableId, order])
      );
      this.tables = responseItems(tablesRes).map((table) => ({
        ...table,
        currentOrder: orderByTableId.get(table.id) || null,
      }));
    } catch (e) {
      this.$store.ui.showToast('Error cargando mesas', 'error');
    } finally {
      this.loading = false;
    }
  },
  openModal(table = null) {
    this.editing = table;
    this.form = table
      ? { name: table.name, description: table.description || '', state: table.state }
      : { name: '', description: '', state: 'available' };
    this.showModal = true;
  },
  closeModal() {
    this.showModal = false;
    this.editing = null;
  },
  async save() {
    try {
      if (this.editing) {
        const { name, description, state } = this.form;
        await this.$store.api.patch(`/tables/${this.editing.id}`, { name, description });
        if (state !== this.editing.state) {
          await this.$store.api.patch(`/tables/${this.editing.id}/state`, { state });
        }
        this.$store.ui.showToast('Mesa actualizada', 'success');
      } else {
        await this.$store.api.post('/tables', {
          name: this.form.name,
          description: this.form.description,
        });
        this.$store.ui.showToast('Mesa creada', 'success');
      }
      this.closeModal();
      await this.loadTables();
    } catch (e) {
      this.$store.ui.showToast('Error guardando mesa', 'error');
    }
  },
  async setTableState(table, state) {
    try {
      await this.$store.api.patch(`/tables/${table.id}/state`, { state });
      this.$store.ui.showToast(
        state === 'available' ? 'Mesa disponible' : 'Mesa ocupada',
        'success'
      );
      await this.loadTables();
    } catch (e) {
      this.$store.ui.showToast('Error actualizando mesa', 'error');
    }
  },
  occupyTable(table) {
    return this.setTableState(table, 'unavailable');
  },
  releaseTable(table) {
    return this.setTableState(table, 'available');
  },
  toggleAvailable(table) {
    return this.setTableState(table, table.state === 'available' ? 'unavailable' : 'available');
  },
}));

// Orders component
Alpine.data('orders', () => ({
  orders: [],
  loading: true,
  filter: 'all',
  statuses: [
    { value: 'all', label: 'Todas' },
    { value: 'open', label: 'Abiertas' },
    { value: 'in_preparation', label: 'En preparación' },
    { value: 'ready', label: 'Listas' },
    { value: 'served', label: 'Servidas' },
    { value: 'canceled', label: 'Canceladas' },
  ],
  selectedOrder: { details: [] },
  availableProducts: [],
  detailForm: { productId: '', amount: 1 },
  showModal: false,
  get filteredOrders() {
    return this.filter === 'all'
      ? this.orders
      : this.orders.filter((order) => order.status === this.filter);
  },
  async init() {
    await this.load();
  },
  async load() {
    this.loading = true;
    try {
      const res = await this.$store.api.get('/orders?limit=100');
      this.orders = responseItems(res);
    } catch (e) {
      this.$store.ui.showToast('Error cargando pedidos', 'error');
    } finally {
      this.loading = false;
    }
  },
  createWalkInOrder() {
    this.$store.ui.showToast('Selecciona una mesa para iniciar una orden', 'info');
    this.$store.router.navigate('/tables');
  },
  showDeliveryModal: false,
  deliveryLoading: false,
  showQuickCustomerForm: false,
  showQuickAddressForm: false,
  customers: [],
  deliveryAddresses: [],
  availableProducts: [],
  domiciliaryUsers: [],
  selectedCustomerId: '',
  deliveryProductId: '',
  deliveryProductAmount: 1,
  deliveryForm: { addressId: '', domiciliaryId: '', deliveryFee: 0, notes: '' },
  quickCustomer: {
    name: '',
    username: '',
    phone: '',
    addressLabel: 'Casa',
    address: '',
    additionalInfo: '',
  },
  quickAddress: { label: 'Casa', address: '', additionalInfo: '' },
  deliveryDetails: [],
  async createDeliveryOrder() {
    this.showDeliveryModal = true;
    this.deliveryLoading = true;
    this.selectedCustomerId = '';
    this.deliveryAddresses = [];
    this.deliveryDetails = [];
    this.deliveryForm = { addressId: '', domiciliaryId: '', deliveryFee: 0, notes: '' };
    this.showQuickCustomerForm = false;
    this.showQuickAddressForm = false;
    try {
      const [customersRes, productsRes, usersRes] = await Promise.all([
        this.$store.api.get('/customers?limit=100'),
        this.$store.api.get('/products?status=available&limit=100'),
        this.$store.api.get('/users?role=domiciliary&limit=100'),
      ]);
      this.customers = responseItems(customersRes);
      this.availableProducts = responseItems(productsRes);
      this.domiciliaryUsers = responseItems(usersRes);
      if (this.customers.length) {
        this.selectedCustomerId = this.customers[0].id;
        await this.loadDeliveryAddresses();
      }
    } catch (e) {
      this.$store.ui.showToast('Error cargando datos para el domicilio', 'error');
    } finally {
      this.deliveryLoading = false;
    }
  },
  closeDeliveryModal() {
    this.showDeliveryModal = false;
    this.showQuickCustomerForm = false;
    this.showQuickAddressForm = false;
    this.deliveryDetails = [];
    this.deliveryForm = { addressId: '', domiciliaryId: '', deliveryFee: 0, notes: '' };
  },
  async loadDeliveryAddresses() {
    this.deliveryAddresses = [];
    this.deliveryForm.addressId = '';
    if (!this.selectedCustomerId) return;
    try {
      const res = await this.$store.api.get(`/customers/${this.selectedCustomerId}/addresses`);
      this.deliveryAddresses = responseItems(res);
      this.deliveryForm.addressId = this.deliveryAddresses[0]?.id || '';
    } catch (e) {
      this.$store.ui.showToast('Error cargando direcciones del cliente', 'error');
    }
  },
  async saveQuickCustomer() {
    const hasAddress = Boolean(this.quickCustomer.address.trim());
    if (hasAddress && !this.quickCustomer.addressLabel.trim()) {
      this.$store.ui.showToast('Escribe una etiqueta para la dirección', 'warning');
      return;
    }
    try {
      const body = {
        name: this.quickCustomer.name,
        username: this.quickCustomer.username,
        phone: this.quickCustomer.phone,
      };
      const res = hasAddress
        ? await this.$store.api.post('/customers/with-address', {
            ...body,
            addressLabel: this.quickCustomer.addressLabel,
            address: this.quickCustomer.address,
            additionalInfo: this.quickCustomer.additionalInfo,
          })
        : await this.$store.api.post('/customers', body);
      const customer = responseValue(res);
      this.customers.push(customer);
      this.selectedCustomerId = customer.id;
      this.deliveryAddresses = customer.addresses || [];
      this.deliveryForm.addressId = this.deliveryAddresses[0]?.id || '';
      this.quickCustomer = {
        name: '',
        username: '',
        phone: '',
        addressLabel: 'Casa',
        address: '',
        additionalInfo: '',
      };
      this.showQuickCustomerForm = false;
      this.showQuickAddressForm = false;
      this.$store.ui.showToast('Cliente creado', 'success');
    } catch (e) {
      this.$store.ui.showToast(
        'No se pudo crear el cliente; verifica que el correo/identificador no exista',
        'error'
      );
    }
  },
  async saveQuickAddress() {
    if (!this.selectedCustomerId) return;
    try {
      const res = await this.$store.api.post(
        `/customers/${this.selectedCustomerId}/addresses`,
        this.quickAddress
      );
      this.deliveryAddresses.push(responseValue(res));
      this.deliveryForm.addressId = this.deliveryAddresses[this.deliveryAddresses.length - 1].id;
      this.quickAddress = { label: 'Casa', address: '', additionalInfo: '' };
      this.showQuickAddressForm = false;
      this.$store.ui.showToast('Dirección agregada al cliente', 'success');
    } catch (e) {
      this.$store.ui.showToast('Error creando la dirección', 'error');
    }
  },
  addDeliveryDetail() {
    const product = this.availableProducts.find(
      (item) => item.id === Number(this.deliveryProductId)
    );
    const amount = Number(this.deliveryProductAmount);
    if (!product || !Number.isInteger(amount) || amount < 1) return;
    const existing = this.deliveryDetails.find((detail) => detail.productId === product.id);
    if (existing) existing.amount += amount;
    else
      this.deliveryDetails.push({
        productId: product.id,
        amount,
        name: product.name,
        unitPrice: Number(product.price),
      });
    this.deliveryProductId = '';
    this.deliveryProductAmount = 1;
  },
  get deliverySubtotal() {
    return this.deliveryDetails.reduce((sum, item) => sum + item.unitPrice * item.amount, 0);
  },
  get deliveryTotal() {
    return this.deliverySubtotal * 1.19 + Number(this.deliveryForm.deliveryFee || 0);
  },
  async saveDeliveryOrder() {
    if (
      !this.selectedCustomerId ||
      !this.deliveryForm.addressId ||
      !this.deliveryForm.domiciliaryId ||
      !this.deliveryDetails.length
    ) {
      this.$store.ui.showToast(
        'Selecciona cliente, dirección, domiciliario y al menos un producto',
        'warning'
      );
      return;
    }
    try {
      await this.$store.api.post('/delivery/orders', {
        customerId: this.selectedCustomerId,
        addressId: Number(this.deliveryForm.addressId),
        domiciliaryId: this.deliveryForm.domiciliaryId,
        deliveryFee: Number(this.deliveryForm.deliveryFee || 0),
        notes: this.deliveryForm.notes || undefined,
        details: this.deliveryDetails.map(({ productId, amount }) => ({ productId, amount })),
      });
      this.$store.ui.showToast('Orden a domicilio creada', 'success');
      this.closeDeliveryModal();
      await this.load();
    } catch (e) {
      this.$store.ui.showToast('Error creando la orden a domicilio', 'error');
    }
  },
  async viewOrder(order) {
    try {
      const [orderRes, productsRes] = await Promise.all([
        this.$store.api.get(`/orders/${order.id}`),
        this.$store.api.get('/products?status=available&limit=100'),
      ]);
      this.selectedOrder = responseValue(orderRes) || { ...order, details: [] };
      this.selectedOrder.details ||= [];
      this.availableProducts = responseItems(productsRes);
      this.detailForm = { productId: '', amount: 1 };
      this.showModal = true;
    } catch (e) {
      this.$store.ui.showToast('Error cargando el detalle de la orden', 'error');
    }
  },
  async refreshSelectedOrder() {
    const res = await this.$store.api.get(`/orders/${this.selectedOrder.id}`);
    this.selectedOrder = responseValue(res) || this.selectedOrder;
    await this.load();
  },
  async addDetail() {
    const productId = Number(this.detailForm.productId);
    const amount = Number(this.detailForm.amount);
    if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(amount) || amount < 1) {
      this.$store.ui.showToast('Selecciona un producto y una cantidad válida', 'warning');
      return;
    }

    try {
      await this.$store.api.post(`/orders/${this.selectedOrder.id}/details`, { productId, amount });
      this.detailForm = { productId: '', amount: 1 };
      await this.refreshSelectedOrder();
      this.$store.ui.showToast('Producto agregado a la orden', 'success');
    } catch (e) {
      this.$store.ui.showToast('No se pudo agregar el producto', 'error');
    }
  },
  async updateDetailAmount(detail, value) {
    const amount = Number(value);
    if (!Number.isInteger(amount) || amount < 1) {
      this.$store.ui.showToast('La cantidad debe ser un entero mayor que cero', 'warning');
      await this.refreshSelectedOrder();
      return;
    }

    try {
      await this.$store.api.patch(`/orders/${this.selectedOrder.id}/details/${detail.id}`, {
        amount,
      });
      await this.refreshSelectedOrder();
      this.$store.ui.showToast('Cantidad actualizada', 'success');
    } catch (e) {
      this.$store.ui.showToast('No se pudo actualizar la cantidad', 'error');
      await this.refreshSelectedOrder();
    }
  },
  async removeDetail(detail) {
    if (!this.$store.ui.confirm(`¿Quitar ${detail.product?.name || 'este producto'} de la orden?`))
      return;
    try {
      await this.$store.api.delete(`/orders/${this.selectedOrder.id}/details/${detail.id}`);
      await this.refreshSelectedOrder();
      this.$store.ui.showToast('Producto eliminado de la orden', 'success');
    } catch (e) {
      this.$store.ui.showToast('No se pudo quitar el producto', 'error');
    }
  },
  closeModal() {
    this.showModal = false;
    this.selectedOrder = { details: [] };
    this.availableProducts = [];
  },
  async updateStatus(order, status) {
    try {
      await this.$store.api.patch(`/orders/${order.id}/status`, { status });
      this.$store.ui.showToast('Estado de la orden actualizado', 'success');
      this.closeModal();
      await this.load();
    } catch (e) {
      this.$store.ui.showToast('Error actualizando la orden', 'error');
    }
  },
}));

Alpine.data('customers', () => ({
  customers: [],
  addresses: [],
  selected: null,
  search: '',
  loading: true,
  showCustomerModal: false,
  showAddressForm: false,
  customerForm: {
    name: '',
    username: '',
    phone: '',
    addressLabel: '',
    address: '',
    additionalInfo: '',
  },
  addressForm: { label: '', address: '', additionalInfo: '' },
  async init() {
    await this.load();
  },
  async load() {
    this.loading = true;
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (this.search.trim()) params.set('search', this.search.trim());
      const res = await this.$store.api.get(`/customers?${params}`);
      this.customers = responseItems(res);
      if (this.selected) {
        this.selected = this.customers.find((customer) => customer.id === this.selected.id) || null;
        this.addresses = this.selected?.addresses || [];
      }
    } catch (e) {
      this.$store.ui.showToast('Error cargando clientes', 'error');
    } finally {
      this.loading = false;
    }
  },
  selectCustomer(customer) {
    this.selected = customer;
    this.addresses = customer.addresses || [];
    this.showAddressForm = false;
  },
  openCustomerModal() {
    this.customerForm = {
      name: '',
      username: '',
      phone: '',
      addressLabel: '',
      address: '',
      additionalInfo: '',
    };
    this.showCustomerModal = true;
  },
  closeCustomerModal() {
    this.showCustomerModal = false;
  },
  async saveCustomer() {
    const hasAddress = Boolean(this.customerForm.address.trim());
    if (hasAddress && !this.customerForm.addressLabel.trim()) {
      this.$store.ui.showToast('Escribe una etiqueta para la dirección', 'warning');
      return;
    }
    const { addressLabel, address, additionalInfo, ...customer } = this.customerForm;
    try {
      const res = hasAddress
        ? await this.$store.api.post('/customers/with-address', {
            ...customer,
            addressLabel,
            address,
            additionalInfo,
          })
        : await this.$store.api.post('/customers', customer);
      this.selected = responseValue(res);
      this.addresses = this.selected.addresses || [];
      this.closeCustomerModal();
      await this.load();
      this.selected = this.customers.find((item) => item.id === this.selected?.id) || this.selected;
      this.addresses = this.selected.addresses || [];
      this.$store.ui.showToast('Cliente creado', 'success');
    } catch (e) {
      this.$store.ui.showToast(
        'Error creando cliente; verifica que el correo/identificador no exista',
        'error'
      );
    }
  },
  async saveAddress() {
    if (!this.selected) return;
    try {
      await this.$store.api.post(`/customers/${this.selected.id}/addresses`, this.addressForm);
      this.addressForm = { label: '', address: '', additionalInfo: '' };
      this.showAddressForm = false;
      await this.load();
      this.$store.ui.showToast('Dirección creada', 'success');
    } catch (e) {
      this.$store.ui.showToast('Error creando dirección', 'error');
    }
  },
}));

Alpine.data('billing', () => ({
  orders: [],
  loading: true,
  saving: false,
  showPaymentModal: false,
  selectedInvoice: null,
  paymentForm: { method: 'cash', notes: '' },
  async init() {
    await this.load();
  },
  async load() {
    this.loading = true;
    try {
      const res = await this.$store.api.get('/orders?limit=100');
      this.orders = responseItems(res);
    } catch (e) {
      this.$store.ui.showToast('Error cargando facturas y órdenes', 'error');
    } finally {
      this.loading = false;
    }
  },
  async issueInvoice(order) {
    try {
      const res = await this.$store.api.post('/invoices', { orderId: order.id });
      const invoice = responseValue(res);
      await this.$store.api.patch(`/invoices/${invoice.id}/status`, { status: 'issued' });
      order.invoice = { ...invoice, status: 'issued', payment: null };
      this.$store.ui.showToast('Factura emitida', 'success');
    } catch (e) {
      this.$store.ui.showToast('Error emitiendo factura', 'error');
    }
  },
  openPayment(order) {
    this.selectedInvoice = order.invoice;
    this.paymentForm = { method: 'cash', notes: '' };
    this.showPaymentModal = true;
  },
  closePayment() {
    this.showPaymentModal = false;
    this.selectedInvoice = null;
  },
  paymentLabel(payment) {
    return `${payment.method} · ${this.$store.formatters.dateTime(payment.paidAt || payment.createdAt)}`;
  },
  async processPayment() {
    if (!this.selectedInvoice || this.saving) return;
    this.saving = true;
    try {
      const res = await this.$store.api.post(
        `/payments/invoice/${this.selectedInvoice.id}/process`,
        {
          method: this.paymentForm.method,
          amount: Number(this.selectedInvoice.total),
          notes: this.paymentForm.notes || undefined,
        }
      );
      const order = this.orders.find((item) => item.invoice?.id === this.selectedInvoice.id);
      if (order) order.invoice.payment = responseValue(res);
      this.closePayment();
      this.$store.ui.showToast('Pago registrado', 'success');
    } catch (e) {
      this.$store.ui.showToast('No se pudo registrar el pago', 'error');
    } finally {
      this.saving = false;
    }
  },
}));

// Kitchen component
Alpine.data('kitchen', () => ({
  autoRefresh: true,
  pendingDetails: [],
  kitchenOrders: [],
  prepStats: { avgPrepTime: 0, minPrepTime: 0, maxPrepTime: 0 },
  loading: true,
  refreshTimer: null,
  async init() {
    await this.loadData();
    this.refreshTimer = setInterval(() => {
      if (this.autoRefresh) this.loadData();
    }, 15000);
  },
  destroy() {
    clearInterval(this.refreshTimer);
  },
  async loadData() {
    this.loading = true;
    try {
      const [detailsRes, ordersRes, statsRes] = await Promise.all([
        this.$store.api.get('/kitchen/details/pending'),
        this.$store.api.get('/kitchen/orders'),
        this.$store.api.get('/kitchen/stats'),
      ]);
      this.pendingDetails = responseItems(detailsRes);
      this.kitchenOrders = responseItems(ordersRes);
      this.prepStats = responseValue(statsRes) || this.prepStats;
    } catch (e) {
      this.$store.ui.showToast('Error cargando cocina', 'error');
    } finally {
      this.loading = false;
    }
  },
  async updateDetail(detail, status) {
    try {
      await this.$store.api.patch(`/kitchen/details/${detail.id}/status`, { status });
      this.$store.ui.showToast('Estado del producto actualizado', 'success');
      await this.loadData();
    } catch (e) {
      this.$store.ui.showToast('Error actualizando', 'error');
    }
  },
}));

// Menu component
Alpine.data('menu', () => ({
  categories: [],
  products: [],
  selectedCategory: null,
  productFilter: 'all',
  search: '',
  loading: true,
  showCategoryModal: false,
  showProductModal: false,
  editingCategory: null,
  editingProduct: null,
  categoryForm: { name: '', description: '' },
  productForm: { name: '', description: '', price: 0, categoryId: '', status: 'available' },
  async init() {
    await this.loadCategories();
    await this.loadProducts();
  },
  async loadCategories() {
    try {
      const res = await this.$store.api.get('/categories?limit=100');
      this.categories = responseItems(res);
    } catch (e) {
      this.$store.ui.showToast('Error cargando categorías', 'error');
    }
  },
  async loadProducts() {
    this.loading = true;
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (this.productFilter !== 'all') params.set('status', this.productFilter);
      if (this.search.trim()) params.set('search', this.search.trim());
      if (this.selectedCategory !== null) params.set('categoryId', this.selectedCategory);
      const res = await this.$store.api.get(`/products?${params}`);
      this.products = responseItems(res).map((product) => ({
        ...product,
        category:
          this.categories.find((category) => category.id === product.categoryId) ||
          product.category,
      }));
    } catch (e) {
      this.$store.ui.showToast('Error cargando productos', 'error');
    } finally {
      this.loading = false;
    }
  },
  countProducts(categoryId) {
    return this.products.filter((product) => product.categoryId === categoryId).length;
  },
  selectCategory(id) {
    this.selectedCategory = this.selectedCategory === id ? null : id;
    this.loadProducts();
  },
  openCategoryModal(category = null) {
    this.editingCategory = category;
    this.categoryForm = category
      ? { name: category.name, description: category.description || '' }
      : { name: '', description: '' };
    this.showCategoryModal = true;
  },
  closeCategoryModal() {
    this.showCategoryModal = false;
    this.editingCategory = null;
  },
  async saveCategory() {
    try {
      if (this.editingCategory) {
        await this.$store.api.patch(`/categories/${this.editingCategory.id}`, this.categoryForm);
      } else {
        await this.$store.api.post('/categories', this.categoryForm);
      }
      this.$store.ui.showToast('Categoría guardada', 'success');
      this.closeCategoryModal();
      await this.loadCategories();
      await this.loadProducts();
    } catch (e) {
      this.$store.ui.showToast('Error guardando categoría', 'error');
    }
  },
  async deleteCategory(category) {
    if (!this.$store.ui.confirm(`¿Eliminar la categoría "${category.name}"?`)) return;
    try {
      await this.$store.api.delete(`/categories/${category.id}`);
      if (this.selectedCategory === category.id) this.selectedCategory = null;
      this.$store.ui.showToast('Categoría eliminada', 'success');
      await this.loadCategories();
      await this.loadProducts();
    } catch (e) {
      this.$store.ui.showToast('Error eliminando categoría', 'error');
    }
  },
  openProductModal(product = null) {
    this.editingProduct = product;
    this.productForm = product
      ? {
          name: product.name,
          description: product.description || '',
          price: Number(product.price),
          categoryId: product.categoryId,
          status: product.status,
        }
      : { name: '', description: '', price: 0, categoryId: '', status: 'available' };
    this.showProductModal = true;
  },
  closeProductModal() {
    this.showProductModal = false;
    this.editingProduct = null;
  },
  async saveProduct() {
    const body = {
      name: this.productForm.name,
      description: this.productForm.description,
      price: Number(this.productForm.price),
      categoryId: Number(this.productForm.categoryId),
      status: this.productForm.status,
    };
    try {
      if (this.editingProduct) {
        await this.$store.api.patch(`/products/${this.editingProduct.id}`, body);
      } else {
        await this.$store.api.post('/products', body);
      }
      this.$store.ui.showToast('Producto guardado', 'success');
      this.closeProductModal();
      await this.loadProducts();
    } catch (e) {
      this.$store.ui.showToast('Error guardando producto', 'error');
    }
  },
  async toggleStatus(product) {
    const status = product.status === 'available' ? 'unavailable' : 'available';
    try {
      await this.$store.api.patch(`/products/${product.id}/status`, { status });
      this.$store.ui.showToast('Estado del producto actualizado', 'success');
      await this.loadProducts();
    } catch (e) {
      this.$store.ui.showToast('Error actualizando producto', 'error');
    }
  },
}));

// Reports component
Alpine.data('reports', () => ({
  salesRange: '7',
  topRange: '7',
  salesSummary: { totalSales: 0, totalOrders: 0, avgTicket: 0 },
  salesByDay: [],
  topProducts: [],
  prepReport: { avgPrepTime: 0, minPrepTime: 0, maxPrepTime: 0, byProduct: [] },
  loading: true,
  async init() {
    await this.loadReports();
  },
  getDateParams(range) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - Number(range) + 1);
    start.setHours(0, 0, 0, 0);
    return new URLSearchParams({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  },
  async loadReports() {
    this.loading = true;
    try {
      const salesParams = this.getDateParams(this.salesRange);
      const topParams = this.getDateParams(this.topRange);
      const salesRequest = this.$store.api.get(`/admin/reports/sales?${salesParams}`);
      const productsRequest =
        this.topRange === this.salesRange
          ? salesRequest
          : this.$store.api.get(`/admin/reports/sales?${topParams}`);
      const [salesRes, productsRes, prepRes] = await Promise.all([
        salesRequest,
        productsRequest,
        this.$store.api.get(`/admin/reports/prep-times?${salesParams}`),
      ]);
      this.salesSummary = salesRes.data?.summary || { totalSales: 0, totalOrders: 0, avgTicket: 0 };
      this.salesByDay = salesRes.data?.byDay || [];
      this.topProducts = productsRes.data?.topProducts || [];
      const prepTimes = prepRes.data?.byProduct || [];
      this.prepReport = {
        ...prepRes.data,
        byProduct: prepTimes,
        minPrepTime: prepTimes.length ? Math.min(...prepTimes.map((item) => item.minTime)) : 0,
        maxPrepTime: prepTimes.length ? Math.max(...prepTimes.map((item) => item.maxTime)) : 0,
      };
    } catch (e) {
      this.$store.ui.showToast('Error cargando reportes', 'error');
    } finally {
      this.loading = false;
    }
  },
  async loadSales() {
    await this.loadReports();
  },
  async loadTopProducts() {
    await this.loadReports();
  },
}));

// Users component
Alpine.data('users', () => ({
  users: [],
  loading: true,
  showModal: false,
  editing: null,
  form: { username: '', name: '', role: 'waiter' },
  async init() {
    await this.load();
  },
  async load() {
    this.loading = true;
    try {
      const res = await this.$store.api.get('/users?limit=100');
      this.users = responseItems(res);
    } catch (e) {
      this.$store.ui.showToast('Error cargando usuarios', 'error');
    } finally {
      this.loading = false;
    }
  },
  openModal(user = null) {
    this.editing = user;
    this.form = user
      ? { name: user.name, username: user.username, role: user.role }
      : { name: '', username: '', role: 'waiter' };
    this.showModal = true;
  },
  closeModal() {
    this.showModal = false;
    this.editing = null;
  },
  async save() {
    try {
      if (this.editing) {
        await this.$store.api.patch(`/users/${this.editing.id}`, this.form);
      } else {
        await this.$store.api.post('/users', this.form);
      }
      this.$store.ui.showToast('Usuario guardado', 'success');
      this.closeModal();
      await this.load();
    } catch (e) {
      this.$store.ui.showToast('Error guardando usuario', 'error');
    }
  },
}));

// Settings component
Alpine.data('settings', () => ({
  storageKey: 'poli-restaurante-settings',
  form: {
    name: 'Poli Restaurante',
    phone: '+57 1 234 5678',
    address: 'Calle 123 #45-67, Bogotá',
    taxRate: 19,
    currency: 'COP',
    printerKitchen: false,
    printerReceipt: false,
    kdsScreen: false,
    notifyNewOrder: true,
    notifyOrderReady: true,
    notifyLowStock: true,
  },
  loading: true,
  async init() {
    await this.load();
  },
  async load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) this.form = { ...this.form, ...JSON.parse(saved) };
    } catch (e) {
      this.$store.ui.showToast('Error cargando configuración guardada', 'error');
    } finally {
      this.loading = false;
    }
  },
  async save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.form));
      this.$store.ui.showToast('Configuración guardada', 'success');
    } catch (e) {
      this.$store.ui.showToast('Error guardando', 'error');
    }
  },
}));

Alpine.start();
authStore.init();
router.init();
