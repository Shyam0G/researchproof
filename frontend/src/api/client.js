/**
 * Unified API Client for Collaborative Research Ecosystem
 */

const BASE_URL = '/api';

export function getToken() {
  return localStorage.getItem('cre_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('cre_token', token);
  } else {
    localStorage.removeItem('cre_token');
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const token = getToken();

  const headers = {
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle JSON payloads
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        // Clear invalid token
        setToken(null);
      }
      const err = new Error(data.message || `Request failed with status ${res.status}`);
      err.status = res.status;
      err.code = data.error;
      throw err;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body }),
  upload: (endpoint, formData) => request(endpoint, { method: 'POST', body: formData })
};
