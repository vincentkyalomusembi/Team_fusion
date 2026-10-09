// Configure these in the frontend environment. In development Vite proxies /api.
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';
const BACKEND = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
const BASE = (import.meta.env.PROD ? BACKEND : '') + API_PREFIX;
const ACCESS_KEY = 'fusion.auth.access_token';
const REFRESH_KEY = 'fusion.auth.refresh_token';
const USER_KEY = 'fusion.auth.user';
const portfolioTokenKey = (id) => `fusion.portfolio.token.${id}`;

export const getAccessToken = () => sessionStorage.getItem(ACCESS_KEY);
export const getPortfolioToken = (id) => sessionStorage.getItem(portfolioTokenKey(id));
export const isSignedIn = () => Boolean(getAccessToken());

function saveSession(auth) {
  sessionStorage.setItem(ACCESS_KEY, auth.access_token);
  if (auth.refresh_token) sessionStorage.setItem(REFRESH_KEY, auth.refresh_token);
  if (auth.user) sessionStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

function clearSession() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);
}

async function req(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(BASE + path, {
    ...opts,
    headers,
    body: isForm || opts.body === undefined ? opts.body : JSON.stringify(opts.body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = typeof body.detail === 'string' ? body.detail : (body.message || message);
    } catch { /* retain status message */ }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

function portfolioHeaders(id, token) {
  const accessToken = token || getPortfolioToken(id);
  if (!accessToken) throw new Error('This portfolio token is missing. Upload the file again to continue.');
  return { 'X-Portfolio-Token': accessToken };
}

export const api = {
  signup: async (credentials) => {
    const auth = await req('/auth/signup', { method: 'POST', body: credentials });
    saveSession(auth);
    return auth;
  },
  signin: async (credentials) => {
    const auth = await req('/auth/signin', { method: 'POST', body: credentials });
    saveSession(auth);
    return auth;
  },
  signout: async () => {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    try {
      if (refreshToken) await req('/auth/signout', { method: 'POST', body: { refresh_token: refreshToken } });
    } finally { clearSession(); }
  },
  hotspots: () => req('/hotspots'),
  portfolios: ({ limit = 100, offset = 0 } = {}) =>
    req(`/portfolios?limit=${limit}&offset=${offset}`),

  upload: async (file, name) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', name);
    const portfolio = await req('/portfolios', { method: 'POST', body: form });
    sessionStorage.setItem(portfolioTokenKey(portfolio.id), portfolio.access_token);
    return portfolio;
  },
  portfolioStatus: (id, token) => req(`/portfolios/${id}/status`, {
    headers: portfolioHeaders(id, token),
  }),
  preview: (id, token, { limit = 500, offset = 0 } = {}) =>
    req(`/portfolios/${id}/preview?limit=${limit}&offset=${offset}`, {
      headers: portfolioHeaders(id, token),
    }),
  saveRows: (id, token, records) => req(`/portfolios/${id}/preview`, {
    method: 'PATCH', headers: portfolioHeaders(id, token), body: { records },
  }),
  predict: (id, token) => req(`/portfolios/${id}/predict`, {
    method: 'POST', headers: portfolioHeaders(id, token),
  }),
  confirm: (id, token) => req(`/portfolios/${id}/confirm`, {
    method: 'POST', headers: portfolioHeaders(id, token),
  }),
  downloadCSV: async (id, token) => {
    const res = await fetch(`${BASE}/portfolios/${id}/export.csv`, {
      headers: {
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        ...portfolioHeaders(id, token),
      },
    });
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try { const body = await res.json(); message = body.detail || message; } catch { /* keep default */ }
      throw new Error(message);
    }
    return res.blob();
  },
  emailCSV: (id, email) => req(`/portfolios/${id}/email`, {
    method: 'POST', headers: portfolioHeaders(id), body: { email },
  }),
  results: async (id) => {
    const headers = portfolioHeaders(id);
    const [result, portfolio] = await Promise.all([
      req(`/portfolios/${id}/results`, { headers }),
      req(`/portfolios/${id}/status`, { headers }),
    ]);
    return { ...result, name: portfolio.name };
  },
  explain: (id) => req(`/portfolios/${id}/explain`, {
    method: 'POST', headers: portfolioHeaders(id),
  }),
  chat: (id, messages) => req(`/portfolios/${id}/chat`, {
    method: 'POST', headers: portfolioHeaders(id), body: { messages },
  }),
  generateReport: (id, title) => req(`/portfolios/${id}/report`, {
    method: 'PUT', headers: portfolioHeaders(id), body: { title },
  }),
  analyse: (id) => req(`/portfolios/${id}/analyse`, {
    method: 'POST', headers: portfolioHeaders(id),
  }),
  analyseEmail: (id, email, attach_csv = false) => req(`/portfolios/${id}/analyse/email`, {
    method: 'POST', headers: portfolioHeaders(id), body: { email, attach_csv },
  }),
};
