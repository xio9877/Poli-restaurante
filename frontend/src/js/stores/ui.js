export const uiStore = {
  loading: false,
  sidebarOpen: false,
  toasts: [],
  toastId: 0,

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  },

  closeSidebar() {
    this.sidebarOpen = false;
  },

  setLoading(value) {
    this.loading = value;
  },

  showToast(message, type = 'info', duration = 4000) {
    const id = ++this.toastId;
    this.toasts.push({ id, message, type });

    setTimeout(() => this.removeToast(id), duration);
  },

  removeToast(id) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  },

  confirm(message) {
    return window.confirm(message);
  },
};
