"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { ApiError, EntitySearchResponse } from "@/types/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const emptySearch = <T>(): EntitySearchResponse<T> => ({
  matches: [],
  canCreate: false,
  threshold: 0,
});

export function useEntitySearch<T>(
  endpoint: string,
  query: string,
  params?: Record<string, string>,
  enabled = true,
) {
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const [data, setData] = useState<EntitySearchResponse<T>>(emptySearch<T>());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serializedParams = params ? JSON.stringify(params) : null;

  const fetchData = useCallback(async () => {
    if (!enabled || !debouncedQuery) {
      setData(emptySearch<T>());
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const parsedParams = serializedParams
        ? (JSON.parse(serializedParams) as Record<string, string>)
        : {};
      const result = await apiClient.get<EntitySearchResponse<T>>(endpoint, {
        params: { ...parsedParams, q: debouncedQuery },
      });
      setData(result);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Search failed");
      setData(emptySearch<T>());
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, enabled, endpoint, serializedParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return useMemo(
    () => ({
      data,
      debouncedQuery,
      isLoading,
      error,
      refresh: fetchData,
    }),
    [data, debouncedQuery, error, fetchData, isLoading],
  );
}
