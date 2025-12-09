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

export function CursorHatsOverlay({ editor }: CursorHatsOverlayProps) {
  const [hatPositions, setHatPositions] = useState<HatPosition[]>([]);
  const [currentUserHat, setCurrentUserHat] = useState<HatPosition | null>(
    null
  );
  const [customHats, setCustomHats] = useState<CustomHatData[]>([]);

  // Load custom hats and listen for storage changes
  useEffect(() => {
    setCustomHats(loadCustomHats());

    // Listen for storage changes to update custom hats
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "custom-hats") {
        setCustomHats(loadCustomHats());
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
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
  const renderHat = (hatType: string) => {
    // URL-based hat (server-hosted, shareable!) - this is how other users see custom hats
    if (isUrlHat(hatType)) {
      const url = getUrlHatUrl(hatType);
      return (
        <img
          src={url}
          alt="Custom hat"
          style={{
            width: 40,
            height: 40,
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
              width: 40,
              height: 40,
              objectFit: "contain",
            }}
          />
        );
      }
    }

    // Built-in hat - use SVG
    const hatData = HATS[hatType as HatType];
    return hatData?.svg || HATS.tophat.svg;
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
      {allHats.map((pos) => (
        <div
          key={pos.id}
          style={{
            position: "absolute",
            left: pos.x,
            top: pos.y - (pos.isCurrentUser ? 0 : 40),
            transform: "translateX(-50%)",
            width: 32,
            height: 32,
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            transition: pos.isCurrentUser
              ? "none"
              : "left 0.05s linear, top 0.05s linear",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {renderHat(pos.hatType)}
        </div>
      ))}
    </div>,
    document.body
  );
}
