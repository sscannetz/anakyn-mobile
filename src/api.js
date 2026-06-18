// ══════════════════════════════════════════════════════
// api.js — ตัวกลางเรียก Backend API
// แก้ BASE_URL ให้ตรงกับ server ของคุณ
// ══════════════════════════════════════════════════════
import { getToken } from './storage';

// ★ แก้ URL ให้ตรงกับ backend server ของคุณ
// ถ้ารันบนเครื่องเดียวกัน และใช้ Expo Go:
//   - Android emulator: http://10.0.2.2:4000/api
//   - iOS simulator:    http://localhost:4000/api
//   - อุปกรณ์จริง:      http://<IP ของเครื่อง>:4000/api
export const BASE_URL = 'http://192.168.1.101:4000/api'; // ← แก้ตรงนี้

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`);
  }
  return data;
}

export const api = {
  // ── Auth ──
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  // ── Products / Stock ──
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // ── Sales ──
  getSales: (limit) => request(`/sales${limit ? `?limit=${limit}` : ''}`),
  getSale: (id) => request(`/sales/${id}`),
  createSale: (data) => request('/sales', { method: 'POST', body: data }),

  // ── Invoices ──
  getInvoices: () => request('/invoices'),
  getInvoice: (id) => request(`/invoices/${id}`),
  createInvoice: (data) => request('/invoices', { method: 'POST', body: data }),
  updateInvoice: (id, data) => request(`/invoices/${id}`, { method: 'PATCH', body: data }),

  // ── Quotations ──
  getQuotations: () => request('/quotations'),
  getQuotation: (id) => request(`/quotations/${id}`),
  createQuotation: (data) => request('/quotations', { method: 'POST', body: data }),
  updateQuotationStatus: (id, status) =>
    request(`/quotations/${id}/status`, { method: 'PATCH', body: { status } }),
  updateQuotation: (id, data) => request(`/quotations/${id}`, { method: 'PATCH', body: data }),

  // ── Purchase Orders ──
  getPurchaseOrders: () => request('/purchase-orders'),
  getPurchaseOrder: (id) => request(`/purchase-orders/${id}`),
  createPurchaseOrder: (data) => request('/purchase-orders', { method: 'POST', body: data }),
  updatePOStatus: (id, status) =>
    request(`/purchase-orders/${id}/status`, { method: 'PATCH', body: { status } }),

  // ── Suppliers ──
  getSuppliers: () => request('/suppliers'),
  createSupplier: (data) => request('/suppliers', { method: 'POST', body: data }),

  // ── Users (admin only) ──
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: data }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // ── Service Orders ──
  getServiceOrders: () => request('/service-orders'),
  getServiceOrder: (id) => request(`/service-orders/${id}`),
  createServiceOrder: (data) => request('/service-orders', { method: 'POST', body: data }),
  updateServiceStatus: (id, status) =>
    request(`/service-orders/${id}/status`, { method: 'PATCH', body: { status } }),

  // ── Customers ──
  getCustomers: (search) => request(`/customers${search ? `?search=${search}` : ''}`),
  createCustomer: (data) => request('/customers', { method: 'POST', body: data }),

  // ── Summary ──
  getSummary: (period) => request(`/summary?period=${period || 'month'}`),
};
