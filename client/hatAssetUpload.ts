import { uniqueId } from "tldraw";

// Check if we're in production mode (Cloudflare worker available)
const isProduction = import.meta.env.PROD;

/**
 * Upload a hat image to the server (production only).
 * In development, this returns null since the Cloudflare worker isn't running.
 * Returns the server URL that can be shared with other clients.
 */
export async function uploadHatAsset(
  imageDataOrBlob: string | Blob
): Promise<string | null> {
  // In development, there's no Cloudflare worker to handle uploads
  // The /api/uploads/ routes only exist in production
  if (!isProduction) {
    console.info(">>> Skipping hat upload (development mode - no worker)");
    return null;
  }

  // Convert data URL to File if needed (matches multiplayerAssetStore pattern)
  let file: File;
  if (typeof imageDataOrBlob === "string") {
    const blob = dataUrlToBlob(imageDataOrBlob);
    file = new File([blob], "custom-hat.png", { type: blob.type });
  } else {
    file = new File([imageDataOrBlob], "custom-hat.png", {
      type: imageDataOrBlob.type || "image/png",
    });
  }

  // Create a unique filename (matching multiplayerAssetStore pattern)
  const id = uniqueId();
  const objectName = `${id}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, "-");
  const url = `/api/uploads/${objectName}`;

  console.info(">>> Uploading hat asset", { objectName, size: file.size });

  try {
    // Upload to the server (matches multiplayerAssetStore exactly)
    const response = await fetch(url, {
      method: "POST",
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload hat: ${response.statusText}`);
    }

    console.info(">>> Hat asset uploaded successfully", { url });
    return url;
  } catch (error) {
    console.error(">>> Hat upload failed:", error);
    return null;
  }
}

/**
 * Convert a data URL to a Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Check if a URL is a remote hat URL (server-hosted)
 */
export function isRemoteHatUrl(url: string): boolean {
  return url.startsWith("/api/uploads/") || url.startsWith("http");
}
