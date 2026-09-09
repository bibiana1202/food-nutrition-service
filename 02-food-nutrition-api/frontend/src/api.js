class RequestError extends Error {
  constructor(status, payload) {
    super(payload.message || '요청을 완료하지 못했습니다.');
    this.status = status;
    this.payload = payload;
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

async function api(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    signal: options.signal,
    headers: {
      ...(options.body === void 0 ? {} : { 'Content-Type': 'application/json' }),
      ...(options.key ? { Authorization: `Bearer ${options.key}` } : {}),
    },
    body: options.body === void 0 ? void 0 : JSON.stringify(options.body),
  });

  if (response.status === 204) return void 0;

  const payload = await response.json();
  if (!response.ok) throw new RequestError(response.status, payload);
  return payload.data;
}

export { RequestError, api };
