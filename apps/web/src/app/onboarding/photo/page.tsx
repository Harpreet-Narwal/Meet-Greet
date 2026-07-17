import type { Metadata } from "next";

import { PhotoUpload } from "./photo-upload";

export const metadata: Metadata = {
  title: "Add your face",
  robots: { index: false },
};

export default function PhotoPage() {
  return <PhotoUpload />;
}
