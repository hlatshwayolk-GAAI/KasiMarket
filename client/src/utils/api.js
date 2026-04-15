const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('kasi_token');
  const headers = { ...options.headers };
  
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const api = {
  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),
  updateProviderProfile: (data) => request('/auth/provider-profile', { method: 'PUT', body: data }),
  uploadAvatar: (formData) => request('/auth/avatar', { method: 'POST', body: formData }),

  // Categories
  getCategories: () => request('/categories'),
  getCategory: (slug) => request(`/categories/${slug}`),

  // Listings
  getListings: (params) => request(`/listings?${new URLSearchParams(params)}`),
  getFeaturedListings: () => request('/listings/featured'),
  getListing: (id) => request(`/listings/${id}`),
  createListing: (formData) => request('/listings', { method: 'POST', body: formData }),
  updateListing: (id, data) => request(`/listings/${id}`, { method: 'PUT', body: data }),
  deleteListing: (id) => request(`/listings/${id}`, { method: 'DELETE' }),

  // Requests
  getRequests: (params) => request(`/requests?${new URLSearchParams(params)}`),
  getLatestRequests: () => request('/requests/latest'),
  getRequest: (id) => request(`/requests/${id}`),
  createRequest: (formData) => request('/requests', { method: 'POST', body: formData }),
  updateRequest: (id, data) => request(`/requests/${id}`, { method: 'PUT', body: data }),
  deleteRequest: (id) => request(`/requests/${id}`, { method: 'DELETE' }),

  // Quotes
  createQuote: (data) => request('/quotes', { method: 'POST', body: data }),
  acceptQuote: (id) => request(`/quotes/${id}/accept`, { method: 'PUT' }),
  rejectQuote: (id) => request(`/quotes/${id}/reject`, { method: 'PUT' }),
  getMyQuotes: () => request('/quotes/my'),

  // Messages
  getConversations: () => request('/messages/conversations'),
  getMessages: (convId) => request(`/messages/conversations/${convId}`),
  sendMessage: (data) => request('/messages', { method: 'POST', body: data }),
  getUnreadCount: () => request('/messages/unread-count'),

  // Search
  search: (params) => request(`/search?${new URLSearchParams(params)}`),

  // Notifications
  getNotifications: (params) => request(`/notifications?${new URLSearchParams(params || {})}`),
  getUnreadNotifCount: () => request('/notifications/unread-count'),
  markNotifRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotifsRead: () => request('/notifications/read-all', { method: 'PUT' }),

  // Reviews
  createReview: (data) => request('/reviews', { method: 'POST', body: data }),
  getProviderReviews: (id) => request(`/reviews/provider/${id}`),

  // Admin
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: (params) => request(`/admin/users?${new URLSearchParams(params || {})}`),
  toggleUserActive: (id) => request(`/admin/users/${id}/toggle-active`, { method: 'PUT' }),
  getAdminListings: (params) => request(`/admin/listings?${new URLSearchParams(params || {})}`),
  updateListingStatus: (id, status) => request(`/admin/listings/${id}/status`, { method: 'PUT', body: { status } }),
  getAdminRequests: () => request('/admin/requests'),

  // Bookings
  getBookings: (params) => request(`/bookings?${new URLSearchParams(params || {})}`),
  getBooking: (id) => request(`/bookings/${id}`),
  createBooking: (data) => request('/bookings', { method: 'POST', body: data }),
  updateBookingStatus: (id, status) => request(`/bookings/${id}/status`, { method: 'PUT', body: { status } }),
  getBookingStats: () => request('/bookings/stats/me'),

  // Payments
  createPayment: (data) => request('/payments/create', { method: 'POST', body: data }),
  verifyPayment: (id) => request(`/payments/verify/${id}`),
  getPaymentHistory: (params) => request(`/payments/history?${new URLSearchParams(params || {})}`),
  getReceipt: (id) => request(`/payments/receipt/${id}`),

  // Analytics
  getProviderAnalytics: (params) => request(`/analytics/provider?${new URLSearchParams(params || {})}`),

  // Favorites
  getFavorites: () => request('/favorites'),
  saveFavorite: (listing_id) => request('/favorites', { method: 'POST', body: { listing_id } }),
  removeFavorite: (listing_id) => request(`/favorites/${listing_id}`, { method: 'DELETE' }),
  checkFavorite: (listing_id) => request(`/favorites/check/${listing_id}`),
};
