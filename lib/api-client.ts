import { env } from "@/lib/env";
import { getMockResponse } from "@/lib/mock-data";
import { ApiError } from "@/types/api";

const DEFAULT_TIMEOUT_MS = 30_000;

interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, env.apiUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
}

function buildHeaders(config?: RequestConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  if (config?.headers) {
    Object.assign(headers, config.headers);
  }

  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  // 401 or 403: clear auth and redirect to login (Spring Security returns 403 for expired tokens)
  if (response.status === 401 || response.status === 403) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    // Still throw the error
    try {
      const error: ApiError = await response.json();
      throw error;
    } catch (e) {
      if ((e as ApiError).status) throw e;
      throw {
        timestamp: new Date().toISOString(),
        status: response.status,
        error: response.status === 401 ? "Unauthorized" : "Forbidden",
        message: "Session expired",
        path: new URL(response.url).pathname,
      } as ApiError;
    }
  }

  // 4xx: parse backend error response
  if (response.status >= 400 && response.status < 500) {
    try {
      const error: ApiError = await response.json();
      throw error;
    } catch (e) {
      // If parsing fails, the error wasn't an ApiError — rethrow if it already is one
      if ((e as ApiError).status) throw e;
      throw {
        timestamp: new Date().toISOString(),
        status: response.status,
        error: response.statusText,
        message: response.statusText,
        path: new URL(response.url).pathname,
      } as ApiError;
    }
  }

  // 5xx: server error
  throw {
    timestamp: new Date().toISOString(),
    status: response.status,
    error: response.statusText,
    message: "Server error, please try again",
    path: new URL(response.url).pathname,
  } as ApiError;
}

async function request<T>(
  method: string,
  path: string,
  data?: unknown,
  config?: RequestConfig
): Promise<T> {
  const pathWithParams = buildUrl(path, config?.params);
  const mockPath = new URL(pathWithParams).pathname + new URL(pathWithParams).search;
  if (env.useMocks) {
    const mockResponse = getMockResponse<T>(mockPath);
    if (mockResponse !== undefined) return mockResponse;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  // Combine user-provided signal with timeout signal
  const signal = config?.signal
    ? anySignal([config.signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(pathWithParams, {
      method,
      headers: buildHeaders(config),
      body: data !== undefined ? JSON.stringify(data) : undefined,
      signal,
    });

    return handleResponse<T>(response);
  } catch (error) {
    if (error && (error as ApiError).status) {
      throw error;
    }

    if ((error as Error).name === "AbortError") {
      throw {
        timestamp: new Date().toISOString(),
        status: 408,
        error: "Request Timeout",
        message: "Request timed out",
        path,
      } as ApiError;
    }

    // Network error
    if (method === "GET") {
      const mockResponse = getMockResponse<T>(mockPath);
      if (mockResponse !== undefined) return mockResponse;
    }

    throw {
      timestamp: new Date().toISOString(),
      status: 0,
      error: "Network Error",
      message: "Unable to connect to server",
      path,
    } as ApiError;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Combines multiple AbortSignals into one that aborts when any of them aborts.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}

export const apiClient = {
  get<T>(path: string, config?: RequestConfig): Promise<T> {
    return request<T>("GET", path, undefined, config);
  },

  post<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>("POST", path, data, config);
  },

  put<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>("PUT", path, data, config);
  },

  delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return request<T>("DELETE", path, undefined, config);
  },
};
