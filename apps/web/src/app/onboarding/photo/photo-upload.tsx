"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button, ButtonLink, Card, LogoMark } from "@mulaqat/ui";

import { postJson } from "@/lib/client";

export function PhotoUpload() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setFile(picked);
    setError(null);
    if (picked) setPreview(URL.createObjectURL(picked));
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);

    const presign = await postJson<{ upload_url: string; public_url: string }>(
      "/api/bff/me/photo",
      { content_type: file.type },
    );
    if (!presign.ok || !presign.data) {
      setBusy(false);
      setError(presign.message ?? "Couldn't prepare the upload — try again.");
      return;
    }

    const put = await fetch(presign.data.upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    }).catch(() => null);
    if (!put?.ok) {
      setBusy(false);
      setError("Upload didn't go through — check your connection and retry.");
      return;
    }

    const patch = await postJson("/api/bff/me", { photo_url: presign.data.public_url }, "PATCH");
    setBusy(false);
    if (!patch.ok) {
      setError(patch.message ?? "Saved the photo but not the profile — try again.");
      return;
    }
    router.push("/you");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-16">
      <Card large className="w-full max-w-md p-8 text-center sm:p-10">
        <LogoMark size={36} className="mx-auto text-ink" />
        <h1 className="mt-6 text-[28px] font-bold tracking-tight">Put a face to the name.</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          A clear selfie keeps every table real — it's how we verify that everyone is who
          they say they are. Only your table sees it.
        </p>

        <div className="mt-8 flex flex-col items-center gap-5">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="grid size-40 place-items-center overflow-hidden rounded-full border-2 border-dashed border-line bg-paper transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label="Choose a selfie"
          >
            {preview ? (
              /* plain <img>: next/image can't optimize local blob object URLs */
              <img src={preview} alt="Your selfie preview" className="size-full object-cover" />
            ) : (
              <span className="px-4 text-[14px] text-ink-soft">Tap to add a selfie</span>
            )}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={onPick}
            className="sr-only"
            data-testid="photo-input"
          />

          <Button size="lg" disabled={!file || busy} onClick={upload} data-testid="upload-photo">
            {busy ? "Uploading…" : "Use this one"}
          </Button>
          <ButtonLink href="/you" variant="ghost" size="sm">
            I'll do this later
          </ButtonLink>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-[14px] font-medium text-danger">
            {error}
          </p>
        ) : null}
      </Card>
    </main>
  );
}
