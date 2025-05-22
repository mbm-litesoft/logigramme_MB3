"use client";
import { useState, useRef, useEffect } from "react";
import "./globals.css";
import MainLogigramme from "../components/MainLogigramme.jsx";
import { PopoverPicker } from "../components/PopoverPicker";

export default function Home() {
  const [tool, setTool] = useState({ tool: 0 });
  const [uuid, setUuid] = useState("");
  const [color, setColor] = useState("#ffffff");
  const [menuVisible, setMenuVisible] = useState(false);

  // References to diagram data
  const [elements, setElements] = useState([]);
  const [lines, setLines] = useState([]);

  // State to manage loading
  const [isLoading, setIsLoading] = useState(true);
  const [isComponentMounted, setIsComponentMounted] = useState(false);

  // State for zoom
  const [nzoom, setNzoom] = useState("100%");

  // Reference to access child component methods
  const logigrammeRef = useRef(null);

  // Effect for initial loading
  useEffect(() => {
    setIsComponentMounted(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Effect to update menu visibility when an element is selected
  useEffect(() => {
    // Show menu only when an element is selected (uuid is not empty)

    setMenuVisible(!!uuid && tool.tool == 0);

    // Update color from selected element if available
    if (uuid && elements.length > 0) {
      const selectedElement = elements.find((el) => el.id === uuid);
      if (selectedElement) {
        setColor(selectedElement.bgColor || "#ffffff");
      }
    }
  }, [uuid, elements, tool]);

  // Callback function to receive UUID from child component
  const handleUuidChange = (newUuid) => {
    setUuid(newUuid);
  };

  // Callback function to receive element and line updates
  const handleDataChange = (newElements, newLines) => {
    if (isComponentMounted) {
      setElements(newElements);
      setLines(newLines);
    }
  };

  // Function to manage text input for selected element
  const manageInput = () => {
    if (!uuid || !logigrammeRef.current) return;

    // Set tool to text edit mode (-1)
    const newTool = { tool: -1 };
    setTool(newTool);

    // Call the child component's internal method through ref
    setTimeout(() => {
      if (logigrammeRef.current) {
        // Focus the text input of the selected element
        const el = document.getElementById("input" + uuid);
        if (el) {
          el.style.display = "flex";
          el.style.zIndex = "3";
          el.focus();
        }
      }
    }, 10);
  };

  // Function to change color of selected element
  const changeShapeColor = (newColor) => {
    if (!uuid || !logigrammeRef.current) return;

    // Update elements array
    const updatedElements = elements.map((element) => {
      if (element.id === uuid) {
        return {
          ...element,
          bgColor: newColor,
        };
      }
      return element;
    });

    // Update state and propagate to child
    setElements(updatedElements);

    // Update child component if ref exists
    if (logigrammeRef.current && logigrammeRef.current.updateData) {
      logigrammeRef.current.updateData(updatedElements, lines);
    }
  };

  // Function to delete selected element
  const deleteElement = () => {
    if (!uuid || !logigrammeRef.current) return;

    // Filter out the element with uuid
    const updatedElements = elements.filter((element) => element.id !== uuid);

    // Filter out any lines connected to this element
    const updatedLines = lines.filter(
      (line) => line.source !== uuid && line.target !== uuid
    );

    // Update state and propagate to child
    setElements(updatedElements);
    setLines(updatedLines);
    setUuid(""); // Clear selection

    // Update child component if ref exists
    if (logigrammeRef.current && logigrammeRef.current.updateData) {
      logigrammeRef.current.updateData(updatedElements, updatedLines);
    }
  };

  // Zoom function
  const zoomFunc = (action) => {
    if (!logigrammeRef.current) return;

    const container = document.querySelector(".openDiv");
    if (!container) return;

    let newZoomValue;

    if (action === 0) {
      newZoomValue = parseInt(container.style.zoom || "100") + 5;
    } else if (action === 1) {
      newZoomValue = parseInt(container.style.zoom || "100") - 5;
    } else {
      newZoomValue = 100;
    }

    newZoomValue = Math.max(10, Math.min(200, newZoomValue));
    container.style.zoom = newZoomValue + "%";
    setNzoom(newZoomValue + "%");

    if (logigrammeRef.current && logigrammeRef.current.createDotPattern) {
      setTimeout(() => {
        logigrammeRef.current.createDotPattern();
      }, 100);
    }
  };

  // Zoom Controls Component
  const ZoomControls = () => {
    return (
      <div className="zoom-controls">
        <button
          disabled={nzoom === "10%"}
          onClick={() => zoomFunc(1)}
          style={{
            width: "30px",
            height: "30px",
            border: "1px solid #ccc",
            borderRadius: "3px",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          -
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            minWidth: "50px",
            justifyContent: "center",
            fontSize: "14px",
          }}
        >
          {nzoom}
        </div>

        <button
          disabled={nzoom === "200%"}
          onClick={() => zoomFunc(0)}
          style={{
            width: "30px",
            height: "30px",
            border: "1px solid #ccc",
            borderRadius: "3px",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          +
        </button>

        <button
          onClick={() => zoomFunc(2)}
          style={{
            padding: "0 10px",
            height: "30px",
            border: "1px solid #ccc",
            borderRadius: "3px",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
    );
  };

  // Function to save diagram to JSON
  const saveToJson = () => {
    const saveData = {
      elements: elements,
      lines: lines,
    };

    const jsonString = JSON.stringify(saveData);
    const blob = new Blob([jsonString], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "logigramme.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Function to import a JSON file
  const importJsonFile = (file) => {
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);

        setElements(parsedData.elements || []);
        setLines(parsedData.lines || []);

        if (logigrammeRef.current && logigrammeRef.current.updateData) {
          logigrammeRef.current.updateData(
            parsedData.elements,
            parsedData.lines
          );
        }

        setTimeout(() => setIsLoading(false), 500);
      } catch (error) {
        console.error("JSON parsing error:", error);
        setIsLoading(false);
      }
    };

    reader.readAsText(file);
  };

  // Fonction pour changer la couleur de la bordure
  const changeBorderColor = (newColor) => {
    if (!uuid) return;

    const updatedElements = elements.map((element) => {
      if (element.id === uuid) {
        return {
          ...element,
          borderColor: newColor,
        };
      }
      return element;
    });

    setElements(updatedElements);

    if (logigrammeRef.current && logigrammeRef.current.updateData) {
      logigrammeRef.current.updateData(updatedElements, lines);
    }
  };

  // Fonction pour changer la couleur du texte
  const changeTextColor = (newColor) => {
    if (!uuid) return;

    const updatedElements = elements.map((element) => {
      if (element.id === uuid) {
        return {
          ...element,
          textColor: newColor,
        };
      }
      return element;
    });

    setElements(updatedElements);

    if (logigrammeRef.current && logigrammeRef.current.updateData) {
      logigrammeRef.current.updateData(updatedElements, lines);
    }
  };

  // Fonction pour changer l'alignement du texte
  const changeTextAlign = (alignment) => {
    if (!uuid) return;

    const updatedElements = elements.map((element) => {
      if (element.id === uuid) {
        return {
          ...element,
          textAlign: alignment,
        };
      }
      return element;
    });

    setElements(updatedElements);

    if (logigrammeRef.current && logigrammeRef.current.updateData) {
      logigrammeRef.current.updateData(updatedElements, lines);
    }
  };

  // Fonction pour changer l'alignement vertical du texte
  const changeTextVerticalAlign = (alignment) => {
    if (!uuid) return;

    const updatedElements = elements.map((element) => {
      if (element.id === uuid) {
        return {
          ...element,
          textVerticalAlign: alignment,
        };
      }
      return element;
    });

    setElements(updatedElements);

    if (logigrammeRef.current && logigrammeRef.current.updateData) {
      logigrammeRef.current.updateData(updatedElements, lines);
    }
  };

  // Fonction pour changer l'opacité
  const changeOpacity = (newOpacity) => {
    if (!uuid) return;

    const updatedElements = elements.map((element) => {
      if (element.id === uuid) {
        return {
          ...element,
          opacity: newOpacity,
        };
      }
      return element;
    });

    setElements(updatedElements);

    if (logigrammeRef.current && logigrammeRef.current.updateData) {
      logigrammeRef.current.updateData(updatedElements, lines);
    }
  };

  return (
    <div className="container-fluid position-relative" id="exm">
      {/* Loading screen */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner-container">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading diagram...</p>
          </div>
        </div>
      )}

      {/* Element editing menu - Always present but only visible when an element is selected */}

      <div
        className={`mainMenu2 p-0 row position-absolute ${
          menuVisible ? "visible" : "invisible"
        }`}
      >
        <div className="d-flex text-light menu">
          {/* Fond Color */}
          <div className="d-flex flex-column align-items-center mx-1">
            <PopoverPicker
              color={color}
              onChange={(newColor) => {
                setColor(newColor);
                changeShapeColor(newColor);
              }}
            />
            <small style={{ fontSize: "10px", color: "#888" }}>Fond</small>
          </div>

          {/* Border Color */}
          <div className="d-flex flex-column align-items-center mx-1 ">
            <PopoverPicker
              color={
                elements.find((el) => el.id === uuid)?.borderColor || "#808080"
              }
              onChange={(newColor) => changeBorderColor(newColor)}
            />
            <small style={{ fontSize: "10px", color: "#888" }}>Bordure</small>
          </div>

          {/* Opacity Slider */}
          <div className="d-flex flex-column align-items-center mx-1">
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={elements.find((el) => el.id === uuid)?.opacity || 1}
              onChange={(e) => changeOpacity(parseFloat(e.target.value))}
              className="form-range"
              style={{ width: "50px" }}
            />
            <small style={{ fontSize: "10px", color: "#888" }}>Opacité</small>
          </div>
          <span className="line"></span>
          {/* Text Button */}
          <img
            src="/icons/addTextIcon.png"
            onClick={manageInput}
            alt="Text"
            style={{ cursor: "pointer", opacity: menuVisible ? 1 : 0.5 }}
          />
          {/* Text Color */}
          <div className="d-flex flex-column align-items-center mx-1">
            <PopoverPicker
              color={
                elements.find((el) => el.id === uuid)?.textColor || "#000000"
              }
              onChange={(newColor) => changeTextColor(newColor)}
            />
            <small style={{ fontSize: "10px", color: "#888" }}>Texte</small>
          </div>

          {/* Text Alignment */}
          <div className="d-flex flex-column align-items-center mx-1">
            <div className="d-flex">
              <button
                className="btn btn-sm btn-light p-1 mx-1"
                onClick={() => changeTextAlign("left")}
                title="Aligner à gauche"
              >
                ⟨
              </button>
              <button
                className="btn btn-sm btn-light p-1 mx-1"
                onClick={() => changeTextAlign("center")}
                title="Centrer"
              >
                ≡
              </button>
              <button
                className="btn btn-sm btn-light p-1 mx-1"
                onClick={() => changeTextAlign("right")}
                title="Aligner à droite"
              >
                ⟩
              </button>
            </div>
          </div>

          {/* Vertical Alignment */}
          <div className="d-flex flex-column align-items-center mx-1">
            <div className="d-flex">
              <button
                className="btn btn-sm btn-light p-1 mx-1"
                onClick={() => changeTextVerticalAlign("top")}
                title="Aligner en haut"
              >
                ⌃
              </button>
              <button
                className="btn btn-sm btn-light p-1 mx-1"
                onClick={() => changeTextVerticalAlign("middle")}
                title="Centrer verticalement"
              >
                ⚬
              </button>
              <button
                className="btn btn-sm btn-light p-1 mx-1"
                onClick={() => changeTextVerticalAlign("bottom")}
                title="Aligner en bas"
              >
                ⌄
              </button>
            </div>
          </div>
          <span className="line"></span>
          {/* Delete Button */}
          <img
            onClick={deleteElement}
            src="/icons/trash.png"
            alt="Delete"
            style={{ cursor: "pointer", opacity: menuVisible ? 1 : 0.5 }}
          />
        </div>
      </div>

      <div className="row">
        <div className="mainMenu col-7 p-0 row position-absolute">
          <div className="d-flex text-light menu ">
            <div onClick={() => setTool({ tool: 0 })}>
              <img
                src={
                  tool.tool == 0
                    ? "icons/cursor_active.png"
                    : "icons/cursor.png"
                }
                alt="Cursor"
              />
            </div>

            <div onClick={() => setTool({ tool: 1 })}>
              <img
                src={
                  tool.tool == 1
                    ? "icons/rectangle_active.png"
                    : "icons/rectangle.png"
                }
                alt="Rectangle"
              />
            </div>
            <div onClick={() => setTool({ tool: 2 })}>
              <img
                src={
                  tool.tool == 2
                    ? "icons/circle_active.png"
                    : "icons/circle.png"
                }
                alt="Circle"
              />
            </div>
            <div onClick={() => setTool({ tool: 3 })}>
              <img
                src={
                  tool.tool == 3
                    ? "icons/losange_active.png"
                    : "icons/losange.png"
                }
                alt="Diamond"
              />
            </div>
            <div onClick={() => setTool({ tool: 4 })}>
              <img
                src={
                  tool.tool == 4
                    ? "icons/rhomboide_active.png"
                    : "icons/rhomboide.png"
                }
                alt="Parallelogram"
              />
            </div>
            <div onClick={() => setTool({ tool: 5 })}>
              <img
                src={
                  tool.tool == 5 ? "icons/note_active.png" : "icons/note.png"
                }
                alt="Note"
              />
            </div>

            <div onClick={() => setTool({ tool: 6 })}>
              <img
                src={
                  tool.tool == 6 ? "icons/arrow_active.png" : "icons/arrow.png"
                }
                alt="Arrow"
              />
            </div>
            <div onClick={() => setTool({ tool: 7 })}>
              <img
                src={
                  tool.tool == 7
                    ? "icons/dotted_arrow_active.png"
                    : "icons/dotted_arrow.png"
                }
                alt="Dotted Arrow"
              />
            </div>
            <div onClick={() => setTool({ tool: 8 })}>
              <img
                src={
                  tool.tool == 8 ? "icons/dots_active.png" : "icons/dots.png"
                }
                alt="Dots"
              />
            </div>
            {/* Zoom Controls */}
            <div className="me-5 pe-5">{!isLoading && <ZoomControls />}</div>
            {/* Save and import buttons */}
            <div className="ms-auto d-flex me-2" onClick={saveToJson}>
              <span
                className="material-symbols-outlined pictoColorGray"
                style={{ cursor: "pointer" }}
              >
                Sauver
              </span>
            </div>
            <div className="custom-file-input">
              <input
                type="file"
                id="fileInput"
                onChange={(e) =>
                  e.target.files && e.target.files[0]
                    ? importJsonFile(e.target.files[0])
                    : null
                }
                style={{ display: "none" }}
                accept=".json"
              />
              <label htmlFor="fileInput">
                <span
                  className="material-symbols-outlined pictoColorGray"
                  style={{ cursor: "pointer" }}
                >
                  Importer
                </span>
              </label>
            </div>
          </div>
        </div>
        <div
          onMouseDown={() => {
            const elements = document.querySelectorAll(".shape-input");
            if (elements.length !== 0) {
              elements.forEach((element) => {
                element.style.zIndex = "1";
              });
            }
          }}
        >
          {!isLoading && isComponentMounted && (
            <MainLogigramme
              ref={logigrammeRef}
              tool={tool}
              onUuidChange={handleUuidChange}
              onDataChange={handleDataChange}
              elements={elements}
              lines={lines}
              setElements={setElements}
              setLines={setLines}
              onLoadComplete={() => setIsLoading(false)}
              nzoom={nzoom}
            />
          )}
        </div>
      </div>
    </div>
  );
}
