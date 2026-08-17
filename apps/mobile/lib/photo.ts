import * as ImagePicker from "expo-image-picker";

import { api } from "./api";

/**
 * Profile photo: pick, crop, upload, attach.
 *
 * The web app ships a hand-written pan-and-zoom cropper because a browser has no
 * system one. A phone does — `allowsEditing` opens the OS crop sheet, which is
 * better than anything worth reimplementing here: it is the interaction people
 * already know, it is gesture-smooth because it is native, and it costs no
 * bundle size. Porting `avatar-cropper.tsx` would have been more code for a
 * worse result.
 *
 * `aspect: [1, 1]` because avatars render in a circle everywhere, so the crop
 * has to be square or the framing you choose is not the framing you get.
 */
export interface PhotoResult {
  ok: boolean;
  /** Null when the picker was dismissed — not an error, just a change of mind. */
  publicUrl?: string | null;
  message?: string;
}

export async function pickAndUploadPhoto(): Promise<PhotoResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      ok: false,
      message: "Photo access is off. Turn it on in Settings to add a picture.",
    };
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    // Re-encode rather than upload the original: a modern phone photo is 3–8MB
    // for something displayed at 96px, and the re-encode also strips EXIF —
    // including the GPS tag on where the picture was taken.
    quality: 0.85,
  });
  if (picked.canceled) return { ok: true, publicUrl: null };

  const asset = picked.assets[0];
  if (!asset) return { ok: false, message: "That image couldn't be read." };

  // The picker normalises to JPEG when it edits; trust its mime when given.
  const contentType = asset.mimeType ?? "image/jpeg";

  const presigned = await api<{ upload_url: string; public_url: string }>("/me/photo", {
    method: "POST",
    body: JSON.stringify({ content_type: contentType }),
  });
  if (!presigned.ok || !presigned.data) {
    return { ok: false, message: presigned.message ?? "Couldn't start the upload." };
  }

  // Straight to object storage with the presigned PUT — the api never proxies
  // the bytes. `fetch` with a blob rather than FormData: a presigned PUT expects
  // the raw body, and a multipart wrapper would be stored as the file.
  try {
    const file = await fetch(asset.uri);
    const blob = await file.blob();
    const upload = await fetch(presigned.data.upload_url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    if (!upload.ok) return { ok: false, message: "The upload didn't complete." };
  } catch {
    return { ok: false, message: "No connection — try again." };
  }

  // Only now attach it: a photo_url pointing at a failed upload would render as
  // a broken image on every surface that shows an avatar.
  const attached = await api("/me", {
    method: "PATCH",
    body: JSON.stringify({ photo_url: presigned.data.public_url }),
  });
  if (!attached.ok) return { ok: false, message: attached.message ?? "Couldn't save it." };

  return { ok: true, publicUrl: presigned.data.public_url };
}
