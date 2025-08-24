const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

let TOKEN = null
export function setToken(t) { TOKEN = t }
export function getToken() {
  if (typeof TOKEN !== "undefined" && TOKEN) {
    return TOKEN;
  }
  // FIX: Changed "authToken" to "token" to match what's saved in App.js
  return localStorage.getItem("token") || null;
}


async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  // This logic is slightly improved to use the function, ensuring it checks localStorage as a fallback
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ? JSON.stringify(err.error) : res.statusText)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  listIssues: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/issues?${q}`)
  },
  getIssue: (id) => request(`/issues/${id}`),
  createIssue: (data) => request('/issues', { method: 'POST', body: JSON.stringify(data) }),
  updateIssue: (id, data) => request(`/issues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  closeIssue: (id) => request(`/issues/${id}/close`, { method: 'PATCH' }),
  deleteIssue: (id) => request(`/issues/${id}`, { method: 'DELETE' }),
  listComments: (id) => request(`/issues/${id}/comments`),
  addComment: (id, data) => request(`/issues/${id}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  streamIssue: (id, onEvent) => {
    const url = `${API_URL}/issues/${id}/stream`
    let evtSource = new EventSource(url, { withCredentials: false })
    evtSource.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)) } catch { }
    }
    evtSource.onerror = () => {
      // Browser handles reconnection using server 'retry' hint.
    }
    return () => evtSource.close()
  }
}