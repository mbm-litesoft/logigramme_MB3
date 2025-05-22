"use client";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { v4 as uuidv4 } from "uuid";

const MainLogigramme = forwardRef(
  (
    {
      tool,
      onUuidChange,
      onDataChange,
      elements: propElements,
      lines: propLines,
      setElements: propSetElements,
      setLines: propSetLines,
      onLoadComplete,
      nzoom,
    },
    ref
  ) => {
    const [isDown, setMouseIsDown] = useState(false);
    const [style, setStyle] = useState({
      id: "",
      type: 0,
      width: 103,
      height: 103,
      bgColor: "white",
      borderColor: "gray",
      textColor: "black",
      textAlign: "center",
      textVerticalAlign: "middle",
      opacity: 1,
      x: 0,
      y: 0,
      radius: "15%",
      border: "1px solid gray",
      transform: "",
    });
    const [elements, setElements] = useState([]);
    const [lines, setLines] = useState([]);
    const [uuid, setUuid] = useState("");
    const [svgConnections, setSvgConnections] = useState([]);
    const [isInternallyLoaded, setIsInternallyLoaded] = useState(false);
    const isInitialRender = useRef(true);
    const initializationComplete = useRef(false);

    const [blockLeft, setBlockLeft] = useState(false);
    const [blockRight, setBlockRight] = useState(false);
    const [blockBottom, setBlockBottom] = useState(false);
    const [blockTop, setBlockTop] = useState(false);

    const [dotPosition, setDotPosition] = useState([0, 0]);
    const [color, setColor] = useState("#ffffff");
    const [connectingMode, setConnectingMode] = useState(false);
    const [sourceElement, setSourceElement] = useState(null);
    const [sourceDot, setSourceDot] = useState(null);
    const containerRef = useRef(null);

    const dotSelected = useRef(false);
    const defaultDimensions = useRef({ width: 103, height: 103 });
    const dotPatternCreationTimeout = useRef(null);
    const lastDotGridUpdate = useRef(0);

    const sourceElementRef = useRef(null);
    const sourceSideRef = useRef(null);
    const sourceDotRef = useRef(null);
const [deletingElements, setDeletingElements] = useState(new Set());
    // Taille du canvas
    const [canvasSize] = useState({
      width: 5000,
      height: 5000,
    });

    
    // Notification au parent quand le chargement est terminé
    useEffect(() => {
      if (isInternallyLoaded && !isInitialRender.current) {
        if (onLoadComplete) {
          onLoadComplete();
        }
      }
    }, [isInternallyLoaded, onLoadComplete]);

    // Initialisation du composant
    useEffect(() => {
      isInitialRender.current = false;

      let loadingTasks = 0;

      if (lines.length > 0) {
        loadingTasks++;
        setTimeout(() => {
          updateSvgConnections();
          loadingTasks--;
          if (loadingTasks === 0 && !initializationComplete.current) {
            setIsInternallyLoaded(true);
            initializationComplete.current = true;
          }
        }, 200);
      }

      loadingTasks++;
      setTimeout(() => {
        createDotPattern();
        loadingTasks--;
        if (loadingTasks === 0 && !initializationComplete.current) {
          setIsInternallyLoaded(true);
          initializationComplete.current = true;
        }
      }, 100);

      if (loadingTasks === 0 && !initializationComplete.current) {
        setIsInternallyLoaded(true);
        initializationComplete.current = true;
      }

      const fallbackTimer = setTimeout(() => {
        if (!initializationComplete.current) {
          setIsInternallyLoaded(true);
          initializationComplete.current = true;
        }
      }, 1000);

      return () => clearTimeout(fallbackTimer);
    }, []);

    useEffect(() => {
      if (uuid) {
        onUuidChange(uuid);
      }
    }, [uuid, onUuidChange]);

    useEffect(() => {
      if (lines.length > 0) {
        setTimeout(() => {
          updateSvgConnections();
        }, 200);
      }
    }, []);

    // Effet qui se déclenche quand la prop tool change
    useEffect(() => {
      if (tool.tool === 6 || tool.tool === 7 || tool.tool === 8) {
        setTimeout(() => {
          const shapes = document.querySelectorAll("[shape-type]");
          shapes.forEach((element) => {
            showConnectionPoints(element);
          });
          setConnectingMode(true);
          updateSvgConnections();
        }, 100);
      } else {
        const dots = document.querySelectorAll(".connection-dot");
        dots.forEach((dot) => {
          dot.style.display = "none";
        });
        setConnectingMode(false);
      }
    }, [tool]);

    useEffect(() => {
      if (lines.length > 0) {
        updateSvgConnections();
      }
    }, [elements, lines]);

    // Gestionnaire mouseup global amélioré
    useEffect(() => {
      const handleGlobalMouseUp = () => {
        if (isDown) {
          setMouseIsDown(false);
          if (window.svgUpdateTimeout) {
            clearTimeout(window.svgUpdateTimeout);
            window.svgUpdateTimeout = null;
          }
        }
      };

      document.addEventListener("mouseup", handleGlobalMouseUp);
      return () => {
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }, [isDown]);

 // Fonction pour mettre à jour les connexions SVG avec des lignes spécifiques
 const updateSvgConnectionsWithLines = useCallback((specificLines) => {
  try {
    if (!specificLines || specificLines.length === 0) {
      setSvgConnections([]);
      return;
    }

    const linesData = JSON.parse(JSON.stringify(specificLines));
    const containerRect = document
      .querySelector(".openDiv")
      ?.getBoundingClientRect();
    if (!containerRect) return;

    const newConnections = linesData
      .map((line) => {
        try {
          const sourceElement = document.getElementById(line.source);
          const targetElement = document.getElementById(line.target);

          if (!sourceElement || !targetElement) return null;

          const sourceRect = sourceElement.getBoundingClientRect();
          const targetRect = targetElement.getBoundingClientRect();

          const sourceShapeType = parseInt(
            sourceElement.getAttribute("shape-type")
          );
          const targetShapeType = parseInt(
            targetElement.getAttribute("shape-type")
          );

          let sourceX, sourceY, targetX, targetY;

          // Calcul du point source
          if (sourceShapeType === 3) {
            const sourceCenterX =
              sourceRect.left + sourceRect.width / 2 - containerRect.left;
            const sourceCenterY =
              sourceRect.top + sourceRect.height / 2 - containerRect.top;

            switch (line.sourceSide) {
              case "top-right":
                sourceX =
                  sourceCenterX +
                  Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                sourceY =
                  sourceCenterY -
                  Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                break;
              case "bottom-right":
                sourceX =
                  sourceCenterX +
                  Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                sourceY =
                  sourceCenterY +
                  Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                break;
              case "bottom-left":
                sourceX =
                  sourceCenterX -
                  Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                sourceY =
                  sourceCenterY +
                  Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                break;
              case "top-left":
                sourceX =
                  sourceCenterX -
                  Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                sourceY =
                  sourceCenterY -
                  Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                break;
              default:
                sourceX = sourceCenterX;
                sourceY = sourceCenterY;
            }
          } else {
            switch (line.sourceSide) {
              case "top":
                sourceX =
                  sourceRect.left +
                  sourceRect.width / 2 -
                  containerRect.left;
                sourceY = sourceRect.top - containerRect.top;
                break;
              case "right":
                sourceX = sourceRect.right - containerRect.left;
                sourceY =
                  sourceRect.top +
                  sourceRect.height / 2 -
                  containerRect.top;
                break;
              case "bottom":
                sourceX =
                  sourceRect.left +
                  sourceRect.width / 2 -
                  containerRect.left;
                sourceY = sourceRect.bottom - containerRect.top;
                break;
              case "left":
                sourceX = sourceRect.left - containerRect.left;
                sourceY =
                  sourceRect.top +
                  sourceRect.height / 2 -
                  containerRect.top;
                break;
              default:
                if (line.sourceSide && line.sourceSide.includes("top")) {
                  sourceY = sourceRect.top - containerRect.top;
                } else if (
                  line.sourceSide &&
                  line.sourceSide.includes("bottom")
                ) {
                  sourceY = sourceRect.bottom - containerRect.top;
                } else {
                  sourceY =
                    sourceRect.top +
                    sourceRect.height / 2 -
                    containerRect.top;
                }

                if (line.sourceSide && line.sourceSide.includes("left")) {
                  sourceX = sourceRect.left - containerRect.left;
                } else if (
                  line.sourceSide &&
                  line.sourceSide.includes("right")
                ) {
                  sourceX = sourceRect.right - containerRect.left;
                } else {
                  sourceX =
                    sourceRect.left +
                    sourceRect.width / 2 -
                    containerRect.left;
                }
            }
          }

          // Calcul du point cible
          if (targetShapeType === 3) {
            const targetCenterX =
              targetRect.left + targetRect.width / 2 - containerRect.left;
            const targetCenterY =
              targetRect.top + targetRect.height / 2 - containerRect.top;

            switch (line.targetSide) {
              case "top-right":
                targetX =
                  targetCenterX +
                  Math.cos(Math.PI / 4) * (targetRect.width / 2);
                targetY =
                  targetCenterY -
                  Math.sin(Math.PI / 4) * (targetRect.height / 2);
                break;
              case "bottom-right":
                targetX =
                  targetCenterX +
                  Math.cos(Math.PI / 4) * (targetRect.width / 2);
                targetY =
                  targetCenterY +
                  Math.sin(Math.PI / 4) * (targetRect.height / 2);
                break;
              case "bottom-left":
                targetX =
                  targetCenterX -
                  Math.cos(Math.PI / 4) * (targetRect.width / 2);
                targetY =
                  targetCenterY +
                  Math.sin(Math.PI / 4) * (targetRect.height / 2);
                break;
              case "top-left":
                targetX =
                  targetCenterX -
                  Math.cos(Math.PI / 4) * (targetRect.width / 2);
                targetY =
                  targetCenterY -
                  Math.sin(Math.PI / 4) * (targetRect.height / 2);
                break;
              default:
                targetX = targetCenterX;
                targetY = targetCenterY;
            }
          } else {
            switch (line.targetSide) {
              case "top":
                targetX =
                  targetRect.left +
                  targetRect.width / 2 -
                  containerRect.left;
                targetY = targetRect.top - containerRect.top;
                break;
              case "right":
                targetX = targetRect.right - containerRect.left;
                targetY =
                  targetRect.top +
                  targetRect.height / 2 -
                  containerRect.top;
                break;
              case "bottom":
                targetX =
                  targetRect.left +
                  targetRect.width / 2 -
                  containerRect.left;
                targetY = targetRect.bottom - containerRect.top;
                break;
              case "left":
                targetX = targetRect.left - containerRect.left;
                targetY =
                  targetRect.top +
                  targetRect.height / 2 -
                  containerRect.top;
                break;
              default:
                if (line.targetSide && line.targetSide.includes("top")) {
                  targetY = targetRect.top - containerRect.top;
                } else if (
                  line.targetSide &&
                  line.targetSide.includes("bottom")
                ) {
                  targetY = targetRect.bottom - containerRect.top;
                } else {
                  targetY =
                    targetRect.top +
                    targetRect.height / 2 -
                    containerRect.top;
                }

                if (line.targetSide && line.targetSide.includes("left")) {
                  targetX = targetRect.left - containerRect.left;
                } else if (
                  line.targetSide &&
                  line.targetSide.includes("right")
                ) {
                  targetX = targetRect.right - containerRect.left;
                } else {
                  targetX =
                    targetRect.left +
                    targetRect.width / 2 -
                    containerRect.left;
                }
            }
          }

          if (
            isNaN(sourceX) ||
            isNaN(sourceY) ||
            isNaN(targetX) ||
            isNaN(targetY)
          ) {
            return null;
          }

          const controlDistance =
            Math.min(
              Math.abs(targetX - sourceX),
              Math.abs(targetY - sourceY)
            ) /
              2 +
            50;

          let sourceControlX,
            sourceControlY,
            targetControlX,
            targetControlY;

          // Point de contrôle source
          switch (line.sourceSide) {
            case "top":
              sourceControlX = sourceX;
              sourceControlY = sourceY - controlDistance;
              break;
            case "right":
              sourceControlX = sourceX + controlDistance;
              sourceControlY = sourceY;
              break;
            case "bottom":
              sourceControlX = sourceX;
              sourceControlY = sourceY + controlDistance;
              break;
            case "left":
              sourceControlX = sourceX - controlDistance;
              sourceControlY = sourceY;
              break;
            default:
              if (line.sourceSide && line.sourceSide.includes("top")) {
                sourceControlY = sourceY - controlDistance / 2;
              } else {
                sourceControlY = sourceY + controlDistance / 2;
              }
              if (line.sourceSide && line.sourceSide.includes("right")) {
                sourceControlX = sourceX + controlDistance / 2;
              } else {
                sourceControlX = sourceX - controlDistance / 2;
              }
          }

          // Point de contrôle cible
          switch (line.targetSide) {
            case "top":
              targetControlX = targetX;
              targetControlY = targetY - controlDistance;
              break;
            case "right":
              targetControlX = targetX + controlDistance;
              targetControlY = targetY;
              break;
            case "bottom":
              targetControlX = targetX;
              targetControlY = targetY + controlDistance;
              break;
            case "left":
              targetControlX = targetX - controlDistance;
              targetControlY = targetY;
              break;
            default:
              if (line.targetSide && line.targetSide.includes("top")) {
                targetControlY = targetY - controlDistance / 2;
              } else {
                targetControlY = targetY + controlDistance / 2;
              }
              if (line.targetSide && line.targetSide.includes("right")) {
                targetControlX = targetX + controlDistance / 2;
              } else {
                targetControlX = targetX - controlDistance / 2;
              }
          }

          const path = `M ${sourceX},${sourceY} C ${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`;

          return {
            id: line.id,
            path,
            color: line.color || "#2c3e50",
            thickness: line.thickness || 2,
            toolType: line.toolType,
          };
        } catch (error) {
          console.error(
            "Error calculating connection for line:",
            line,
            error
          );
          return null;
        }
      })
      .filter((conn) => conn !== null);

    setSvgConnections(newConnections);
  } catch (error) {
    console.error("Error in updateSvgConnectionsWithLines:", error);
  }
}, []);

  


    // Réagir aux changements de zoom
    useEffect(() => {
      const container = document.querySelector(".openDiv");
      if (container && nzoom) {
        container.style.zoom = nzoom;

        if (dotPatternCreationTimeout.current) {
          clearTimeout(dotPatternCreationTimeout.current);
        }

        dotPatternCreationTimeout.current = setTimeout(() => {
          createDotPattern();
        }, 100);
      }
    }, [nzoom]);

    // Fonction pour mettre à jour les éléments et propager au parent
    const updateElementsAndPropagate = useCallback(
      (updaterFn) => {
        if (typeof updaterFn === "function") {
          setElements((prevElements) => {
            const newElements = updaterFn(prevElements);
    
            // ✅ SUPPRESSION du setTimeout - Propagation immédiate
            if (!isInitialRender.current) {
              if (propSetElements) propSetElements(newElements);
              if (onDataChange) onDataChange(newElements, lines);
            }
            return newElements;
          });
        } else {
          setElements(updaterFn);
    
          // ✅ SUPPRESSION du setTimeout - Propagation immédiate  
          if (!isInitialRender.current) {
            if (propSetElements) propSetElements(updaterFn);
            if (onDataChange) onDataChange(updaterFn, lines);
          }
        }
      },
      [propSetElements, onDataChange, lines]
    );

    // Fonction pour mettre à jour les lignes et propager au parent
    const updateLinesAndPropagate = useCallback(
      (updaterFn) => {
        if (typeof updaterFn === "function") {
          setLines((prevLines) => {
            const newLines = updaterFn(prevLines);
    
            // ✅ SUPPRESSION du setTimeout - Propagation immédiate
            if (!isInitialRender.current) {
              if (propSetLines) propSetLines(newLines);
              if (onDataChange) onDataChange(elements, newLines);
            }
            return newLines;
          });
        } else {
          setLines(updaterFn);
    
          // ✅ SUPPRESSION du setTimeout - Propagation immédiate
          if (!isInitialRender.current) {
            if (propSetLines) propSetLines(updaterFn);
            if (onDataChange) onDataChange(elements, updaterFn);
          }
        }
      },
      [propSetLines, onDataChange, elements]
    );

    useEffect(() => {
      if (propElements && propElements !== elements) {
        setElements(propElements);
      }
    }, [propElements]);

    useEffect(() => {
      if (propLines && propLines !== lines) {
        setLines(propLines);
      }
    }, [propLines]);

   

    const deleteElement = useCallback((elementId) => {
      
      if (deletingElements.has(elementId)) return;
      
      const linesToKeep = lines.filter(line => line.source !== elementId && line.target !== elementId);
      const elementsToKeep = elements.filter(el => el.id !== elementId);
      
      // 🔥 MISE À JOUR IMMÉDIATE ET SYNCHRONE
      if (linesToKeep.length === 0) {
        setSvgConnections([]);
      } else {
        updateSvgConnectionsWithLines(linesToKeep);
      }
      
      setElements(elementsToKeep);
      setLines(linesToKeep);
      
      // Propagation sans délai
      if (!isInitialRender.current) {
        if (propSetElements) propSetElements(elementsToKeep);
        if (propSetLines) propSetLines(linesToKeep);
        if (onDataChange) onDataChange(elementsToKeep, linesToKeep);
      }
      
    }, [elements, lines, deletingElements, updateSvgConnectionsWithLines, propSetElements, propSetLines, onDataChange, isInitialRender]);
    useImperativeHandle(ref, () => ({
      updateData: (newElements, newLines) => {
        setElements(newElements);
        setLines(newLines);
      },
      createDotPattern,
      setTextElement,
      deleteElement, // Exposer la fonction de suppression
    }));
    // CORRECTION SUPPRESSION: Gestionnaire de suppression avec Delete - avec dépendances correctes
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Delete' && uuid && !deletingElements.has(uuid)) {
          deleteElement(uuid);
          setUuid('');
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [uuid, deleteElement, deletingElements]);


    // Fonction pour créer et afficher les points de connexion
    const showConnectionPoints = (element) => {
      if (!element) return;

      try {
        const existingDots = element.querySelectorAll(".connection-dot");
        existingDots.forEach((dot) => dot.remove());

        const shapeType = parseInt(element.getAttribute("shape-type"));
        const elementId = element.id;

        let positions = [];

        if (shapeType === 2) {
          positions = [
            {
              side: "top",
              top: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
            },
            {
              side: "right",
              top: "50%",
              right: "-10px",
              transform: "translateY(-50%)",
            },
            {
              side: "bottom",
              bottom: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
            },
            {
              side: "left",
              top: "50%",
              left: "-10px",
              transform: "translateY(-50%)",
            },
          ];
        } else if (shapeType === 3) {
          positions = [
            {
              side: "top-right",
              top: "0",
              right: "0",
              transform: "translate(35%, -35%)",
            },
            {
              side: "bottom-right",
              bottom: "0",
              right: "0",
              transform: "translate(35%, 35%)",
            },
            {
              side: "bottom-left",
              bottom: "0",
              left: "0",
              transform: "translate(-35%, 35%)",
            },
            {
              side: "top-left",
              top: "0",
              left: "0",
              transform: "translate(-35%, -35%)",
            },
          ];
        } else {
          positions = [
            {
              side: "top",
              top: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
            },
            {
              side: "top-right",
              top: "-10px",
              right: "0",
              transform: "translate(50%, 0)",
            },
            {
              side: "right",
              top: "50%",
              right: "-10px",
              transform: "translateY(-50%)",
            },
            {
              side: "bottom-right",
              bottom: "-10px",
              right: "0",
              transform: "translate(50%, 0)",
            },
            {
              side: "bottom",
              bottom: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
            },
            {
              side: "bottom-left",
              bottom: "-10px",
              left: "0",
              transform: "translate(-50%, 0)",
            },
            {
              side: "left",
              top: "50%",
              left: "-10px",
              transform: "translateY(-50%)",
            },
            {
              side: "top-left",
              top: "-10px",
              left: "0",
              transform: "translate(-50%, 0)",
            },
          ];
        }

        positions.forEach((pos) => {
          const dot = document.createElement("div");
          dot.className = "connection-dot";
          dot.setAttribute("data-element-id", elementId);
          dot.setAttribute("data-side", pos.side);
          dot.setAttribute("id", `dot-${elementId}-${pos.side}`);

          Object.assign(dot.style, {
            position: "absolute",
            width: "12px",
            height: "12px",
            backgroundColor: "#3498db",
            borderRadius: "50%",
            cursor: "pointer",
            zIndex: "1000",
            display: "block",
          });

          Object.keys(pos).forEach((key) => {
            if (key !== "side") {
              dot.style[key] = pos[key];
            }
          });

          dot.addEventListener("click", (e) => {
            e.stopPropagation();
            handleDotClick(elementId, dot, pos.side);
          });

          dot.addEventListener("mouseover", () => {
            dot.style.backgroundColor = "#2980b9";
            dot.style.transform = `${pos.transform} scale(1.2)`;
          });

          dot.addEventListener("mouseout", () => {
            if (
              !(
                sourceElement === elementId &&
                sourceDot &&
                sourceDot.side === pos.side
              )
            ) {
              dot.style.backgroundColor = "#3498db";
            }
            dot.style.transform = pos.transform;
          });

          element.appendChild(dot);
        });

      } catch (error) {
        console.error("Error showing connection points:", error);
      }
    };

   

    // Fonction pour mettre à jour les connexions SVG
    const updateSvgConnections = useCallback(() => {
      // Utiliser la fonction avec les lignes actuelles
      updateSvgConnectionsWithLines(lines);
    }, [lines, updateSvgConnectionsWithLines]);

    // Amélioration du déplacement avec liaisons
    const setElementPosition = (e) => {
      if (!isDown || !uuid) return;

      const el = elements.find((el) => el.id === uuid);
      if (!el) return;

      const currentElement = document.getElementById(uuid);
      const rect1 = currentElement.getBoundingClientRect();
      const rect3 = document.querySelector(".openDiv").getBoundingClientRect();

      let canMove = true;

      if (rect1.right > rect3.right - 10) {
        setBlockRight(true);
        canMove = false;
      } else if (rect1.left < rect3.left + 8) {
        setBlockLeft(true);
        el.x = 8;
        canMove = false;
      } else if (rect1.top < rect3.top) {
        setBlockTop(true);
        el.y = 0;
        canMove = false;
      } else if (rect1.bottom > rect3.bottom) {
        setBlockBottom(false);
        canMove = false;
      }

      const newX = parseInt(el.x) + e.movementX;
      const newY = parseInt(el.y) + e.movementY;
      const width = parseInt(el.width);
      const height = parseInt(el.height);

      if (canMove && !blockLeft && !blockRight && !blockTop && !blockBottom) {
        const wouldOverlap = elements.some((otherEl) => {
          if (otherEl.id === uuid) return false;

          const otherX = parseInt(otherEl.x);
          const otherY = parseInt(otherEl.y);
          const otherWidth = parseInt(otherEl.width);
          const otherHeight = parseInt(otherEl.height);

          return (
            newX < otherX + otherWidth &&
            newX + width > otherX &&
            newY < otherY + otherHeight &&
            newY + height > otherY
          );
        });

        if (!wouldOverlap) {
          updateElementsAndPropagate((prevElements) => {
            return prevElements.map((element) => {
              if (element.id === uuid) {
                return {
                  ...element,
                  x: newX,
                  y: newY,
                };
              } else {
                return element;
              }
            });
          });

          // Mise à jour optimisée des connexions
          if (lines.length > 0) {
            if (window.svgUpdateTimeout) {
              clearTimeout(window.svgUpdateTimeout);
            }
            
            window.svgUpdateTimeout = setTimeout(() => {
              updateSvgConnections();
              window.svgUpdateTimeout = null;
            }, 50);
          }
        }
      }

      if (blockLeft && e.movementX > 0) {
        setBlockLeft(false);
      } else if (blockRight && e.movementX < 0) {
        setBlockRight(false);
      } else if (blockTop && e.movementY > 0) {
        setBlockTop(false);
      } else if (blockBottom && e.movementY < 0) {
        setBlockBottom(false);
      }
    };

    useEffect(() => {
      if (lines.length > 0) {
        const timer = setTimeout(() => {
          updateSvgConnections();
        }, 100);

        return () => clearTimeout(timer);
      }
    }, [lines, elements, updateSvgConnections]);

    const handleDotClick = (elementId, dot, side) => {
      if (!sourceElementRef.current) {
        sourceElementRef.current = elementId;
        sourceSideRef.current = side;
        sourceDotRef.current = dot;
        dot.style.backgroundColor = "#e74c3c";
      } else {
        if (sourceElementRef.current !== elementId) {
          const targetElementId = elementId;
          const targetSide = side;

          const lineId = uuidv4();

          const newLine = {
            id: lineId,
            source: sourceElementRef.current,
            sourceSide: sourceSideRef.current,
            target: targetElementId,
            targetSide: targetSide,
            color: "#2c3e50",
            thickness: 2,
            toolType: tool.tool,
          };

          const sourceElement = document.getElementById(
            sourceElementRef.current
          );
          const targetElement = document.getElementById(targetElementId);

          if (
            sourceElement &&
            sourceElement.getAttribute("shape-type") === "4"
          ) {
            newLine.sourceOffset = { x: 0, y: 0 };
          }

          if (
            targetElement &&
            targetElement.getAttribute("shape-type") === "4"
          ) {
            newLine.targetOffset = { x: 0, y: 0 };
          }

          updateLinesAndPropagate((prevLines) => [...prevLines, newLine]);
        }

        if (sourceDotRef.current) {
          sourceDotRef.current.style.backgroundColor = "#3498db";
        }
        sourceElementRef.current = null;
        sourceSideRef.current = null;
        sourceDotRef.current = null;
      }
    };

    const createDotPattern = useCallback(() => {
      const now = Date.now();
      if (now - lastDotGridUpdate.current < 200) {
        return;
      }
      lastDotGridUpdate.current = now;

      const existingDotsContainer = document.getElementById("dotsContainer");
      if (existingDotsContainer) {
        existingDotsContainer.remove();
      }

      const dotBgColor = "#D0D0D0";

      const dotContainer = document.createElement("div");
      dotContainer.style.position = "absolute";
      dotContainer.style.top = "0";
      dotContainer.style.left = "0";
      dotContainer.style.width = "100%";
      dotContainer.style.height = "100%";
      dotContainer.style.pointerEvents = "none";
      dotContainer.id = "dotsContainer";

      const containerEl = document.querySelector(".openDiv");
      if (!containerEl) return;

      const currentZoom =
        parseFloat(containerEl.style.zoom || "100") / 100 || 1;

      const containerRect = containerEl.getBoundingClientRect();
      const scrollLeft = containerEl.scrollLeft;
      const scrollTop = containerEl.scrollTop;

      const visibleWidth = containerRect.width / currentZoom;
      const visibleHeight = containerRect.height / currentZoom;

      const baseSpacing = 25;
      const spacing = Math.max(
        baseSpacing,
        (baseSpacing / Math.max(0.1, currentZoom)) * 0.5
      );

      const startX = Math.floor(scrollLeft / spacing) * spacing;
      const startY = Math.floor(scrollTop / spacing) * spacing;

      const endX =
        Math.ceil((scrollLeft + visibleWidth * 2) / spacing) * spacing;
      const endY =
        Math.ceil((scrollTop + visibleHeight * 2) / spacing) * spacing;

      const dotsX = Math.floor((endX - startX) / spacing) + 1;
      const dotsY = Math.floor((endY - startY) / spacing) + 1;

      const batchSize = 200;
      let batch = [];

      for (let y = 0; y < dotsY; y++) {
        for (let x = 0; x < dotsX; x++) {
          const dotX = startX + x * spacing;
          const dotY = startY + y * spacing;

          batch.push({ x: dotX, y: dotY });

          if (batch.length >= batchSize) {
            processDotBatch(batch, dotContainer, dotBgColor, setDotPosition);
            batch = [];
          }
        }
      }

      if (batch.length > 0) {
        processDotBatch(batch, dotContainer, dotBgColor, setDotPosition);
      }

      const openDiv = document.querySelector(".openDiv");
      if (openDiv) {
        openDiv.appendChild(dotContainer);
      }
    }, []);

    const processDotBatch = (batch, container, dotBgColor, setDotPosition) => {
      batch.forEach((dotData) => {
        const dot = document.createElement("div");

        dot.style.position = "absolute";
        dot.style.width = "3px";
        dot.style.height = "3px";
        dot.style.backgroundColor = dotBgColor;
        dot.style.borderRadius = "50%";
        dot.setAttribute("x", `${dotData.x}`);
        dot.setAttribute("y", `${dotData.y}`);
        dot.classList.add("zone");

        dot.style.left = `${dotData.x}px`;
        dot.style.top = `${dotData.y}px`;
        dot.style.pointerEvents = "auto";

        dot.addEventListener("mouseover", function () {
          setDotPosition([this.getAttribute("x"), this.getAttribute("y")]);
        });

        container.appendChild(dot);
      });
    };

    // CORRECTION DÉPLACEMENT: Fonction select qui évite les conflits avec les formes transformées
    const select = (e, id) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Ne démarrer le déplacement que si l'outil de déplacement est actif
      if (tool.tool === 0) {
        setMouseIsDown(true);
        setUuid(id);
      }
    };

      // Nettoyage automatique des connexions orphelines
      const cleanupConnections = useCallback(() => {
        if (elements.length === 0) return;
        
        const elementIds = new Set(elements.map(el => el.id));
 
        // NOUVELLE VERSION SANS DÉLAI
        const cleaned = lines.filter(line => {
          const isValid = elementIds.has(line.source) && elementIds.has(line.target);
          if (!isValid) {
            console.log("🗑️ Suppression ligne orpheline:", line.id);
          }
          return isValid;
        });
        
        // MISE À JOUR DIRECTE SANS setTimeout
        setLines(cleaned);
        
        if (cleaned.length === 0) {
          setSvgConnections([]);
        } else {
          updateSvgConnectionsWithLines(cleaned);
        }
        
        // Propagation immédiate
        if (!isInitialRender.current) {
          if (propSetLines) propSetLines(cleaned);
          if (onDataChange) onDataChange(elements, cleaned);
        }
        
      }, [elements, lines, updateSvgConnectionsWithLines, propSetLines, onDataChange, isInitialRender]);

    // Fonction mouseIsDown améliorée
    const mouseIsDown = (e) => {
      // Vérifier que le clic provient bien du conteneur et non d'un élément
      if (e.target.classList.contains('openDiv') || e.target.classList.contains('zone')) {
        if (tool.tool !== 0 && tool.tool < 6) {
          setMouseIsDown(true);

          const newId = uuidv4();

          const initialX = parseInt(dotPosition[0]);
          const initialY = parseInt(dotPosition[1]);
          const width = defaultDimensions.current.width;
          const height = defaultDimensions.current.height;

          const isOverlapping = (x, y) => {
            return elements.some((element) => {
              const elX = parseInt(element.x);
              const elY = parseInt(element.y);
              const elWidth = parseInt(element.width || width);
              const elHeight = parseInt(element.height || height);

              return (
                x < elX + elWidth &&
                x + width > elX &&
                y < elY + elHeight &&
                y + height > elY
              );
            });
          };

          let finalX = initialX;
          let finalY = initialY;

          if (isOverlapping(initialX, initialY)) {
            const spacing = 25;
            let found = false;

            for (let distance = 1; distance <= 10 && !found; distance++) {
              for (let i = -distance; i <= distance && !found; i++) {
                const x = initialX + i * spacing;
                const y = initialY - distance * spacing;
                if (!isOverlapping(x, y)) {
                  finalX = x;
                  finalY = y;
                  found = true;
                }
              }

              for (let i = -distance + 1; i <= distance && !found; i++) {
                const x = initialX + distance * spacing;
                const y = initialY + i * spacing;
                if (!isOverlapping(x, y)) {
                  finalX = x;
                  finalY = y;
                  found = true;
                }
              }

              for (let i = distance - 1; i >= -distance && !found; i--) {
                const x = initialX + i * spacing;
                const y = initialY + distance * spacing;
                if (!isOverlapping(x, y)) {
                  finalX = x;
                  finalY = y;
                  found = true;
                }
              }

              for (let i = distance - 1; i >= -distance + 1 && !found; i--) {
                const x = initialX - distance * spacing;
                const y = initialY + i * spacing;
                if (!isOverlapping(x, y)) {
                  finalX = x;
                  finalY = y;
                  found = true;
                }
              }
            }
          }

          let newShape = {
            id: newId,
            x: finalX,
            y: finalY,
            width: defaultDimensions.current.width,
            height: defaultDimensions.current.height,
            bgColor: "white",
            borderColor: "gray",
            textColor: "black",
            textAlign: "center",
            textVerticalAlign: "middle",
            opacity: 1,
            border: "1px solid gray",
            text: "",
          };
          switch (tool.tool) {
            case 1:
              newShape = {
                ...newShape,
                type: 1,
                radius: "15%",
                transform: "",
              };
              break;
            case 2:
              newShape = {
                ...newShape,
                type: 2,
                radius: "50%",
                transform: "",
              };
              break;
            case 3:
              newShape = {
                ...newShape,
                type: 3,
                radius: "5%",
                transform: "rotate(45deg)",
              };
              break;
            case 4:
              newShape = {
                ...newShape,
                type: 4,
                radius: "5%",
                transform: "skewX(-15deg)",
              };
              break;
            case 5:
              newShape = {
                ...newShape,
                type: 5,
                width: newShape.width + 5,
                height: newShape.height + 5,
              };
              break;
            default:
              newShape = {
                ...newShape,
                type: 0,
              };
              break;
          }

          setStyle(newShape);

          updateElementsAndPropagate((prevElements) => [
            ...prevElements,
            newShape,
          ]);

          setUuid(newId);
        }
      }
    };

    const findClosestElement = (referenceElement, elements) => {
      if (!elements.length || referenceElement == null) return null;

      const refRect = referenceElement.getBoundingClientRect();
      const refX = refRect.left;
      const refY = refRect.top;

      let closestElement = elements[0];
      let minDistance = Infinity;

      elements.forEach((element) => {
        if (element === referenceElement) return;

        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        const distance = Math.sqrt(
          Math.pow(refX - x, 2) + Math.pow(refY - y, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestElement = element;
        }
      });

      return closestElement;
    };

    const mouseIsUp = () => {
      setMouseIsDown(false);

      if (tool.tool === 0 && uuid && isDown) {
        const reference = document.getElementById(uuid);
        const dotsContainer = document.getElementById("dotsContainer");

        if (reference && dotsContainer) {
          const otherElements = Array.from(dotsContainer.children);
          const closest = findClosestElement(reference, otherElements);

          if (closest) {
            updateElementsAndPropagate((prevElements) => {
              return prevElements.map((element) => {
                if (element.id === uuid) {
                  return {
                    ...element,
                    x: closest.getAttribute("x"),
                    y: closest.getAttribute("y"),
                  };
                } else {
                  return element;
                }
              });
            });
          }
        }
      }

      if (lines.length > 0) {
        setTimeout(() => {
          updateSvgConnections();
        }, 100);
      }
    };

    const setDimensions = (e, active) => {
      if (
        (isDown && tool.tool !== 0 && tool.tool < 6 && tool.tool != -1) ||
        active
      ) {
        const number = 25;

        if (tool.tool === 2 || tool.tool === 3) {
          if (e.movementX > 0 || e.movementY > 0) {
            setStyle((prevStyle) => ({
              ...prevStyle,
              width: prevStyle.width + number,
              height: prevStyle.width + number,
            }));
          } else if (e.movementX < 0 || e.movementY < 0) {
            setStyle((prevStyle) => ({
              ...prevStyle,
              width: Math.max(20, prevStyle.width - number),
              height: Math.max(20, prevStyle.width - number),
            }));
          }
        } else if (tool.tool === 1 || tool.tool === 4 || tool.tool === 5) {
          if (e.movementX > 0) {
            setStyle((prevStyle) => ({
              ...prevStyle,
              width: prevStyle.width + number,
            }));
          } else if (e.movementX < 0) {
            setStyle((prevStyle) => ({
              ...prevStyle,
              width: Math.max(20, prevStyle.width - number),
            }));
          }

          if (e.movementY > 0) {
            setStyle((prevStyle) => ({
              ...prevStyle,
              height: prevStyle.height + number,
            }));
          } else if (e.movementY < 0) {
            setStyle((prevStyle) => ({
              ...prevStyle,
              height: Math.max(20, prevStyle.height - number),
            }));
          }
        }

        updateElementsAndPropagate((prevElements) => {
          return prevElements.map((element) => {
            if (element.id === uuid) {
              return {
                ...element,
                width: style.width,
                height: style.height,
              };
            } else {
              return element;
            }
          });
        });
      }
    };
    useEffect(() => {
      if (elements.length > 0) {
        // ✅ SUPPRESSION du setTimeout - Nettoyage immédiat
        cleanupConnections();
      }
    }, [elements, cleanupConnections]);
    const setTextElement = () => {
      const el = document.getElementById("input" + uuid);
      if (el) {
        updateElementsAndPropagate((prevElements) => {
          return prevElements.map((element) => {
            if (element.id === uuid) {
              return {
                ...element,
                text: el.value,
              };
            } else {
              return element;
            }
          });
        });
      }
    };

    const calculateFontSize = (text, width, height) => {
      if (!text) return "14px";

      const baseSize = Math.min(width / (text.length * 0.7), height / 2);

      return Math.max(9, Math.min(baseSize, 20)) + "px";
    };

    return (
      <div style={{ flex: "auto" }}>
        <div
          id="boxs"
          onMouseMove={(e) => {
            if (isDown) {
              if (tool.tool !== 0 && tool.tool < 6) {
                setDimensions(e, false);
              } else if (tool.tool === 0) {
                setElementPosition(e);
              }
            }
          }}
          className="col"
          style={{
            padding: "15px",
            margin: "0 auto",
            overflow: "auto",
            boxSizing: "border-box",
            zoom: "100%",
            height: "100vh",
            position: "relative",
          }}
        >
          <div
            ref={containerRef}
            className="openDiv"
            onMouseDown={(e) => {
              // Ne traiter l'événement que si le clic est directement sur le conteneur
              if (e.target === e.currentTarget || e.target.classList.contains('zone')) {
                if (tool.tool > 0 && tool.tool < 6) {
                  mouseIsDown(e);
                } else if (tool.tool == -1) {
                  const inputElement = document.getElementById("input" + uuid);
                  if (inputElement) {
                    inputElement.style.zIndex = "3";
                  }
                }
              }
            }}
            onMouseUp={mouseIsUp}
            style={{
              position: "relative",
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              background: "white",
              overflowX: "scroll",
              overflowY: "scroll",
              zoom: nzoom,
            }}
          >
            {/* Conteneur SVG pour les connexions */}
            <svg
              className="connections-container"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 9000,
              }}
            >
              <defs>
                {svgConnections &&
                  svgConnections.map((conn) => {
                    if (
                      !conn.toolType ||
                      conn.toolType === 6 ||
                      conn.toolType === 7
                    ) {
                      return (
                        <marker
                          key={`marker-${conn.id}`}
                          id={`arrowhead-${conn.id}`}
                          markerWidth="10"
                          markerHeight="7"
                          refX="9"
                          refY="3.5"
                          orient="auto"
                        >
                          <circle cx="8" cy="3.5" r="2" fill={conn.color} />
                        </marker>
                      );
                    }
                    return null;
                  })}
              </defs>

              {svgConnections &&
                svgConnections.map((conn) => {
                  if (!conn.toolType || conn.toolType === 6) {
                    return (
                      <path
                        key={`path-${conn.id}`}
                        d={conn.path}
                        stroke={conn.color}
                        strokeWidth={conn.thickness}
                        fill="none"
                        markerEnd={`url(#arrowhead-${conn.id})`}
                      />
                    );
                  } else if (conn.toolType === 7) {
                    return (
                      <path
                        key={`path-${conn.id}`}
                        d={conn.path}
                        stroke={conn.color}
                        strokeWidth={conn.thickness}
                        fill="none"
                        strokeDasharray="5,5"
                        markerEnd={`url(#arrowhead-${conn.id})`}
                      />
                    );
                  } else if (conn.toolType === 8) {
                    return (
                      <path
                        key={`path-${conn.id}`}
                        d={conn.path}
                        stroke={conn.color}
                        strokeWidth={conn.thickness}
                        fill="none"
                        strokeDasharray="2,4"
                      />
                    );
                  }
                  return null;
                })}
            </svg>

            {/* Rendu des éléments */}
            {elements
              .filter((el) => el.id)
              .map((elementStyle) => (
                <div
                  onMouseUp={mouseIsUp}
                  onMouseEnter={() => {
                    if (!isDown && tool.tool < 6) {
                      setColor(elementStyle.bgColor);
                    }
                  }}
                  id={elementStyle.id}
                  key={elementStyle.id}
                  className="shape-elementy"
                  onMouseDown={(e) => {
                    // CORRECTION DÉPLACEMENT: Toujours appeler select mais avec vérification interne
                    select(e, elementStyle.id);
                  }}
                  style={{
                    position: "absolute",
                    left: `${elementStyle.x}px`,
                    top: `${elementStyle.y}px`,
                    width: `${elementStyle.width}px`,
                    height: `${elementStyle.height}px`,
                    background: elementStyle.type == 5 ? `url('data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="2.9 2.9 23.2 18.2" preserveAspectRatio="none"%3E%3Cpath d="M6 3 H23 L23 6 C23 6.55228 23.4477 7 24 7 H26 V18 C26 19.6568 24.6569 21 23 21 H6 C4.34315 21 3 19.6569 3 18 V6 C3 4.34315 4.34315 3 6 3 Z" fill="white" stroke="%23333333" stroke-width="0.63" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/%3E%3Cpath d="M23 3V6C23 6.55228 23.4477 7 24 7H26L23 3Z" fill="%23EEEEEE" stroke="%23333333" stroke-width="0.63" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/%3E%3C/svg%3E') center no-repeat` : "",
                    backgroundSize: elementStyle.type == 5 ? "100% 100%" : "",
                    borderRadius: elementStyle.radius,
                    border: elementStyle.type == 5 ? "" : `${elementStyle.border.split(" ")[0]} solid ${
                      elementStyle.borderColor || "gray"
                    }`,
                    backgroundColor: elementStyle.type == 5 ? "" : elementStyle.bgColor,
                    opacity:
                      elementStyle.opacity !== undefined
                        ? elementStyle.opacity
                        : 1,
                    transform: elementStyle.transform,
                    cursor: tool.tool === 0 ? "move" : tool.tool === -1 ? "text" : "default",
                    zIndex: "2",
                    pointerEvents: "auto",
                  }}
                  shape-type={elementStyle.type}
                >
                  {/* CORRECTION ALIGNEMENT: Nouveau système d'alignement vertical */}
                  <div
                    style={{
                      position: "absolute",
                      top: "0",
                      left: "0",
                      width: "100%",
                      height: "100%",
                      display: "table", // Utiliser table pour le centrage vertical
                      // Annuler les transformations de la forme parente pour le texte
                      transform: (() => {
                        if (elementStyle.transform?.includes("rotate")) {
                          return "rotate(-45deg)";
                        } else if (elementStyle.transform?.includes("skew")) {
                          return "skewX(15deg)";
                        }
                        return "none";
                      })(),
                    }}
                  >
                    <textarea
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (tool.tool === -1) {
                          select(e, elementStyle.id);
                        }
                      }}
                      id={"input" + elementStyle.id}
                      className="text-dark shape-input"
                      style={{
                        display: "table-cell", // Cellule de table pour centrage vertical
                        verticalAlign: (() => {
                          if (elementStyle.textVerticalAlign === "top") return "top";
                          if (elementStyle.textVerticalAlign === "bottom") return "bottom";
                          return "middle"; // centrage par défaut
                        })(),
                        textAlign: elementStyle.textAlign || "center",
                        width: "100%",
                        height: "100%",
                        border: "none",
                        borderRadius: elementStyle.radius,
                        backgroundColor: "transparent",
                        color: elementStyle.textColor || "black",
                        resize: "none",
                        overflow: "hidden",
                        padding: "10px",
                        lineHeight: "1.2",
                        fontSize: calculateFontSize(
                          elementStyle.text || "",
                          elementStyle.width - 20,
                          elementStyle.height - 20
                        ),
                        opacity: elementStyle.text ? "1" : "0.7",
                        boxSizing: "border-box",
                      }}
                      onChange={() => setTextElement()}
                      value={elementStyle.text || ""}
                      placeholder="Texte..."
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }
);

export default MainLogigramme;