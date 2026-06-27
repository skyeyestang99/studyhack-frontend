/**
 * Property 17: API client auth header injection and 401 handling
 * Feature: auth-and-data-model, Property 17: API client auth header injection and 401 handling
 *
 * For any authenticated API request, the API client should include the
 * Authorization: Bearer {token} header. For any API response with HTTP 401,
 * the client should clear the stored token and redirect to /login.
 *
 * **Validates: Requirements 13.4, 13.5**
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock env before importing api-client
vi.mock('@/lib/env', () => ({
  env: { apiUrl: 'http://localhost:8080' },
}));

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location
const locationMock = { href: '' };
Object.defineProperty(window, 'location', { value: locationMock, writable: true });

// Generators
const alphaNum = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-'.split(''));
const tokenArb = fc.string({ unit: alphaNum, minLength: 10, maxLength: 50 });
const pathArb = fc.string({
  unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz/-'.split('')),
  minLength: 1, maxLength: 20,
}).map(s => `/api/${s}`);

describe('Feature: auth-and-data-model, Property 17: API client auth header injection and 401 handling', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorageMock.clear();
    locationMock.href = '';
    vi.clearAllMocks();
    fetchSpy = vi.fn();
    global.fetch = fetchSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes Authorization: Bearer {token} header when token exists', async () => {
    const { apiClient } = await import('@/lib/api-client');

    await fc.assert(
      fc.asyncProperty(tokenArb, pathArb, async (token, path) => {
        localStorageMock.clear();
        localStorageMock.setItem('token', token);
        vi.clearAllMocks();
        fetchSpy = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        global.fetch = fetchSpy;

        await apiClient.get(path);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const headers = fetchSpy.mock.calls[0][1].headers;
        expect(headers['Authorization']).toBe(`Bearer ${token}`);
      }),
      { numRuns: 100 }
    );
  });

  it('does not include Authorization header when no token', async () => {
    const { apiClient } = await import('@/lib/api-client');

    await fc.assert(
      fc.asyncProperty(pathArb, async (path) => {
        localStorageMock.clear();
        vi.clearAllMocks();
        fetchSpy = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        global.fetch = fetchSpy;

        await apiClient.get(path);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const headers = fetchSpy.mock.calls[0][1].headers;
        expect(headers['Authorization']).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('clears token and redirects to /login on 401 response', async () => {
    const { apiClient } = await import('@/lib/api-client');

    await fc.assert(
      fc.asyncProperty(tokenArb, pathArb, async (token, path) => {
        localStorageMock.clear();
        localStorageMock.setItem('token', token);
        localStorageMock.setItem('user', '{"id":"1"}');
        locationMock.href = '';
        vi.clearAllMocks();

        fetchSpy = vi.fn().mockResolvedValueOnce(new Response(
          JSON.stringify({ timestamp: new Date().toISOString(), status: 401, error: 'Unauthorized', message: 'Session expired', path }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ));
        global.fetch = fetchSpy;

        try { await apiClient.get(path); } catch { /* expected */ }

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
        expect(locationMock.href).toBe('/login');
      }),
      { numRuns: 100 }
    );
  });
});
