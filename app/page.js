"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import "./globals.css";
import MainLogigramme from "../components/MainLogigramme.jsx";
import { PopoverPicker } from "../components/PopoverPicker";

export default function Home() {
  // États principaux
  const [tool, setTool] = useState({ tool: 0 });
  const [uuid, setUuid] = useState("");
  const [color, setColor] = useState("#ffffff");
  const [menuVisible, setMenuVisible] = useState(false);
  const [elements, setElements] = useState([]);
  const [lines, setLines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComponentMounted, setIsComponentMounted] = useState(false);
  const [nzoom, setNzoom] = useState("100%");

  // Refs
  const logigrammeRef = useRef(null);
  const elementsRef = useRef(elements);
  const linesRef = useRef(lines);

  // Mise à jour des refs
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  // Initialisation
  useEffect(() => {
    setIsComponentMounted(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Gestion visibilité menu
  useEffect(() => {
    setMenuVisible(!!uuid && tool.tool === 0);

    if (uuid && elements.length > 0) {
      const selectedElement = elements.find((el) => el.id === uuid);
      if (selectedElement && selectedElement.bgColor !== color) {
        setColor(selectedElement.bgColor || "#ffffff");
      }
    }
  }, [uuid, tool.tool]);

  // Callbacks vers enfant
  const handleUuidChange = useCallback((newUuid) => {
    setUuid(newUuid);
  }, []);

  const handleDataChange = useCallback(
    (newElements, newLines) => {
      if (isComponentMounted) {
        if (newElements !== elementsRef.current) {
          setElements(newElements);
        }
        if (newLines !== linesRef.current) {
          setLines(newLines);
        }
      }
    },
    [isComponentMounted]
  );

  // Fonctions d'édition d'éléments
  const updateElement = useCallback(
    (updates) => {
      if (!uuid) return;

      const updatedElements = elements.map((element) => {
        if (element.id === uuid) {
          return { ...element, ...updates };
        }
        return element;
      });

      setElements(updatedElements);

      if (logigrammeRef.current?.updateData) {
        logigrammeRef.current.updateData(updatedElements, lines);
      }
    },
    [uuid, elements, lines]
  );

  const changeShapeColor = useCallback(
    (newColor) => {
      updateElement({ bgColor: newColor });
    },
    [updateElement]
  );

  const changeBorderColor = useCallback(
    (newColor) => {
      updateElement({ borderColor: newColor });
    },
    [updateElement]
  );

  const changeTextColor = useCallback(
    (newColor) => {
      updateElement({ textColor: newColor });
    },
    [updateElement]
  );

  const changeTextAlign = useCallback(
    (alignment) => {
      updateElement({ textAlign: alignment });
    },
    [updateElement]
  );

  const changeTextVerticalAlign = useCallback(
    (alignment) => {
      updateElement({ textVerticalAlign: alignment });
    },
    [updateElement]
  );

  const changeOpacity = useCallback(
    (newOpacity) => {
      updateElement({ opacity: newOpacity });
    },
    [updateElement]
  );

  // Gestion du texte
  const manageInput = useCallback(() => {
    if (!uuid || !logigrammeRef.current) return;

    setTool({ tool: -1 });

    setTimeout(() => {
      const el = document.getElementById("input" + uuid);
      if (el) {
        el.style.display = "flex";
        el.style.zIndex = "3";
        el.focus();
      }
    }, 10);
  }, [uuid]);

  // Suppression d'élément
  const deleteElement = useCallback(() => {
    if (!uuid) return;

    const updatedElements = elements.filter((element) => element.id !== uuid);
    const updatedLines = lines.filter(
      (line) => line.source !== uuid && line.target !== uuid
    );

    setElements(updatedElements);
    setLines(updatedLines);
    setUuid("");

    if (logigrammeRef.current?.updateData) {
      logigrammeRef.current.updateData(updatedElements, updatedLines);
    }
  }, [uuid, elements, lines]);

  // Gestion du zoom
  const zoomFunc = useCallback((action) => {
    const container = document.querySelector(".openDiv");
    if (!container) return;

    let newZoomValue;

    switch (action) {
      case 0:
        newZoomValue = parseInt(container.style.zoom || "100") + 5;
        break;
      case 1:
        newZoomValue = parseInt(container.style.zoom || "100") - 5;
        break;
      default:
        newZoomValue = 100;
    }

    newZoomValue = Math.max(10, Math.min(200, newZoomValue));
    container.style.zoom = newZoomValue + "%";
    setNzoom(newZoomValue + "%");

    if (logigrammeRef.current?.createDotPattern) {
      setTimeout(() => {
        logigrammeRef.current.createDotPattern();
      }, 100);
    }
  }, []);

  // Sauvegarde et import
  const saveToJson = useCallback(() => {
    const saveData = { elements, lines };
    const jsonString = JSON.stringify(saveData);
    const blob = new Blob([jsonString], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "logigramme.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [elements, lines]);

  const importJsonFile = useCallback((file) => {
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);

        setElements(parsedData.elements || []);
        setLines(parsedData.lines || []);

        if (logigrammeRef.current?.updateData) {
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
  }, []);

  // Composants
  const ZoomControls = () => (
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

  const ColorPicker = ({ value, onChange, label }) => (
    <div className="d-flex flex-column align-items-center mx-1">
      <PopoverPicker color={value} onChange={onChange} />
      <small style={{ fontSize: "10px", color: "#888" }}>{label}</small>
    </div>
  );

  const AlignmentButtons = ({ type, onChange }) => {
    const buttons =
      type === "text"
        ? [
            { value: "left", icon: "⟨", title: "Aligner à gauche" },
            { value: "center", icon: "≡", title: "Centrer" },
            { value: "right", icon: "⟩", title: "Aligner à droite" },
          ]
        : [
            { value: "top", icon: "⌃", title: "Aligner en haut" },
            { value: "middle", icon: "⚬", title: "Centrer verticalement" },
            { value: "bottom", icon: "⌄", title: "Aligner en bas" },
          ];

    return (
      <div className="d-flex flex-column align-items-center mx-1">
        <div className="d-flex">
          {buttons.map(({ value, icon, title }) => (
            <button
              key={value}
              className="btn btn-sm btn-light p-1 mx-1"
              onClick={() => onChange(value)}
              title={title}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const ToolButton = ({ toolId, activeIcon, inactiveIcon, alt }) => (
    <div onClick={() => setTool({ tool: toolId })}>
      <img src={tool.tool === toolId ? activeIcon : inactiveIcon} alt={alt} />
    </div>
  );

  const selectedElement = elements.find((el) => el.id === uuid);

  return (
    <div className="container-fluid position-relative" id="exm">
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

      <div
        className={`mainMenu2 p-0 row position-absolute ${
          menuVisible ? "visible" : "invisible"
        }`}
      >
        <div className="d-flex text-light menu">
          <ColorPicker
            value={color}
            onChange={(newColor) => {
              setColor(newColor);
              changeShapeColor(newColor);
            }}
            label="Fond"
          />

          <ColorPicker
            value={selectedElement?.borderColor || "#808080"}
            onChange={changeBorderColor}
            label="Bordure"
          />

          <div className="d-flex flex-column align-items-center mx-1">
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={selectedElement?.opacity || 1}
              onChange={(e) => changeOpacity(parseFloat(e.target.value))}
              className="form-range"
              style={{ width: "50px" }}
            />
            <small style={{ fontSize: "10px", color: "#888" }}>Opacité</small>
          </div>

          <span className="line"></span>

          <img
            src="/icons/addTextIcon.png"
            onClick={manageInput}
            alt="Text"
            style={{ cursor: "pointer", opacity: menuVisible ? 1 : 0.5 }}
          />

          <ColorPicker
            value={selectedElement?.textColor || "#000000"}
            onChange={changeTextColor}
            label="Texte"
          />

          <AlignmentButtons type="text" onChange={changeTextAlign} />
          <AlignmentButtons
            type="vertical"
            onChange={changeTextVerticalAlign}
          />

          <span className="line"></span>

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
          <div className="d-flex text-light menu">
            <ToolButton
              toolId={0}
              activeIcon="icons/cursor_active.png"
              inactiveIcon="icons/cursor.png"
              alt="Cursor"
            />
            <ToolButton
              toolId={1}
              activeIcon="icons/rectangle_active.png"
              inactiveIcon="icons/rectangle.png"
              alt="Rectangle"
            />
            <ToolButton
              toolId={2}
              activeIcon="icons/circle_active.png"
              inactiveIcon="icons/circle.png"
              alt="Circle"
            />
            <ToolButton
              toolId={3}
              activeIcon="icons/losange_active.png"
              inactiveIcon="icons/losange.png"
              alt="Diamond"
            />
            <ToolButton
              toolId={4}
              activeIcon="icons/rhomboide_active.png"
              inactiveIcon="icons/rhomboide.png"
              alt="Parallelogram"
            />
            <ToolButton
              toolId={5}
              activeIcon="icons/note_active.png"
              inactiveIcon="icons/note.png"
              alt="Note"
            />
            <ToolButton
              toolId={6}
              activeIcon="icons/arrow_active.png"
              inactiveIcon="icons/arrow.png"
              alt="Arrow"
            />
            <ToolButton
              toolId={7}
              activeIcon="icons/dotted_arrow_active.png"
              inactiveIcon="icons/dotted_arrow.png"
              alt="Dotted Arrow"
            />
            <ToolButton
              toolId={8}
              activeIcon="icons/dots_active.png"
              inactiveIcon="icons/dots.png"
              alt="Dots"
            />

            <div className="me-5 pe-5">{!isLoading && <ZoomControls />}</div>

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
                  e.target.files?.[0] && importJsonFile(e.target.files[0])
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
            const textInputs = document.querySelectorAll(".shape-input");
            textInputs.forEach((element) => {
              element.style.zIndex = "1";
            });
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
