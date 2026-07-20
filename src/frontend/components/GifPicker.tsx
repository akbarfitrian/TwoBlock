"use client";

import { useEffect, useRef, useState } from "react";
import { GifIcon, SearchIcon } from "@/frontend/components/icons";

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_width_small: GiphyImage;
    original: GiphyImage;
  };
}

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
const SEARCH_DEBOUNCE_MS = 400;

async function fetchGifs(query: string): Promise<GiphyGif[]> {
  const endpoint = query.trim()
    ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query.trim())}&limit=24&rating=pg-13`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=pg-13`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("Giphy request failed");
  const body = await res.json();
  return (body.data ?? []) as GiphyGif[];
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  disabled?: boolean;
}

export function GifPicker({ onSelect, disabled }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !GIPHY_API_KEY) return;
    setLoading(true);
    setError(null);
    const timeout = setTimeout(async () => {
      try {
        const results = await fetchGifs(query);
        setGifs(results);
      } catch (err) {
        console.error("[TwoBlock] Giphy search failed:", err);
        setError("Couldn't load GIFs. Try again.");
      } finally {
        setLoading(false);
      }
    }, query ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timeout);
  }, [open, query]);

  const handlePick = (gif: GiphyGif) => {
    onSelect(gif.images.original.url);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          open ? "bg-brand-blue/10 text-brand-blue" : "text-brand-blue hover:bg-brand-blue/10"
        } disabled:opacity-40`}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="Add GIF"
      >
        <GifIcon size={19} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-80 max-w-[85vw] overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
          {!GIPHY_API_KEY ? (
            <p className="px-4 py-6 text-center text-[13px] text-ink-muted">
              GIF search isn&apos;t configured yet. Set NEXT_PUBLIC_GIPHY_API_KEY to enable it.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2.5">
                <SearchIcon size={16} />
                <input
                  autoFocus
                  type="text"
                  className="w-full bg-transparent text-[13.5px] text-ink placeholder:text-ink-faint outline-none"
                  placeholder="Search GIPHY"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="grid max-h-72 grid-cols-3 gap-1 overflow-y-auto p-2">
                {loading && <p className="col-span-3 py-8 text-center text-[13px] text-ink-faint">Loading…</p>}
                {!loading && error && <p className="col-span-3 py-8 text-center text-[13px] text-danger">{error}</p>}
                {!loading && !error && gifs.length === 0 && (
                  <p className="col-span-3 py-8 text-center text-[13px] text-ink-faint">No GIFs found.</p>
                )}
                {!loading &&
                  !error &&
                  gifs.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      className="aspect-square overflow-hidden rounded-lg bg-surface-soft transition-opacity hover:opacity-80"
                      onClick={() => handlePick(gif)}
                    >
                      <img
                        src={gif.images.fixed_width_small.url}
                        alt={gif.title}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
