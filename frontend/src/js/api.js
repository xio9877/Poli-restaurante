import axios from 'axios';

export const api = axios.create({
  baseURL: '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      Alpine.store('auth').logout();
      Alpine.store('router').navigate('/login');
      Alpine.store('ui').showToast('Sesión expirada', 'error');
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use(
  (config) => {
    const token = Alpine.store('auth')?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
