type ConfigModule = typeof import('../config');

const ORIGINAL_ENV = { ...process.env };

function loadConfig(env: Record<string, string | undefined>): ConfigModule {
  // Assigning undefined to process.env stores the string "undefined", so delete instead.
  for (const name of ['EXPO_PUBLIC_STORE_URL', 'EXPO_PUBLIC_API_KEY', 'EXPO_PUBLIC_LANGUAGE'] as const) delete process.env[name];
  for (const [name, value] of Object.entries(env)) if (value !== undefined) (process.env as Record<string, string>)[name] = value;
  let mod!: ConfigModule;
  jest.isolateModules(() => {
    mod = require('../config');
  });
  return mod;
}

const KEY = 'a'.repeat(40);

afterEach(() => {
  for (const name of ['EXPO_PUBLIC_STORE_URL', 'EXPO_PUBLIC_API_KEY', 'EXPO_PUBLIC_LANGUAGE'] as const) delete process.env[name];
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('config', () => {
  it('adds the trailing slash to the store URL and defaults the language', () => {
    const { config, configProblem } = loadConfig({ EXPO_PUBLIC_STORE_URL: 'https://shop.example.com', EXPO_PUBLIC_API_KEY: KEY });
    expect(config.baseUrl).toBe('https://shop.example.com/');
    expect(config.language).toBe('en-gb');
    expect(configProblem(false)).toBeNull();
  });

  it('reports a missing store URL', () => {
    const { configProblem } = loadConfig({ EXPO_PUBLIC_API_KEY: KEY });
    expect(configProblem(true)).toMatch(/EXPO_PUBLIC_STORE_URL/);
  });

  it('reports an invalid URL', () => {
    const { configProblem } = loadConfig({ EXPO_PUBLIC_STORE_URL: 'shop.example.com', EXPO_PUBLIC_API_KEY: KEY });
    expect(configProblem(true)).toMatch(/not a valid/);
  });

  it('allows plain HTTP only in development', () => {
    const { configProblem } = loadConfig({ EXPO_PUBLIC_STORE_URL: 'http://192.168.0.10:8090/', EXPO_PUBLIC_API_KEY: KEY });
    expect(configProblem(true)).toBeNull();
    expect(configProblem(false)).toMatch(/https/);
  });

  it('reports a missing or malformed API key', () => {
    expect(loadConfig({ EXPO_PUBLIC_STORE_URL: 'https://a.test/' }).configProblem(true)).toMatch(/API key/);
    expect(loadConfig({ EXPO_PUBLIC_STORE_URL: 'https://a.test/', EXPO_PUBLIC_API_KEY: 'short' }).configProblem(true)).toMatch(/API key/);
  });
});
