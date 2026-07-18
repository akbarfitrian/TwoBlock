"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";
import type { Profile } from "@/shared/types";

const RESULT_LIMIT = 20;

export interface UseUserSearchState {
  query: string;
  setQuery: (q: string) => void;
  results: Profile[];
  loading: boolean;
  error: string | null;
}

export function useUserSearch(): UseUserSearchState {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const needle = trimmed.replace(/^@/, "");

      const { data, error: queryError } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${needle}%,wallet_address.ilike.%${needle}%`)
        .order("created_at", { ascending: false })
        .limit(RESULT_LIMIT);

      if (queryError) throw queryError;
      setResults((data as Profile[]) ?? []);
    } catch (err) {
      console.error("[TwoBlock] Failed to search users:", err);
      setError("Failed to search users. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  return { query, setQuery, results, loading, error };
}
