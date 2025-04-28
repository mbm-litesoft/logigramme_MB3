"use client";
import { useState, useRef, useEffect } from "react";
import "./globals.css";
import MainLogigramme from "../components/MainLogigramme.jsx";

export default function Home() {
  const [tool, setTool] = useState({ tool: 0 });
  const [uuid, setUuid] = useState("");

  // References to diagram data
  const [elements, setElements] = useState([]);
  const [lines, setLines] = useState([]);

  // State to manage loading
  const [isLoading, setIsLoading] = useState(true);
  const [isComponentMounted, setIsComponentMounted] = useState(false);

  // Reference to access child component methods
  const logigrammeRef = useRef(null);

  // Effect for initial loading
  useEffect(() => {
    // Set component as mounted
    setIsComponentMounted(true);

    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // 1.5 seconds of loading

    return () => clearTimeout(timer);
  }, []);

  // Callback function to receive UUID from child component
  const handleUuidChange = (newUuid) => {
    console.log("UUID received from child component:", newUuid);
    setUuid(newUuid);
  };

  // Callback function to receive element and line updates
  const handleDataChange = (newElements, newLines) => {
    // Only update if component is mounted to prevent render-time updates
    if (isComponentMounted) {
      setElements(newElements);
      setLines(newLines);
    }
  };

  // Function to save diagram to JSON
  const saveToJson = () => {
    // Create an object containing both elements and lines
    const saveData = {
      elements: elements,
      lines: lines,
    };
    console.log(elements, "elements");

    // Convert to JSON string
    const jsonString = JSON.stringify(saveData);

    // Create a Blob with JSON content
    const blob = new Blob([jsonString], { type: "application/json" });

    // Create a download link
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "logigramme.json";

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Function to import a JSON file
  const importJsonFile = (file) => {
    if (!file) return;

    // Show loading during import
    setIsLoading(true);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        // Parse JSON content
        const parsedData = JSON.parse(event.target.result);
        console.log(parsedData.elements, "parsedData");

        // Update local state
        setElements(parsedData.elements || []);
        setLines(parsedData.lines || []);

        // Update child component data if reference available
        if (logigrammeRef.current && logigrammeRef.current.updateData) {
          logigrammeRef.current.updateData(
            parsedData.elements,
            parsedData.lines
          );
        }

        console.log("File imported successfully");

        // Hide loading when done
        setTimeout(() => setIsLoading(false), 500);
      } catch (error) {
        console.error("JSON parsing error:", error);
        setIsLoading(false);
      }
    };

    // Read file as text
    reader.readAsText(file);
  };

  return (
    <div
      className="container-fluid position-relative"
      id="exm"
      onMouseOver={() => {
        console.log(
          document.getElementById("exm").getBoundingClientRect().height,
          "exm"
        );
      }}
    >
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

      <div className="row">
        <div className="mainMenu col-5 p-0 row position-absolute">
          <div className="d-flex text-light menu">
            <div
              className={tool.tool == 0 ? "bg-info" : ""}
              onClick={() => setTool({ tool: 0 })}
            >
              <img src="icons/cursor.png" alt="Cursor" />
            </div>

            <div
              className={tool.tool == 1 ? "bg-info " : ""}
              onClick={() => setTool({ tool: 1 })}
            >
              <img src="icons/rectangle.png" alt="Rectangle" />
            </div>
            <div
              className={tool.tool == 2 ? "bg-info" : ""}
              onClick={() => setTool({ tool: 2 })}
            >
              <img src="icons/circle.png" alt="Circle" />
            </div>
            <div
              className={tool.tool == 3 ? "bg-info" : ""}
              onClick={() => setTool({ tool: 3 })}
            >
              <img src="icons/losange.png" alt="Diamond" />
            </div>
            <div
              className={tool.tool == 4 ? "bg-info" : ""}
              onClick={() => setTool({ tool: 4 })}
            >
              <img src="icons/rhomboide.png" alt="Parallelogram" />
            </div>
            <div
              className={tool.tool == 5 ? "bg-info " : ""}
              onClick={() => setTool({ tool: 5 })}
            >
              <img src="icons/note.png" alt="Note" />
            </div>

            <div
              className={tool.tool == 6 ? "bg-info " : ""}
              onClick={() => setTool({ tool: 6 })}
            >
              <img src="icons/arrow.png" alt="Arrow" />
            </div>
            <div
              className={tool.tool == 7 ? "bg-info" : ""}
              onClick={() => setTool({ tool: 7 })}
            >
              <img src="icons/dotted-arrow.png" alt="Dotted Arrow" />
            </div>
            <div
              className={tool.tool == 8 ? "bg-info dotsMenu" : "dotsMenu"}
              onClick={() => setTool({ tool: 8 })}
            >
              ••••
            </div>

            {/* Save and import buttons */}
            <div className="ms-auto d-flex me-2" onClick={saveToJson}>
              <span
                className="material-symbols-outlined text-dark"
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
                  className="material-symbols-outlined text-dark"
                  style={{ cursor: "pointer" }}
                >
                  importer
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
            />
          )}
        </div>
      </div>
    </div>
  );
}
