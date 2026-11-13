type ClientModule = typeof import('../api/client');

const KEY = 'b'.repeat(40);

function loadClient(): ClientModule {
  Object.assign(process.env, { EXPO_PUBLIC_STORE_URL: 'https://shop.example.com/', EXPO_PUBLIC_API_KEY: KEY, EXPO_PUBLIC_LANGUAGE: 'en-gb' });
  let mod!: ClientModule;
  jest.isolateModules(() => {
    mod = require('../api/client');
  });
  return mod;
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    status,
    headers: { get: (name: string) => headers[name] ?? null },
    json: async () => body,
  } as unknown as Response;
}

describe('buildUrl', () => {
  it('builds the extension route with language and drops empty parameters', () => {
    const { buildUrl } = loadClient();
    const url = new URL(buildUrl('product.index', { category_id: 20, search: '', page: 2, filter: undefined }));
    expect(url.origin + url.pathname).toBe('https://shop.example.com/index.php');
    expect(url.searchParams.get('route')).toBe('extension/mobile_api/api/product.index');
    expect(url.searchParams.get('language')).toBe('en-gb');
    expect(url.searchParams.get('category_id')).toBe('20');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.has('search')).toBe(false);
    expect(url.searchParams.has('filter')).toBe(false);
  });
});

describe('request', () => {
  afterEach(() => {
    (globalThis as { fetch?: unknown }).fetch = undefined;
  });

  it('sends the API key, unwraps data and stores the session token the server returns', async () => {
    const client = loadClient();
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ success: true, data: { ok: 1 } }, 200, { 'X-Session-Token': 'abcdefghijklmnopqrstuvwxyz12' }));
    (globalThis as { fetch?: unknown }).fetch = fetchMock;

    await expect(client.request<{ ok: number }>('common.init')).resolves.toEqual({ ok: 1 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['X-Api-Key']).toBe(KEY);
    expect(init.method).toBe('GET');
    expect(client.getSessionToken()).toBe('abcdefghijklmnopqrstuvwxyz12');
  });

  it('sends POST bodies as JSON', async () => {
    const client = loadClient();
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ success: true, data: {} }));
    (globalThis as { fetch?: unknown }).fetch = fetchMock;

    await client.request('cart.add', { body: { product_id: 40, quantity: 1 } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ product_id: 40, quantity: 1 });
  });

  it('turns an error envelope into an ApiError with field errors', async () => {
    const client = loadClient();
    (globalThis as { fetch?: unknown }).fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ success: false, error: 'E-Mail invalid', errors: { email: 'E-Mail invalid' } }, 422));

    const error = await client.request('account.register', { body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(client.ApiError);
    expect(error).toMatchObject({ message: 'E-Mail invalid', status: 422, errors: { email: 'E-Mail invalid' } });
  });

  it('explains a non-JSON response', async () => {
    const client = loadClient();
    (globalThis as { fetch?: unknown }).fetch = jest.fn().mockResolvedValue({
      status: 500,
      headers: { get: () => null },
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });
    await expect(client.request('common.init')).rejects.toThrow(/Mobile App API extension/);
  });

  it('reports a network failure without leaking the raw error', async () => {
    const client = loadClient();
    (globalThis as { fetch?: unknown }).fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(client.request('common.init')).rejects.toThrow('Cannot reach the store. Check your internet connection.');
  });
});
