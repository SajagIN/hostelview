const TOKEN_KEY = 'hv_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path, params) {
  let url = `/api${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      qs.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
    const s = qs.toString();
    if (s) url += (url.includes('?') ? '&' : '?') + s;
  }
  return url;
}

async function request(method, path, { body, params, form } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(buildUrl(path, params), { method, headers, body: payload });
  } catch {
    throw new ApiError('Cannot reach the HostelView server. Is the backend running?', 0);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    let message = data?.error?.message;
    if (!message) {
      message =
        res.status >= 500
          ? 'The server is not responding properly. Is the backend running and connected to MySQL?'
          : `Request failed (${res.status}).`;
    }
    if (res.status === 401 && token) {
      window.dispatchEvent(new CustomEvent('hv:unauthorized', { detail: message }));
    }
    throw new ApiError(message, res.status, data?.error?.details);
  }
  return data;
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
  upload: (path, form) => request('POST', path, { form }),
};

export function fieldErrors(err) {
  const out = {};
  if (Array.isArray(err?.details)) {
    for (const d of err.details) if (d.field && !out[d.field]) out[d.field] = d.message;
  }
  return out;
}

export const notifyModerationChanged = () => window.dispatchEvent(new Event('hv:moderation-changed'));
