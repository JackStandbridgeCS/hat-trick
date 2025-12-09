import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Editor } from "tldraw";
import {
  HATS,
  HatType,
  CustomHatData,
  isCustomHat,
  isUrlHat,
  getCustomHatId,
  getUrlHatUrl,
} from "./Hats";
import { getLocalStorageItem } from "../localStorage";

// Default hat size (doubled from original 32px)
const DEFAULT_HAT_SIZE = 64;

interface CursorHatsOverlayProps {
  editor: Editor | null;
}

interface HatPosition {
  id: string;
  x: number;
  y: number;
  hatType: string; // Can be HatType or custom hat type
  userName: string;
  isCurrentUser?: boolean;
}

// Load custom hats from localStorage
function loadCustomHats(): CustomHatData[] {
  try {
    const stored = getLocalStorageItem("custom-hats");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("Failed to load custom hats:", error);
  }
  return [];
}

// Load hat size from localStorage
function loadHatSize(): number {
  try {
    const stored = getLocalStorageItem("user-hat-size");
    if (stored) {
      const size = parseInt(stored, 10);
      if (!isNaN(size) && size >= 24 && size <= 128) {
        return size;
      }
    }
  } catch (error) {
    console.warn("Failed to load hat size:", error);
  }
  return DEFAULT_HAT_SIZE;
}

export function CursorHatsOverlay({ editor }: CursorHatsOverlayProps) {
  const [hatPositions, setHatPositions] = useState<HatPosition[]>([]);
  const [currentUserHat, setCurrentUserHat] = useState<HatPosition | null>(
    null
  );
  const [customHats, setCustomHats] = useState<CustomHatData[]>([]);
  const [hatSize, setHatSize] = useState(DEFAULT_HAT_SIZE);

  // Load custom hats, size, and listen for changes
  useEffect(() => {
    setCustomHats(loadCustomHats());
    setHatSize(loadHatSize());

    // Listen for storage changes to update custom hats
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "custom-hats") {
        setCustomHats(loadCustomHats());
      }
      if (e.key === "user-hat-size") {
        setHatSize(loadHatSize());
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Listen for custom hat-size-changed event (from same window)
    const handleHatSizeChanged = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setHatSize(customEvent.detail);
    };
    window.addEventListener("hat-size-changed", handleHatSizeChanged);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("hat-size-changed", handleHatSizeChanged);
    };
  }, []);

  useEffect(() => {
    if (!editor) return;

    // Function to update hat positions from collaborator presence
    const updateHatPositions = () => {
      const collaborators = editor.getCollaborators();

      const positions: HatPosition[] = collaborators
        .filter((c) => c.cursor !== null)
        .map((collaborator) => {
          // Parse the name to extract hat type: "Name|hatType"
          const [displayName, hatType] = (collaborator.userName || "").split(
            "|"
          );

          // Convert page coordinates to screen coordinates
          const screenPoint = editor.pageToScreen({
            x: collaborator.cursor!.x,
            y: collaborator.cursor!.y,
          });

          return {
            id: collaborator.id,
            x: screenPoint.x,
            y: screenPoint.y,
            hatType: hatType || "tophat",
            userName: displayName || "User",
          };
        });

      setHatPositions(positions);

      // Update current user's hat position based on mouse position
      const currentHat = getLocalStorageItem("user-hat") || "tophat";
      const currentUserName = getLocalStorageItem("user-name") || "You";
      const { currentScreenPoint } = editor.inputs;

      setCurrentUserHat({
        id: "current-user",
        x: currentScreenPoint.x,
        y: currentScreenPoint.y,
        hatType: currentHat,
        userName: currentUserName,
        isCurrentUser: true,
      });
    };

    // Initial update
    updateHatPositions();

    // Subscribe to store changes to update positions
    const unsubscribe = editor.store.listen(updateHatPositions, {
      source: "all",
      scope: "presence",
    });

    // Also listen for pointer move to update current user's hat
    const handlePointerMove = () => {
      const currentHat = getLocalStorageItem("user-hat") || "tophat";
      const currentUserName = getLocalStorageItem("user-name") || "You";
      const { currentScreenPoint } = editor.inputs;

      setCurrentUserHat({
        id: "current-user",
        x: currentScreenPoint.x,
        y: currentScreenPoint.y,
        hatType: currentHat,
        userName: currentUserName,
        isCurrentUser: true,
      });
    };

    // Listen for pointer events on the container
    const container = editor.getContainer();
    container.addEventListener("pointermove", handlePointerMove);

    // Also listen for camera changes
    editor.on("change", updateHatPositions);

    return () => {
      unsubscribe();
      container.removeEventListener("pointermove", handlePointerMove);
    };
  }, [editor]);

  // Combine all hats (collaborators + current user)
  const allHats = [...hatPositions];
  if (currentUserHat) {
    allHats.push(currentUserHat);
  }

  if (allHats.length === 0) return null;

  // Render a hat (either built-in SVG, URL-based, or local custom)
  const renderHat = (hatType: string, size: number) => {
    // URL-based hat (server-hosted, shareable!) - this is how other users see custom hats
    if (isUrlHat(hatType)) {
      const url = getUrlHatUrl(hatType);
      return (
        <img
          src={url}
          alt="Custom hat"
          style={{
            width: size,
            height: size,
            objectFit: "contain",
          }}
        />
      );
    }

    // Local custom hat (only visible to the creator, stored in localStorage)
    if (isCustomHat(hatType)) {
      const customHatId = getCustomHatId(hatType);
      const customHat = customHats.find((h) => h.id === customHatId);
      if (customHat) {
        return (
          <img
            src={customHat.imageUrl}
            alt={customHat.name}
            style={{
              width: size,
              height: size,
              objectFit: "contain",
            }}
          />
        );
      }
    }

    // Built-in hat - use SVG with scaled size
    const hatData = HATS[hatType as HatType];

    // Render SVG with new size using viewBox for scaling
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: size, height: size }}
        >
          {hatData?.svgContent || HATS.tophat.svgContent}
        </svg>
      </div>
    );
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 99998,
      }}
    >
      {allHats.map((pos) => {
        // Position hat above cursor tip
        // Generated hat images have transparent padding around the visual content
        // The actual hat visual is typically in the center ~60-70% of the image
        // So we offset by about 60% of the hat size to get the visual near the cursor
        const hatOffset = hatSize * 0.6;

        return (
          <div
            key={pos.id}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y - hatOffset,
              transform: "translateX(-50%)",
              width: hatSize,
              height: hatSize,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              transition: pos.isCurrentUser
                ? "none"
                : "left 0.05s linear, top 0.05s linear",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {renderHat(pos.hatType, hatSize)}
          </div>
        );
      })}
    </div>,
    document.body
  );
}
