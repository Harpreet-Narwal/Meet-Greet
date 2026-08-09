"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@mulaqat/ui";

/** Exported avatar edge, in px. Square — every avatar renders in a circle. */
const OUT = 512;
/** Frame edge in CSS px. The export maths scales from this, so keep them in sync. */
const FRAME = 288;

interface Props {
  file: File;
  onCancel: () => void;
  onDone: (cropped: File) => void;
}

/**
 * Square-crop-with-pan-and-zoom for the profile photo.
 *
 * Written by hand rather than pulling in react-easy-crop: the whole job is one
 * transform and one `drawImage`, and a cropper is not worth ~40KB on a page in
 * the signup funnel.
 *
 * The preview and the export share the same maths — the frame shows exactly
 * `FRAME / scale` source pixels starting at `-offset / scale`, and the canvas
 * draws that same rectangle — so what you position is what you get.
 */
export function AvatarCropper({ file, onCancel, onDone }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Scale at which the image exactly covers the frame; zoom multiplies it.
  const base = natural ? FRAME / Math.min(natural.w, natural.h) : 1;
  const scale = base * zoom;

  /** Keep the frame covered — no empty corners, whatever the pan or zoom. */
  const clamp = useCallback(
    (next: { x: number; y: number }, s: number) => {
      if (!natural) return next;
      const minX = FRAME - natural.w * s;
      const minY = FRAME - natural.h * s;
      return {
        x: Math.min(0, Math.max(minX, next.x)),
        y: Math.min(0, Math.max(minY, next.y)),
      };
    },
    [natural],
  );

  useEffect(() => {
    setOffset((current) => clamp(current, scale));
  }, [scale, clamp]);

  function onLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const el = event.currentTarget;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    setNatural({ w, h });
    const b = FRAME / Math.min(w, h);
    // Start centred.
    setOffset({ x: (FRAME - w * b) / 2, y: (FRAME - h * b) / 2 });
  }

  function startDrag(clientX: number, clientY: number) {
    drag.current = { x: clientX, y: clientY, ox: offset.x, oy: offset.y };
  }

  function moveDrag(clientX: number, clientY: number) {
    const d = drag.current;
    if (!d) return;
    setOffset(clamp({ x: d.ox + (clientX - d.x), y: d.oy + (clientY - d.y) }, scale));
  }

  async function apply() {
    const img = imgRef.current;
    if (!img || !natural) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    // The frame shows this rectangle of the source image.
    const sw = FRAME / scale;
    const sh = FRAME / scale;
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT, OUT);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    setBusy(false);
    if (!blob) return;
    // Always JPEG out: the presign accepts jpeg/png/webp, and re-encoding also
    // strips EXIF (including GPS) from whatever the phone handed us.
    onDone(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
  }

  return (
    <div className="flex flex-col items-center">
      <p className="label">Drag to reposition · pinch or slide to zoom</p>

      <div
        className="relative mt-4 cursor-grab touch-none overflow-hidden bg-band active:cursor-grabbing"
        style={{ width: FRAME, height: FRAME }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          startDrag(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => moveDrag(e.clientX, e.clientY)}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {src ? (
          /* A local blob: URL being cropped on a canvas — next/image cannot take a
             File and would give no benefit here. */
          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={onLoad}
            draggable={false}
            className="max-w-none origin-top-left select-none"
            style={{
              width: natural?.w,
              height: natural?.h,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
          />
        ) : null}

        {/* Circular mask — avatars render round, so crop to what will be seen. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: "0 0 0 9999px color-mix(in srgb, var(--paper) 78%, transparent)",
            borderRadius: "50%",
          }}
        />
      </div>

      <label className="mt-5 flex w-full max-w-[288px] items-center gap-3">
        <span className="label">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none bg-line accent-[var(--accent)]"
          aria-label="Zoom"
          data-testid="crop-zoom"
        />
      </label>

      <div className="mt-6 flex w-full max-w-[288px] gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
          Choose another
        </Button>
        <Button className="flex-1" onClick={apply} disabled={busy || !natural} data-testid="crop-apply">
          {busy ? "Cropping…" : "Use this"}
        </Button>
      </div>
    </div>
  );
}
