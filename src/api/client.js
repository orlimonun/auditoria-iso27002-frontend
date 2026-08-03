const API_URL = 'http://localhost:8080/api';

function getToken() {
    return localStorage.getItem('token');
}

async function request(path, options = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
        let mensaje = `Error ${res.status}`;
        try {
            const data = await res.json();
            mensaje = data.message || data.error || mensaje;
        } catch {
            // el cuerpo no era JSON, se usa el mensaje default
        }
        throw new Error(mensaje);
    }

    // 204 No Content no trae body
    if (res.status === 204) return null;
    return res.json();
}

export const api = {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' }),
};