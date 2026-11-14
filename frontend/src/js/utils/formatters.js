export const formatters = {
  currency(value, currency = 'COP') {
    const num = Number(value || 0);
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(num);
  },

  number(value) {
    return new Intl.NumberFormat('es-CO').format(Number(value || 0));
  },

  time(dateStr) {
    return new Date(dateStr).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  date(dateStr) {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },

  dateTime(dateStr) {
    return new Date(dateStr).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  orderStatus(status) {
    const map = {
      open: 'Abierta',
      in_preparation: 'En Preparación',
      ready: 'Lista',
      served: 'Servida',
      canceled: 'Cancelada',
    };
    return map[status] || status;
  },

  orderStatusClass(status) {
    const map = {
      open: 'badge-info',
      in_preparation: 'badge-warning',
      ready: 'badge-purple',
      served: 'badge-success',
      canceled: 'badge-danger',
    };
    return map[status] || 'badge-gray';
  },

  detailState(state) {
    const map = {
      pending: 'Pendiente',
      in_preparation: 'En Preparación',
      ready: 'Lista',
      served: 'Servida',
      canceled: 'Cancelada',
    };
    return map[state] || state;
  },

  detailStateClass(state) {
    const map = {
      pending: 'badge-gray',
      in_preparation: 'badge-warning',
      ready: 'badge-purple',
      served: 'badge-success',
      canceled: 'badge-danger',
    };
    return map[state] || 'badge-gray';
  },

  tableState(state) {
    const map = {
      available: 'Libre',
      unavailable: 'No Disponible',
    };
    return map[state] || state;
  },

  tableStateClass(state) {
    const map = {
      available: 'badge-success',
      unavailable: 'badge-warning',
    };
    return map[state] || 'badge-gray';
  },

  deliveryState(state) {
    const map = {
      pending: 'Pendiente',
      assigned: 'Asignada',
      picked_up: 'Recogida',
      delivered: 'Entregada',
      canceled: 'Cancelada',
    };
    return map[state] || state;
  },

  productStatus(state) {
    const map = {
      available: 'Disponible',
      unavailable: 'No Disponible',
    };
    return map[state] || state;
  },

  roleLabel(role) {
    const map = {
      admin: 'Administrador',
      waiter: 'Mesero',
      kitchen: 'Cocina',
      cashier: 'Cajero',
      domiciliary: 'Domiciliario',
    };
    return map[role] || role;
  },

  roleClass(role) {
    const map = {
      admin: 'badge-purple',
      waiter: 'badge-info',
      kitchen: 'badge-warning',
      cashier: 'badge-success',
      domiciliary: 'badge-purple',
    };
    return map[role] || 'badge-gray';
  },

  initials(name) {
    if (!name) return 'PR';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },
};
