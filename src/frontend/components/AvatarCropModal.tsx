"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { XIcon } from "@/frontend/components/icons";

const CONTAINER = 320;
const FRAME = 240;
const OUTPUT = 480;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface Offset {
  x: number;
  y: number;
}

export function AvatarCropModal({
  file,
  onCancel,
  onCropped,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ pointerX: number; pointerY: number; offset: Offset } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const frameBounds = (CONTAINER - FRAME) / 2;

  const baseScale = useMemo(() => {
    if (!naturalSize) return 1;
    return FRAME / Math.min(naturalSize.w, naturalSize.h);
  }, [naturalSize]);

  const scale = baseScale * zoom;

  const displayed = naturalSize ? { w: naturalSize.w * scale, h: naturalSize.h * scale } : null;

  const clampOffset = (next: Offset, dims = displayed): Offset => {
    if (!dims) return next;
    const minX = frameBounds + FRAME - dims.w;
    const maxX = frameBounds;
    const minY = frameBounds + FRAME - dims.h;
    const maxY = frameBounds;
    return {
      x: Math.min(maxX, Math.max(minX, next.x)),
      y: Math.min(maxY, Math.max(minY, next.y)),
    };
  };

  const handleImageLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalSize({ w, h });
    const initialScale = FRAME / Math.min(w, h);

    setOffset({
      x: frameBounds - (w * initialScale - FRAME) / 2,
      y: frameBounds - (h * initialScale - FRAME) / 2,
    });
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { pointerX: e.clientX, pointerY: e.clientY, offset };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.pointerX;
    const dy = e.clientY - dragStart.current.pointerY;
    setOffset(
      clampOffset({
        x: dragStart.current.offset.x + dx,
        y: dragStart.current.offset.y + dy,
      })
    );
  };

  const handlePointerUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  const handleZoomChange = (nextZoomPct: number) => {
    const nextZoom = nextZoomPct / 100;
    const nextDims = naturalSize
      ? { w: naturalSize.w * baseScale * nextZoom, h: naturalSize.h * baseScale * nextZoom }
      : null;
    setZoom(nextZoom);
    setOffset((prev) => clampOffset(prev, nextDims));
  };

  const handleApply = async () => {
    const img = imgRef.current;
    if (!img || !naturalSize) return;
    setProcessing(true);
    try {
      const sourceX = (frameBounds - offset.x) / scale;
      const sourceY = (frameBounds - offset.y) / scale;
      const sourceSize = FRAME / scale;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT, OUTPUT);

      canvas.toBlob(
        (blob) => {
          setProcessing(false);
          if (blob) onCropped(blob);
        },
        file.type === "image/png" ? "image/png" : "image/jpeg",
        0.92
      );
    } catch {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true">
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <h2 className="font-display text-[16px] font-bold text-ink">Adjust avatar</h2>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-hover"
            onClick={onCancel}
            aria-label="Close"
          >
            <XIcon size={16} />
          </button>
        </div>

        <div
          className="relative mx-auto my-5 select-none overflow-hidden bg-black touch-none"
          style={{ width: CONTAINER, height: CONTAINER, cursor: dragging ? "grabbing" : "grab" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {imgUrl && (

            <img
              ref={imgRef}
              src={imgUrl}
              alt=""
              onLoad={handleImageLoad}
              draggable={false}
              className="pointer-events-none absolute left-0 top-0"
              style={
                displayed
                  ? { width: displayed.w, height: displayed.h, transform: `translate(${offset.x}px, ${offset.y}px)` }
                  : { opacity: 0 }
              }
            />
          )}
          {}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              boxShadow: `0 0 0 2000px rgba(0,0,0,0.6)`,
              width: FRAME,
              height: FRAME,
              left: frameBounds,
              top: frameBounds,
              borderRadius: "9999px",
              outline: "1px solid rgba(255,255,255,0.5)",
            }}
          />
        </div>

        <div className="flex items-center gap-3 px-5 pb-2">
          <span className="text-[12px] text-ink-faint">−</span>
          <input
            type="range"
            min={MIN_ZOOM * 100}
            max={MAX_ZOOM * 100}
            value={zoom * 100}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="h-1.5 w-full appearance-none rounded-full bg-surface-border accent-brand-blue"
          />
          <span className="text-[14px] text-ink-faint">+</span>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-border px-4 py-3">
          <button
            type="button"
            className="rounded-full border border-surface-border px-5 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover"
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full bg-brand-gradient px-5 py-2.5 text-[14px] font-bold text-accent-contrast shadow-glow disabled:opacity-50"
            onClick={handleApply}
            disabled={processing || !naturalSize}
          >
            {processing ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
