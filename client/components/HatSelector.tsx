import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  HATS,
  HatType,
  CustomHatData,
  isCustomHat,
  isUrlHat,
  getCustomHatId,
  getUrlHatUrl,
  makeCustomHatType,
  makeUrlHatType,
} from "./Hats";
import { HatGenerator } from "./HatGenerator";
import { getLocalStorageItem, setLocalStorageItem } from "../localStorage";
import "./HatSelector.css";

// Default hat size (doubled from original 32px)
const DEFAULT_HAT_SIZE = 64;
const MIN_HAT_SIZE = 24;
const MAX_HAT_SIZE = 128;

interface HatSelectorProps {
  selectedHat: string; // Can be HatType or custom hat type string
  onSelectHat: (hat: string) => void;
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

// Save custom hats to localStorage
function saveCustomHats(hats: CustomHatData[]): void {
  try {
    setLocalStorageItem("custom-hats", JSON.stringify(hats));
  } catch (error) {
    console.warn("Failed to save custom hats:", error);
  }
}

// Load hat size from localStorage
function loadHatSize(): number {
  try {
    const stored = getLocalStorageItem("user-hat-size");
    if (stored) {
      const size = parseInt(stored, 10);
      if (!isNaN(size) && size >= MIN_HAT_SIZE && size <= MAX_HAT_SIZE) {
        return size;
      }
    }
  } catch (error) {
    console.warn("Failed to load hat size:", error);
  }
  return DEFAULT_HAT_SIZE;
}

// Save hat size to localStorage
function saveHatSize(size: number): void {
  try {
    setLocalStorageItem("user-hat-size", String(size));
  } catch (error) {
    console.warn("Failed to save hat size:", error);
  }
}

export function HatSelector({ selectedHat, onSelectHat }: HatSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [customHats, setCustomHats] = useState<CustomHatData[]>([]);
  const [hatSize, setHatSize] = useState(DEFAULT_HAT_SIZE);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load custom hats and size on mount
  useEffect(() => {
    setCustomHats(loadCustomHats());
    setHatSize(loadHatSize());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hatKeys = Object.keys(HATS) as HatType[];

  // Handle size change
  const handleSizeChange = (newSize: number) => {
    setHatSize(newSize);
    saveHatSize(newSize);
    // Dispatch a custom event so CursorHatsOverlay can update
    window.dispatchEvent(
      new CustomEvent("hat-size-changed", { detail: newSize })
    );
  };

  // Handle new hat generated
  const handleHatGenerated = (
    hatDataUrl: string,
    hatName: string,
    serverUrl: string | null
  ) => {
    const newHat: CustomHatData = {
      id: `hat-${Date.now()}`,
      name: hatName,
      // Store the server URL if available (for local display), fallback to data URL
      imageUrl: serverUrl || hatDataUrl,
    };

    const updatedHats = [...customHats, newHat];
    setCustomHats(updatedHats);
    saveCustomHats(updatedHats);

    // If we have a server URL, use the URL hat type (shareable with others!)
    // Otherwise fall back to local custom hat type
    if (serverUrl) {
      onSelectHat(makeUrlHatType(serverUrl));
    } else {
      onSelectHat(makeCustomHatType(newHat.id));
    }
  };

  // Handle deleting a custom hat
  const handleDeleteCustomHat = (hatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHats = customHats.filter((h) => h.id !== hatId);
    setCustomHats(updatedHats);
    saveCustomHats(updatedHats);

    // If the deleted hat was selected, switch to default
    if (selectedHat === makeCustomHatType(hatId)) {
      onSelectHat("tophat");
    }
  };

  // Get display info for currently selected hat
  const getSelectedHatDisplay = () => {
    // URL-based hat (server-hosted, shareable)
    if (isUrlHat(selectedHat)) {
      const url = getUrlHatUrl(selectedHat);
      // Try to find matching custom hat for the name
      const matchingHat = customHats.find((h) => h.imageUrl === url);
      return {
        svg: null,
        imageUrl: url,
        name: matchingHat?.name || "Custom Hat",
      };
    }
    // Local custom hat (stored in localStorage)
    if (isCustomHat(selectedHat)) {
      const customHatId = getCustomHatId(selectedHat);
      const customHat = customHats.find((h) => h.id === customHatId);
      if (customHat) {
        return {
          svg: null,
          imageUrl: customHat.imageUrl,
          name: customHat.name,
        };
      }
    }
    // Built-in hat
    const hat = HATS[selectedHat as HatType];
    return {
      svg: hat?.svg || null,
      imageUrl: null,
      name: hat?.name || "Hat",
    };
  };

  const selectedDisplay = getSelectedHatDisplay();

  return (
    <>
      {createPortal(
        <div
          className="hat-selector"
          ref={dropdownRef}
          style={{
            position: "fixed",
            bottom: "80px",
            right: "16px",
            zIndex: 99999,
            background: "white",
            padding: "8px 12px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid #e5e5e5",
          }}
        >
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Select your hat"
            aria-expanded={isOpen}
          >
            {selectedDisplay.imageUrl ? (
              <img
                src={selectedDisplay.imageUrl}
                alt={selectedDisplay.name}
                style={{ width: 28, height: 28, objectFit: "contain" }}
              />
            ) : (
              <span
                style={{
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selectedDisplay.svg}
              </span>
            )}
            <span>{selectedDisplay.name}</span>
            <span style={{ fontSize: "10px" }}>{isOpen ? "▼" : "▲"}</span>
          </button>

          {isOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                right: 0,
                background: "white",
                border: "1px solid #e5e5e5",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                minWidth: "220px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: "11px",
                  color: "#888",
                  borderBottom: "1px solid #eee",
                }}
              >
                Choose your hat
              </div>

              {/* Built-in hats */}
              {hatKeys.map((hatKey) => (
                <button
                  key={hatKey}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 12px",
                    background: selectedHat === hatKey ? "#fff8e6" : "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onClick={() => {
                    onSelectHat(hatKey);
                    setIsOpen(false);
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {HATS[hatKey].svg}
                  </span>
                  <span style={{ flex: 1, fontSize: "14px" }}>
                    {HATS[hatKey].name}
                  </span>
                  {selectedHat === hatKey && (
                    <span style={{ color: "#f59e0b" }}>✓</span>
                  )}
                </button>
              ))}

              {/* Custom hats section */}
              {customHats.length > 0 && (
                <>
                  <div
                    style={{
                      padding: "8px 12px",
                      fontSize: "11px",
                      color: "#888",
                      borderTop: "1px solid #eee",
                      borderBottom: "1px solid #eee",
                      marginTop: "4px",
                    }}
                  >
                    Your custom hats
                  </div>
                  {customHats.map((customHat) => {
                    const customHatType = makeCustomHatType(customHat.id);
                    return (
                      <button
                        key={customHat.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "8px 12px",
                          background:
                            selectedHat === customHatType ? "#fff8e6" : "none",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        onClick={() => {
                          onSelectHat(customHatType);
                          setIsOpen(false);
                        }}
                      >
                        <img
                          src={customHat.imageUrl}
                          alt={customHat.name}
                          style={{
                            width: 28,
                            height: 28,
                            objectFit: "contain",
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            fontSize: "14px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {customHat.name}
                        </span>
                        {selectedHat === customHatType && (
                          <span style={{ color: "#f59e0b" }}>✓</span>
                        )}
                        <button
                          onClick={(e) =>
                            handleDeleteCustomHat(customHat.id, e)
                          }
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#999",
                            fontSize: "14px",
                            padding: "2px 4px",
                            borderRadius: "4px",
                          }}
                          title="Delete hat"
                        >
                          ×
                        </button>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Hat size slider */}
              <div
                style={{
                  padding: "10px 12px",
                  borderTop: "1px solid #eee",
                  marginTop: "4px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#888" }}>
                    Hat Size
                  </span>
                  <span
                    style={{ fontSize: "11px", color: "#666", fontWeight: 500 }}
                  >
                    {hatSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_HAT_SIZE}
                  max={MAX_HAT_SIZE}
                  value={hatSize}
                  onChange={(e) =>
                    handleSizeChange(parseInt(e.target.value, 10))
                  }
                  className="hat-size-slider"
                  style={{
                    background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${
                      ((hatSize - MIN_HAT_SIZE) /
                        (MAX_HAT_SIZE - MIN_HAT_SIZE)) *
                      100
                    }%, #e5e5e5 ${
                      ((hatSize - MIN_HAT_SIZE) /
                        (MAX_HAT_SIZE - MIN_HAT_SIZE)) *
                      100
                    }%, #e5e5e5 100%)`,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "9px",
                    color: "#aaa",
                    marginTop: "4px",
                  }}
                >
                  <span>small</span>
                  <span>large</span>
                </div>
              </div>

              {/* Create new hat button */}
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "10px 12px",
                  background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                  border: "none",
                  borderTop: "1px solid #eee",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onClick={() => {
                  setIsOpen(false);
                  setIsGeneratorOpen(true);
                }}
              >
                <span style={{ fontSize: "20px" }}>✨</span>
                <span style={{ flex: 1, fontSize: "14px", fontWeight: 500 }}>
                  Create Custom Hat
                </span>
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      <HatGenerator
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onHatGenerated={handleHatGenerated}
      />
    </>
  );
}
