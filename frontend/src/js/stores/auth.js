export const authStore = {
  token: null,
  user: null,
  connected: false,

  init() {
    const savedToken = localStorage.getItem('pr_token');
    const savedUser = localStorage.getItem('pr_user');

    if (!savedToken || !savedUser) return;

    try {
      this.user = JSON.parse(savedUser);
      if (!this.user || typeof this.user !== 'object') throw new Error('Invalid saved user');
      this.token = savedToken;
      this.connected = true;
      this.validateToken();
    } catch (error) {
      console.error('Error restoring saved session:', error);
      this.logout();
    }
  },

  async validateToken() {
    try {
      const response = await fetch('/auth/validate', {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) throw new Error('Token invalid');
      const data = await response.json();
      if (data.user) {
        this.user = data.user;
        localStorage.setItem('pr_user', JSON.stringify(this.user));
      }
      this.connected = true;
    } catch {
      this.logout();
    }
  },

  async login(email, password) {
    Alpine.store('ui').setLoading(true);
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error_description || data.error || 'Credenciales inválidas'
        );
      }

      this.token = data.access_token;
      this.user = data.user;
      this.connected = true;

      localStorage.setItem('pr_token', this.token);
      localStorage.setItem('pr_user', JSON.stringify(this.user));

      Alpine.store('router').navigate('/dashboard');
      Alpine.store('ui').showToast(`Bienvenido, ${this.user.name}`, 'success');

      return data;
    } catch (error) {
      Alpine.store('ui').showToast(error.message, 'error');
      throw error;
    } finally {
      Alpine.store('ui').setLoading(false);
    }
  },

  logout() {
    this.token = null;
    this.user = null;
    this.connected = false;
    localStorage.removeItem('pr_token');
    localStorage.removeItem('pr_user');
  },

  hasRole(roles) {
    if (!this.user?.role) return false;
    return roles.includes(this.user.role);
  },

  setSession(data) {
    this.token = data.access_token;
    this.user = data.user;
    this.connected = true;
    localStorage.setItem('pr_token', this.token);
    localStorage.setItem('pr_user', JSON.stringify(this.user));
  },
};
