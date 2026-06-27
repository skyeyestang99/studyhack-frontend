"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/types/api";

interface UseEntitiesReturn<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useEntities<T>(
  endpoint: string,
  params?: Record<string, string>
): UseEntitiesReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const serializedParams = params ? JSON.stringify(params) : null;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const parsedParams = serializedParams
        ? (JSON.parse(serializedParams) as Record<string, string>)
        : undefined;
      const result = await apiClient.get<T[]>(endpoint, {
        params: parsedParams,
      });
      setData(result);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "An unexpected error occurred");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, serializedParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}
