const routes = {
  '/login': { page: 'login.html', auth: false, layout: false },
  '/': { page: 'dashboard.html', auth: true, layout: true },
  '/dashboard': { page: 'dashboard.html', auth: true, layout: true },
  '/tables': { page: 'tables.html', auth: true, layout: true },
  '/orders': { page: 'orders.html', auth: true, layout: true },
  '/customers': { page: 'customers.html', auth: true, layout: true },
  '/billing': { page: 'billing.html', auth: true, layout: true },
  '/kitchen': { page: 'kitchen.html', auth: true, layout: true },
  '/menu': { page: 'menu.html', auth: true, layout: true },
  '/reports': { page: 'reports.html', auth: true, layout: true },
  '/users': { page: 'users.html', auth: true, layout: true, roles: ['admin'] },
  '/settings': { page: 'settings.html', auth: true, layout: true, roles: ['admin'] },
};

const appContainer = document.getElementById('app');
const pageCache = new Map();

async function loadPage(pagePath) {
  if (pageCache.has(pagePath)) {
    return pageCache.get(pagePath);
  }
  try {
    const response = await fetch(`/pages/${pagePath}`);
    if (!response.ok) throw new Error(`Failed to load ${pagePath}`);
    const html = await response.text();
    pageCache.set(pagePath, html);
    return html;
  } catch (error) {
    console.error(`Error loading page ${pagePath}:`, error);
    return `<div class="p-8 text-center text-red-600">Error cargando la página: ${pagePath}</div>`;
  }
}

function getLayoutHTML(content, route) {
  if (!route.layout) {
    return content;
  }
  return `
    <div class="flex h-screen overflow-hidden" x-data="layout()" x-init="init()">
      <aside
        class="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-dark-200 flex flex-col transform transition-transform duration-300 lg:translate-x-0"
        :class="{ '-translate-x-full': !$store.ui.sidebarOpen }"
        x-show="$store.ui.sidebarOpen || true"
      >
        <div class="flex flex-col h-full">
          <div class="p-5 border-b border-dark-200">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg">PR</div>
              <div>
                <h2 class="font-bold text-dark-900">Poli Restaurante</h2>
                <p class="text-xs text-dark-500">Gestión Integral</p>
              </div>
            </div>
          </div>
          <nav class="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin" x-data="sidebar()">
            <template x-for="module in $store.router.modules" :key="module.id">
              <button
                @click="$store.router.navigate(module.path)"
                class="sidebar-link w-full"
                :class="{ 'sidebar-link-active': $store.router.currentRoute === module.path }"
                :disabled="Boolean(module.roles) && !$store.auth.hasRole(module.roles)"
              >
                <span x-html="module.icon"></span>
                <span x-text="module.label"></span>
                <template x-if="Boolean(module.roles) && !$store.auth.hasRole(module.roles)">
                  <span class="ml-auto badge badge-gray text-xs">Admin</span>
                </template>
              </button>
            </template>
          </nav>
          <div class="p-4 border-t border-dark-200">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium" x-text="$store.router.userInitials"></div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-dark-900 truncate" x-text="$store.router.userName"></p>
                <p class="text-xs text-dark-500 capitalize" x-text="$store.router.userRole"></p>
              </div>
              <button @click="$store.router.logout()" class="p-2 rounded-lg text-dark-400 hover:text-dark-600 hover:bg-dark-100" title="Cerrar sesión">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </aside>
      <div x-show="$store.ui.sidebarOpen" @click="$store.ui.closeSidebar()" class="fixed inset-0 z-30 bg-black/50 lg:hidden" x-transition:enter="transition-opacity ease-linear duration-300" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100" x-transition:leave="transition-opacity ease-linear duration-300" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"></div>
      <main class="flex-1 flex flex-col lg:pl-64 min-h-screen">
        <header class="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-dark-200">
          <div class="flex items-center justify-between h-16 px-4 lg:px-6">
            <div class="flex items-center gap-4">
              <button @click="$store.ui.toggleSidebar()" class="lg:hidden p-2 rounded-lg text-dark-500 hover:bg-dark-100">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <h1 class="text-xl font-bold text-dark-900" x-text="$store.router.pageTitle"></h1>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium" :class="$store.auth.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                <span class="w-2 h-2 rounded-full" :class="$store.auth.connected ? 'bg-green-500' : 'bg-red-500'"></span>
                <span x-text="$store.auth.connected ? 'Conectado' : 'Desconectado'"></span>
              </div>
              <div class="hidden sm:block text-sm text-dark-500 font-mono" x-text="$store.router.currentTime"></div>
            </div>
          </div>
        </header>
        <div class="flex-1 overflow-auto p-4 lg:p-6" id="page-content">
          ${content}
        </div>
      </main>
      <div x-data="toastManager()" class="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        <template x-for="toast in $store.ui.toasts" :key="toast.id">
          <div class="pointer-events-auto toast toast-enter toast-leave min-w-[280px] max-w-md" :class="toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : toast.type === 'warning' ? 'toast-warning' : 'toast-info'" x-transition:enter="transition ease-out duration-300" x-transition:enter-start="transform opacity-0 translate-y-2" x-transition:enter-end="transform opacity-100 translate-y-0" x-transition:leave="transition ease-in duration-200" x-transition:leave-start="transform opacity-100 translate-y-0" x-transition:leave-end="transform opacity-0 translate-y-2">
            <div class="flex items-center gap-3 p-4 rounded-lg shadow-lg border">
              <div class="flex-1 text-sm" x-text="toast.message"></div>
              <button @click="$store.ui.removeToast(toast.id)" class="text-current opacity-50 hover:opacity-100">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  `;
}

export const router = {
  currentRoute: '/',
  previousRoute: null,
  pageTitle: 'Dashboard',

  modules: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>',
      path: '/dashboard',
    },
    {
      id: 'tables',
      label: 'Mesas',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h12m-12 0a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"></path></svg>',
      path: '/tables',
    },
    {
      id: 'orders',
      label: 'Órdenes',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>',
      path: '/orders',
    },
    {
      id: 'customers',
      label: 'Clientes',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>',
      path: '/customers',
    },
    {
      id: 'billing',
      label: 'Facturación y pagos',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l2 2 4-4m1-4V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2h8m2-8h4m-2-2v4"></path></svg>',
      path: '/billing',
    },
    {
      id: 'kitchen',
      label: 'Cocina',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>',
      path: '/kitchen',
    },
    {
      id: 'menu',
      label: 'Menú',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>',
      path: '/menu',
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>',
      path: '/reports',
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>',
      path: '/users',
      roles: ['admin'],
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-1.065 2.572c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
      path: '/settings',
      roles: ['admin'],
    },
  ],

  async init() {
    window.addEventListener('popstate', () => this.handleRouteChange());
    await this.handleRouteChange();
    this.startClock();
  },

  startClock() {
    const update = () => {
      this.currentTime = new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
    };
    update();
    setInterval(update, 1000);
  },

  async navigate(path) {
    if (path === this.currentRoute) return;

    const route = routes[path];
    if (!route) {
      console.warn(`Route not found: ${path}`);
      return;
    }

    const authStore = Alpine.store('auth');

    if (route.auth && !authStore.token) {
      this.navigate('/login');
      return;
    }

    if (route.roles && !authStore.hasRole(route.roles)) {
      this.showToast('No tienes permisos para acceder', 'error');
      return;
    }

    this.previousRoute = this.currentRoute;
    this.currentRoute = path;
    history.pushState(null, '', path);

    await this.loadPageContent(path, route);
  },

  async handleRouteChange() {
    const path = window.location.pathname || '/';
    const route = routes[path];

    if (!route) {
      this.navigate('/');
      return;
    }

    const authStore = Alpine.store('auth');

    if (route.auth && !authStore.token) {
      this.navigate('/login');
      return;
    }

    if (route.roles && !authStore.hasRole(route.roles)) {
      this.showToast('No tienes permisos para acceder', 'error');
      this.navigate('/dashboard');
      return;
    }

    this.currentRoute = path;
    await this.loadPageContent(path, route);
  },

  async loadPageContent(path, route) {
    const module = this.modules.find((m) => m.path === path);
    this.pageTitle = module?.label || 'Dashboard';

    const html = await loadPage(route.page);
    const fullHtml = getLayoutHTML(html, route);

    Alpine.destroyTree(appContainer);
    appContainer.innerHTML = fullHtml;
    Alpine.initTree(appContainer);
  },

  showToast(message, type = 'info') {
    Alpine.store('ui').showToast(message, type);
  },

  get userInitials() {
    const authStore = Alpine.store('auth');
    if (!authStore.user?.name) return 'PR';
    return authStore.user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },

  get userName() {
    return Alpine.store('auth').user?.name || 'Usuario';
  },

  get userRole() {
    return Alpine.store('auth').user?.role || 'waiter';
  },

  logout() {
    Alpine.store('auth').logout();
    this.navigate('/login');
  },
};
