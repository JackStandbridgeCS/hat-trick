import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { removeBackground } from "@imgly/background-removal";
import { GoogleGenAI } from "@google/genai";
import systemPrompt from "../prompt.txt?raw";
import { uploadHatAsset } from "../hatAssetUpload";
import "./HatGenerator.css";

const HAT_IDEAS = [
  "a wizard hat with sparkly stars",
  "a pirate tricorn with a skull emblem",
  "a chef's toque with a little fork",
  "a viking helmet with tiny horns",
  "a cowboy hat with a sheriff star",
  "a top hat with a magic wand",
  "a baseball cap worn backwards",
  "a crown with colorful gems",
  "a beanie with a pom-pom",
  "a sombrero with festive patterns",
  "a fez with a tassel",
  "a beret with a paintbrush",
  "a hard hat with warning stripes",
  "a santa hat with jingle bells",
  "a graduation cap with gold tassel",
];

interface HatGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onHatGenerated: (
    hatImageUrl: string,
    hatName: string,
    serverUrl: string | null
  ) => void;
}

type GenerationStep =
  | "idle"
  | "generating-prompt"
  | "generating-image"
  | "removing-bg"
  | "uploading";

export function HatGenerator({
  isOpen,
  onClose,
  onHatGenerated,
}: HatGeneratorProps) {
  const [apiKey, setApiKey] = useState("");
  const [hatIdea, setHatIdea] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<GenerationStep>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  // Load saved API key from localStorage
  useEffect(() => {
    console.info(">>> Loading saved API key from localStorage");
    const savedApiKey = localStorage.getItem("gemini-api-key");
    if (savedApiKey) {
      console.info(">>> Found saved API key");
      setApiKey(savedApiKey);
    }
  }, []);

  // Save API key when it changes
  const handleApiKeyChange = (value: string) => {
    console.info(">>> API key changed, saving to localStorage");
    setApiKey(value);
    localStorage.setItem("gemini-api-key", value);
  };

  const handleThinkForMe = () => {
    const randomIndex = Math.floor(Math.random() * HAT_IDEAS.length);
    const randomIdea = HAT_IDEAS[randomIndex];
    console.info(">>> Think for me clicked", { randomIdea });
    setHatIdea(randomIdea);
  };

  const generateImagePrompt = async (): Promise<string | null> => {
    console.info(">>> Generating image prompt from hat idea", { hatIdea });
    setCurrentStep("generating-prompt");
    setStatus("🧠 Generating optimized prompt...");

    try {
      const ai = new GoogleGenAI({ apiKey });

      console.info(">>> Calling Gemini Flash 2 for prompt generation");
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: hatIdea,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const generatedText =
        response?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.info(">>> Generated prompt received", { generatedText });

      if (!generatedText) {
        console.error(">>> No text in response");
        setStatus("❌ Failed to generate prompt. Try again.");
        return null;
      }

      setGeneratedPrompt(generatedText);
      return generatedText;
    } catch (error) {
      console.error(">>> Error generating prompt:", error);
      setStatus(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return null;
    }
  };

  const generateImage = async (prompt: string): Promise<Blob | null> => {
    console.info(">>> Generating image with prompt", { prompt });
    setCurrentStep("generating-image");
    setStatus("🎨 Generating image with Gemini...");

    try {
      const ai = new GoogleGenAI({ apiKey });

      console.info(">>> Calling Gemini Flash Image API");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
        config: {
          responseModalities: ["Text", "Image"],
        },
      });

      console.info(">>> API response received", { response });
      const parts = response?.candidates?.[0]?.content?.parts ?? [];
      console.info(">>> Response parts", { partsCount: parts.length });

      for (const part of parts) {
        console.info(">>> Processing part", {
          hasInlineData: !!part.inlineData,
          hasText: !!part.text,
        });

        if (part.inlineData) {
          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || "image/png";
          console.info(">>> Found image data", {
            mimeType,
            dataLength: imageData?.length,
          });

          // Convert base64 to blob
          const byteCharacters = atob(imageData!);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const imageBlob = new Blob([byteArray], { type: mimeType });
          console.info(">>> Created image blob", { size: imageBlob.size });

          return imageBlob;
        }
      }

      console.info(">>> No image found in response");
      setStatus("❌ No image was generated. Try a different idea.");
      return null;
    } catch (error) {
      console.error(">>> Error generating image:", error);
      setStatus(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return null;
    }
  };

  const removeImageBackground = async (
    imageBlob: Blob
  ): Promise<{ dataUrl: string; blob: Blob } | null> => {
    console.info(">>> Starting background removal", {
      size: imageBlob.size,
      type: imageBlob.type,
    });
    setCurrentStep("removing-bg");
    setStatus("✂️ Removing background... (this may take a moment)");

    try {
      const resultBlob = await removeBackground(imageBlob, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            const percent = Math.round((current / total) * 100);
            console.info(">>> Background removal progress", { key, percent });
            setStatus(`${key}: ${percent}%`);
          }
        },
      });

      console.info(">>> Background removal complete", {
        resultSize: resultBlob.size,
      });

      // Convert blob to data URL for preview
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setPreviewUrl(dataUrl);
          resolve({ dataUrl, blob: resultBlob });
        };
        reader.readAsDataURL(resultBlob);
      });
    } catch (error) {
      console.error(">>> Error removing background:", error);
      setStatus(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return null;
    }
  };

  const uploadHatToServer = async (blob: Blob): Promise<string | null> => {
    console.info(">>> Uploading hat to server");
    setCurrentStep("uploading");
    setStatus("☁️ Uploading hat to share with others...");

    try {
      const url = await uploadHatAsset(blob);
      console.info(">>> Hat uploaded successfully", { url });
      setServerUrl(url);
      return url;
    } catch (error) {
      console.error(">>> Error uploading hat:", error);
      // Non-fatal - hat will still work locally
      setStatus("⚠️ Upload failed, hat will only be visible to you");
      return null;
    }
  };

  const handleGenerate = async () => {
    console.info(">>> Generate button clicked");

    if (!apiKey.trim()) {
      console.info(">>> No API key provided");
      setStatus("❌ Please enter your Gemini API key");
      return;
    }

    if (!hatIdea.trim()) {
      console.info(">>> No hat idea provided");
      setStatus("❌ Please enter a hat idea or click 'Think for me'");
      return;
    }

    console.info(">>> Starting full generation pipeline", { hatIdea });
    setIsGenerating(true);
    setPreviewUrl(null);
    setGeneratedPrompt("");

    try {
      // Step 1: Generate optimized prompt
      const imagePrompt = await generateImagePrompt();
      if (!imagePrompt) {
        setIsGenerating(false);
        setCurrentStep("idle");
        return;
      }

      // Step 2: Generate image
      const imageBlob = await generateImage(imagePrompt);
      if (!imageBlob) {
        setIsGenerating(false);
        setCurrentStep("idle");
        return;
      }

      // Step 3: Remove background
      const result = await removeImageBackground(imageBlob);
      if (!result) {
        setIsGenerating(false);
        setCurrentStep("idle");
        return;
      }

      // Step 4: Upload to server (so other users can see it)
      const uploadedUrl = await uploadHatToServer(result.blob);

      if (uploadedUrl) {
        setStatus("✅ Done! Your hat will be visible to everyone in the room.");
      } else {
        setStatus('✅ Done! Click "Use This Hat" to wear it (local only).');
      }
    } finally {
      console.info(">>> Generation pipeline complete");
      setIsGenerating(false);
      setCurrentStep("idle");
    }
  };

  const handleUseHat = () => {
    if (previewUrl) {
      // Create a short name from the idea
      const hatName = hatIdea.slice(0, 30) + (hatIdea.length > 30 ? "..." : "");
      onHatGenerated(previewUrl, hatName, serverUrl);
      handleClose();
    }
  };

  const handleClose = () => {
    setHatIdea("");
    setGeneratedPrompt("");
    setStatus("");
    setPreviewUrl(null);
    setServerUrl(null);
    setCurrentStep("idle");
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.info(">>> No file selected");
      return;
    }
    console.info(">>> File uploaded", {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    setIsGenerating(true);
    setGeneratedPrompt("");
    setServerUrl(null);
    setHatIdea(file.name.replace(/\.[^/.]+$/, ""));

    const result = await removeImageBackground(file);
    if (result) {
      // Upload to server so others can see it
      const uploadedUrl = await uploadHatToServer(result.blob);
      if (uploadedUrl) {
        setStatus("✅ Done! Your hat will be visible to everyone in the room.");
      } else {
        setStatus('✅ Done! Click "Use This Hat" to wear it (local only).');
      }
    }
    setIsGenerating(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="hat-generator-overlay" onClick={handleClose}>
      <div className="hat-generator-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="hat-generator-close"
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>

        <h2>🎨 Create Your Hat</h2>

        <div className="hat-generator-form">
          <div className="input-group">
            <label htmlFor="api-key">Gemini API Key</label>
            <input
              type="password"
              id="api-key"
              placeholder="Enter your Gemini API key"
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
            />
            <p className="hint">
              Your key is stored locally and sent directly to Google's API.
            </p>
          </div>

          <div className="input-group">
            <label htmlFor="hat-idea">What kind of hat do you want?</label>
            <div className="input-with-button">
              <input
                type="text"
                id="hat-idea"
                placeholder="e.g., a wizard hat with stars"
                value={hatIdea}
                onChange={(e) => setHatIdea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGenerating) {
                    handleGenerate();
                  }
                }}
              />
              <button
                className="btn btn-secondary"
                onClick={handleThinkForMe}
                disabled={isGenerating}
                type="button"
              >
                🎲
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating
              ? currentStep === "generating-prompt"
                ? "🧠 Generating prompt..."
                : currentStep === "generating-image"
                ? "🎨 Creating image..."
                : currentStep === "removing-bg"
                ? "✂️ Removing background..."
                : currentStep === "uploading"
                ? "☁️ Uploading..."
                : "Working..."
              : "✨ Generate Hat"}
          </button>

          <div className="divider">
            <span>or upload your own image</span>
          </div>

          <div className="upload-section">
            <label
              className="btn btn-secondary upload-btn"
              htmlFor="file-input"
            >
              📁 Upload Image
            </label>
            <input
              type="file"
              id="file-input"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isGenerating}
            />
          </div>
        </div>

        {status && <div className="status">{status}</div>}

        {generatedPrompt && (
          <div className="generated-prompt">
            <h4>Generated Prompt</h4>
            <p>{generatedPrompt}</p>
          </div>
        )}

        {previewUrl && (
          <div className="preview-section">
            <h4>Preview</h4>
            <div className="preview-grid">
              <div className="preview-card light">
                <img src={previewUrl} alt="Hat preview on light" />
              </div>
              <div className="preview-card dark">
                <img src={previewUrl} alt="Hat preview on dark" />
              </div>
            </div>
            <button className="btn btn-success" onClick={handleUseHat}>
              🎩 Use This Hat
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
