"use client";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo
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
    // États principaux
    const [isDown, setMouseIsDown] = useState(false);
    const [elements, setElements] = useState([]);
    const [lines, setLines] = useState([]);
    const [uuid, setUuid] = useState("");
    const [svgConnections, setSvgConnections] = useState([]);
    const [isInternallyLoaded, setIsInternallyLoaded] = useState(false);
    const [dotPosition, setDotPosition] = useState([0, 0]);
    const [color, setColor] = useState("#ffffff");
    const [connectingMode, setConnectingMode] = useState(false);
    const [deletingElements, setDeletingElements] = useState(new Set());
    const [tempPosition, setTempPosition] = useState(null);

    // Style pour nouveaux éléments
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

    // Refs
    const isInitialRender = useRef(true);
    const initializationComplete = useRef(false);
    const containerRef = useRef(null);
    const initialDragPosition = useRef(null);
    const dragStartMousePosition = useRef(null);
    const defaultDimensions = useRef({ width: 103, height: 103 });
    const dotPatternCreationTimeout = useRef(null);
    const lastDotGridUpdate = useRef(0);
    const sourceElementRef = useRef(null);
    const sourceSideRef = useRef(null);
    const sourceDotRef = useRef(null);
    const isDraggingRef = useRef(false);
    const draggedElementRef = useRef(null);
    const updateConnectionsTimeoutRef = useRef(null);

    const [canvasSize] = useState({
      width: 5000,
      height: 5000,
    });

    // Initialisation
    useEffect(() => {
      if (isInternallyLoaded && !isInitialRender.current) {
        if (onLoadComplete) {
          onLoadComplete();
        }
      }
    }, [isInternallyLoaded, onLoadComplete]);

    useEffect(() => {
      isInitialRender.current = false;

      const timer = setTimeout(() => {
        createDotPattern();
        setIsInternallyLoaded(true);
        initializationComplete.current = true;
      }, 100);

      const fallbackTimer = setTimeout(() => {
        if (!initializationComplete.current) {
          setIsInternallyLoaded(true);
          initializationComplete.current = true;
        }
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearTimeout(fallbackTimer);
      };
    }, []);

    // Gestion des outils de connexion
    useEffect(() => {
      if (tool.tool === 6 || tool.tool === 7 || tool.tool === 8) {
        setTimeout(() => {
          const shapes = document.querySelectorAll("[shape-type]");
          shapes.forEach((element) => {
            showConnectionPoints(element);
          });
          setConnectingMode(true);
        }, 100);
      } else {
        const dots = document.querySelectorAll(".connection-dot");
        dots.forEach((dot) => {
          dot.style.display = "none";
        });
        setConnectingMode(false);
      }
    }, [tool]);

    // Gestion du zoom
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

    useEffect(() => {
      if (uuid && onUuidChange) {
        // Planifier pour le prochain tick
        const timeoutId = setTimeout(() => {
          onUuidChange(uuid);
        }, 0);

        return () => clearTimeout(timeoutId);
      }
    }, [uuid, onUuidChange]);

    // Fonctions de mise à jour avec propagation au parent
    const updateElementsAndPropagate = useCallback(
      (updaterFn) => {
        if (typeof updaterFn === "function") {
          setElements((prevElements) => {
            const newElements = updaterFn(prevElements);

            // ✅ Callback asynchrone
            if (!isInitialRender.current) {
              setTimeout(() => {
                if (propSetElements) propSetElements(newElements);
                if (onDataChange) onDataChange(newElements, lines);
              }, 0);
            }
            return newElements;
          });
        } else {
          setElements(updaterFn);

          // ✅ Callback asynchrone
          if (!isInitialRender.current) {
            setTimeout(() => {
              if (propSetElements) propSetElements(updaterFn);
              if (onDataChange) onDataChange(updaterFn, lines);
            }, 0);
          }
        }
      },
      [propSetElements, onDataChange, lines]
    );

    const updateLinesAndPropagate = useCallback(
      (updaterFn) => {
        if (typeof updaterFn === "function") {
          setLines((prevLines) => {
            const newLines = updaterFn(prevLines);

            // ✅ Callback asynchrone
            if (!isInitialRender.current) {
              setTimeout(() => {
                if (propSetLines) propSetLines(newLines);
                if (onDataChange) onDataChange(elements, newLines);
              }, 0);
            }
            return newLines;
          });
        } else {
          setLines(updaterFn);

          // ✅ Callback asynchrone
          if (!isInitialRender.current) {
            setTimeout(() => {
              if (propSetLines) propSetLines(updaterFn);
              if (onDataChange) onDataChange(elements, updaterFn);
            }, 0);
          }
        }
      },
      [propSetLines, onDataChange, elements]
    );

    // Synchronisation avec les props parent
    useEffect(() => {
      if (propElements && propElements !== elements && !isDraggingRef.current) {
        const elementsChanged = JSON.stringify(propElements) !== JSON.stringify(elements);
        if (elementsChanged) {
          setElements(propElements);
        }
      }
    }, [propElements]);

    useEffect(() => {
      if (propLines && propLines !== lines) {
        const linesChanged = JSON.stringify(propLines) !== JSON.stringify(lines);
        if (linesChanged) {
          setLines(propLines);
        }
      }
    }, [propLines]);

    // Calcul des connexions SVG
    const connectionData = useMemo(() => {
      if (!lines || lines.length === 0 || !elements || elements.length === 0) {
        return [];
      }

      const elementsWithTemp = elements.map(el => {
        if (tempPosition && tempPosition.id === el.id) {
          return { ...el, x: tempPosition.x, y: tempPosition.y };
        }
        return el;
      });

      const elementsSignature = elementsWithTemp.map(el => ({
        id: el.id,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        type: el.type
      }));

      // Fonction pour calculer les positions réelles des dots en tenant compte des transformations
      const calculateRealDotPosition = (element, elementRect, side) => {
        const centerX = elementRect.left + elementRect.width / 2;
        const centerY = elementRect.top + elementRect.height / 2;
        
        if (element.type === 3) {
          // Losange - dots aux coins avec translate(±35%, ±35%) et rotation de 45°
          let dotX, dotY;
          
          switch (side) {
            case "top-right":
              // Position avant transformation: coin top-right avec translate(35%, -35%)
              dotX = elementRect.right + (elementRect.width * 0.35);
              dotY = elementRect.top - (elementRect.height * 0.35);
              break;
            case "bottom-right":
              // Position avant transformation: coin bottom-right avec translate(35%, 35%)
              dotX = elementRect.right + (elementRect.width * 0.35);
              dotY = elementRect.bottom + (elementRect.height * 0.35);
              break;
            case "bottom-left":
              // Position avant transformation: coin bottom-left avec translate(-35%, 35%)
              dotX = elementRect.left - (elementRect.width * 0.35);
              dotY = elementRect.bottom + (elementRect.height * 0.35);
              break;
            case "top-left":
              // Position avant transformation: coin top-left avec translate(-35%, -35%)
              dotX = elementRect.left - (elementRect.width * 0.35);
              dotY = elementRect.top - (elementRect.height * 0.35);
              break;
            default:
              dotX = centerX;
              dotY = centerY;
          }
          
          // Appliquer la rotation de 45° autour du centre de l'élément
          const relativeX = dotX - centerX;
          const relativeY = dotY - centerY;
          const angle = Math.PI / 4; // 45 degrés
          const cos45 = Math.cos(angle);
          const sin45 = Math.sin(angle);
          
          const rotatedX = relativeX * cos45 - relativeY * sin45;
          const rotatedY = relativeX * sin45 + relativeY * cos45;
          
          return {
            x: centerX + rotatedX,
            y: centerY + rotatedY
          };
        } else if (element.type === 4) {
          // Parallélogramme - dots avec offset de -10px et skewX(-15deg)
          let dotX, dotY;
          
          switch (side) {
            case "top":
              dotX = centerX;
              dotY = elementRect.top - 10;
              break;
            case "right":
              dotX = elementRect.right + 10;
              dotY = centerY;
              break;
            case "bottom":
              dotX = centerX;
              dotY = elementRect.bottom + 10;
              break;
            case "left":
              dotX = elementRect.left - 10;
              dotY = centerY;
              break;
            default:
              return { x: centerX, y: centerY };
          }
          
          // Appliquer skewX(-15deg)
          const skewAngle = -15 * Math.PI / 180;
          const relativeY = dotY - centerY;
          const skewedX = dotX + relativeY * Math.tan(skewAngle);
          
          return {
            x: skewedX,
            y: dotY
          };
        } else if (element.type === 2) {
          // Cercle - dots avec offset de -10px
          switch (side) {
            case "top":
              return { x: centerX, y: elementRect.top - 10 };
            case "right":
              return { x: elementRect.right + 10, y: centerY };
            case "bottom":
              return { x: centerX, y: elementRect.bottom + 10 };
            case "left":
              return { x: elementRect.left - 10, y: centerY };
            default:
              return { x: centerX, y: centerY };
          }
        } else {
          // Autres formes (rectangle) - dots avec offset de -10px
          switch (side) {
            case "top":
              return { x: centerX, y: elementRect.top - 10 };
            case "right":
              return { x: elementRect.right + 10, y: centerY };
            case "bottom":
              return { x: centerX, y: elementRect.bottom + 10 };
            case "left":
              return { x: elementRect.left - 10, y: centerY };
            default:
              return { x: centerX, y: centerY };
          }
        }
      };

      const newConnections = lines
        .map((line) => {
          try {
            const sourceElement = elementsSignature.find(el => el.id === line.source);
            const targetElement = elementsSignature.find(el => el.id === line.target);

            if (!sourceElement || !targetElement) {
              return null;
            }

            const sourceRect = {
              left: sourceElement.x,
              top: sourceElement.y,
              width: sourceElement.width,
              height: sourceElement.height,
              right: sourceElement.x + sourceElement.width,
              bottom: sourceElement.y + sourceElement.height
            };

            const targetRect = {
              left: targetElement.x,
              top: targetElement.y,
              width: targetElement.width,
              height: targetElement.height,
              right: targetElement.x + targetElement.width,
              bottom: targetElement.y + targetElement.height
            };

            // Utiliser la nouvelle fonction pour calculer les positions
            const sourcePosition = calculateRealDotPosition(sourceElement, sourceRect, line.sourceSide);
            const sourceX = sourcePosition.x;
            const sourceY = sourcePosition.y;

            const targetPosition = calculateRealDotPosition(targetElement, targetRect, line.targetSide);
            const targetX = targetPosition.x;
            const targetY = targetPosition.y;

            if (isNaN(sourceX) || isNaN(sourceY) || isNaN(targetX) || isNaN(targetY)) {
              return null;
            }

            const controlDistance = Math.min(
              Math.abs(targetX - sourceX),
              Math.abs(targetY - sourceY)
            ) / 2 + 50;

            let sourceControlX, sourceControlY, targetControlX, targetControlY;

            // Points de contrôle pour courbes de Bézier
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
            console.error("Error calculating connection for line:", line, error);
            return null;
          }
        })
        .filter((conn) => conn !== null);

      return newConnections;
    }, [
      lines.map(l => `${l.id}-${l.source}-${l.target}-${l.sourceSide}-${l.targetSide}`).join(','),
      elements.map(e => `${e.id}-${e.x}-${e.y}-${e.width}-${e.height}-${e.type}`).join(','),
      tempPosition
    ]);

    useEffect(() => {
      setSvgConnections(connectionData);
    }, [connectionData]);

    // Suppression d'éléments
    const deleteElement = useCallback((elementId) => {
      if (deletingElements.has(elementId)) return;

      const linesToKeep = lines.filter(line => line.source !== elementId && line.target !== elementId);
      const elementsToKeep = elements.filter(el => el.id !== elementId);

      setElements(elementsToKeep);
      setLines(linesToKeep);

      if (!isInitialRender.current) {
        if (propSetElements) propSetElements(elementsToKeep);
        if (propSetLines) propSetLines(linesToKeep);
        if (onDataChange) onDataChange(elementsToKeep, linesToKeep);
      }
    }, [elements, lines, deletingElements, propSetElements, propSetLines, onDataChange, isInitialRender]);

    useImperativeHandle(ref, () => ({
      updateData: (newElements, newLines) => {
        setElements(newElements);
        setLines(newLines);
      },
      createDotPattern,
      setTextElement,
      deleteElement,
    }));

    // Gestionnaire touches clavier
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

    // Fonctions de gestion des connexions
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
            { side: "top", top: "-10px", left: "50%", transform: "translateX(-50%)" },
            { side: "right", top: "50%", right: "-10px", transform: "translateY(-50%)" },
            { side: "bottom", bottom: "-10px", left: "50%", transform: "translateX(-50%)" },
            { side: "left", top: "50%", left: "-10px", transform: "translateY(-50%)" },
          ];
        } else if (shapeType === 3) {
          positions = [
            { side: "top-right", top: "0", right: "0", transform: "translate(35%, -35%)" },
            { side: "bottom-right", bottom: "0", right: "0", transform: "translate(35%, 35%)" },
            { side: "bottom-left", bottom: "0", left: "0", transform: "translate(-35%, 35%)" },
            { side: "top-left", top: "0", left: "0", transform: "translate(-35%, -35%)" },
          ];
        } else {
          positions = [
            { side: "top", top: "-10px", left: "50%", transform: "translateX(-50%)" },
            { side: "right", top: "50%", right: "-10px", transform: "translateY(-50%)" },
            { side: "bottom", bottom: "-10px", left: "50%", transform: "translateX(-50%)" },
            { side: "left", top: "50%", left: "-10px", transform: "translateY(-50%)" },
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
            if (!(sourceElementRef.current === elementId && sourceDotRef.current && sourceDotRef.current.side === pos.side)) {
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

    const handleDotClick = (elementId, dot, side) => {
      if (!sourceElementRef.current) {
        sourceElementRef.current = elementId;
        sourceSideRef.current = side;
        sourceDotRef.current = dot;
        dot.style.backgroundColor = "#e74c3c";
      } else {
        if (sourceElementRef.current !== elementId) {
          const lineId = uuidv4();
          const newLine = {
            id: lineId,
            source: sourceElementRef.current,
            sourceSide: sourceSideRef.current,
            target: elementId,
            targetSide: side,
            color: "#2c3e50",
            thickness: 2,
            toolType: tool.tool,
          };

          const sourceElement = document.getElementById(sourceElementRef.current);
          const targetElement = document.getElementById(elementId);

          if (sourceElement && sourceElement.getAttribute("shape-type") === "4") {
            newLine.sourceOffset = { x: 0, y: 0 };
          }

          if (targetElement && targetElement.getAttribute("shape-type") === "4") {
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

    // Fonctions de déplacement
    const findClosestDot = (x, y, dots) => {
      let closestDot = null;
      let minDistance = Infinity;

      dots.forEach((dot) => {
        const dotX = parseInt(dot.getAttribute("x"));
        const dotY = parseInt(dot.getAttribute("y"));

        const distance = Math.sqrt(Math.pow(x - dotX, 2) + Math.pow(y - dotY, 2));

        if (distance < minDistance && distance < 25) {
          minDistance = distance;
          closestDot = dot;
        }
      });

      return closestDot;
    };

    const setElementPosition = useCallback((e) => {
      if (!isDraggingRef.current || !draggedElementRef.current) return;

      const el = elements.find((el) => el.id === draggedElementRef.current);
      if (!el) return;

      const currentX = typeof el.x === 'number' ? el.x : parseInt(el.x) || 0;
      const currentY = typeof el.y === 'number' ? el.y : parseInt(el.y) || 0;

      let deltaX = 0;
      let deltaY = 0;

      if (e.movementX !== undefined && e.movementY !== undefined) {
        deltaX = e.movementX;
        deltaY = e.movementY;
      } else if (dragStartMousePosition.current) {
        deltaX = e.clientX - dragStartMousePosition.current.x;
        deltaY = e.clientY - dragStartMousePosition.current.y;
        dragStartMousePosition.current = { x: e.clientX, y: e.clientY };
      } else {
        dragStartMousePosition.current = { x: e.clientX, y: e.clientY };
        return;
      }

      const newX = currentX + deltaX;
      const newY = currentY + deltaY;

      setTempPosition({ id: el.id, x: newX, y: newY });

      updateElementsAndPropagate((prevElements) => {
        return prevElements.map((element) => {
          if (element.id === draggedElementRef.current) {
            return { ...element, x: newX, y: newY };
          }
          return element;
        });
      });
    }, [elements, updateElementsAndPropagate]);

    const setDimensions = useCallback((e, active) => {
      if ((isDown && tool.tool !== 0 && tool.tool < 6 && tool.tool != -1) || active) {
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
            }
            return element;
          });
        });
      }
    }, [isDown, tool.tool, uuid, style.width, style.height, updateElementsAndPropagate]);

    const mouseIsUp = useCallback(() => {
      const wasDragging = isDraggingRef.current;
      const draggedId = draggedElementRef.current;

      setMouseIsDown(false);
      isDraggingRef.current = false;
      draggedElementRef.current = null;

      if (wasDragging && draggedId && tempPosition && tempPosition.id === draggedId) {
        let finalX = tempPosition.x;
        let finalY = tempPosition.y;

        const dotsContainer = document.getElementById("dotsContainer");
        if (dotsContainer) {
          const dots = Array.from(dotsContainer.children);
          const closest = findClosestDot(finalX, finalY, dots);

          if (closest) {
            finalX = parseInt(closest.getAttribute("x"));
            finalY = parseInt(closest.getAttribute("y"));
          }
        }

        updateElementsAndPropagate((prevElements) => {
          return prevElements.map((element) => {
            if (element.id === draggedId) {
              return { ...element, x: finalX, y: finalY };
            }
            return element;
          });
        });
      }

      setTempPosition(null);
      initialDragPosition.current = null;
      dragStartMousePosition.current = null;

      if (updateConnectionsTimeoutRef.current) {
        clearTimeout(updateConnectionsTimeoutRef.current);
        updateConnectionsTimeoutRef.current = null;
      }
    }, [isDown, tempPosition, updateElementsAndPropagate]);

    const select = useCallback((e, id) => {
      e.stopPropagation();
      e.preventDefault();

      setUuid(id);

      if (tool.tool === 0) {
        setMouseIsDown(true);
        isDraggingRef.current = true;
        draggedElementRef.current = id;

        dragStartMousePosition.current = { x: e.clientX, y: e.clientY };

        const element = elements.find(el => el.id === id);
        if (element) {
          initialDragPosition.current = {
            x: typeof element.x === 'number' ? element.x : parseInt(element.x) || 0,
            y: typeof element.y === 'number' ? element.y : parseInt(element.y) || 0
          };
        }
      }
    }, [tool.tool, elements]);

    // Gestionnaires globaux souris
    useEffect(() => {
      const handleGlobalMouseMove = (e) => {
        if (isDraggingRef.current && tool.tool === 0 && draggedElementRef.current) {
          setElementPosition(e);
        } else if (isDown && tool.tool !== 0 && tool.tool < 6) {
          setDimensions(e, false);
        }
      };

      const handleGlobalMouseUp = () => {
        if (isDraggingRef.current || isDown) {
          mouseIsUp();
        }
      };

      document.addEventListener("mousemove", handleGlobalMouseMove, { passive: false });
      document.addEventListener("mouseup", handleGlobalMouseUp, { passive: false });

      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }, [tool.tool, isDown, setElementPosition, setDimensions, mouseIsUp]);

    // Création de la grille de points
    const createDotPattern = useCallback(() => {
      const now = Date.now();
      if (now - lastDotGridUpdate.current < 200) return;
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
      dotContainer.style.width = `${canvasSize.width}px`;
      dotContainer.style.height = `${canvasSize.height}px`;
      dotContainer.style.pointerEvents = "none";
      dotContainer.style.zIndex = "1";
      dotContainer.id = "dotsContainer";

      const baseSpacing = 25;
      const spacing = baseSpacing;

      // Couvrir toute la surface du canvas
      const startX = 0;
      const startY = 0;
      const endX = canvasSize.width;
      const endY = canvasSize.height;

      const dotsX = Math.floor(endX / spacing) + 1;
      const dotsY = Math.floor(endY / spacing) + 1;

      const batchSize = 500;
      let batch = [];

      for (let y = 0; y < dotsY; y++) {
        for (let x = 0; x < dotsX; x++) {
          const dotX = startX + x * spacing;
          const dotY = startY + y * spacing;

          // S'assurer que les dots restent dans les limites du canvas
          if (dotX <= canvasSize.width && dotY <= canvasSize.height) {
            batch.push({ x: dotX, y: dotY });

            if (batch.length >= batchSize) {
              processDotBatch(batch, dotContainer, dotBgColor, setDotPosition);
              batch = [];
            }
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
    }, [canvasSize.width, canvasSize.height]);

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

    // Création de nouveaux éléments
    const mouseIsDown = (e) => {
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
              newShape = { ...newShape, type: 1, radius: "15%", transform: "" };
              break;
            case 2:
              newShape = { ...newShape, type: 2, radius: "50%", transform: "" };
              break;
            case 3:
              newShape = { ...newShape, type: 3, radius: "5%", transform: "rotate(45deg)" };
              break;
            case 4:
              newShape = { ...newShape, type: 4, radius: "5%", transform: "skewX(-15deg)" };
              break;
            case 5:
              newShape = { ...newShape, type: 5, width: newShape.width + 5, height: newShape.height + 5 };
              break;
            default:
              newShape = { ...newShape, type: 0 };
              break;
          }

          setStyle(newShape);
          updateElementsAndPropagate((prevElements) => [...prevElements, newShape]);
          setUuid(newId);
        }
      }
    };

    const setTextElement = () => {
      const el = document.getElementById("input" + uuid);
      if (el) {
        updateElementsAndPropagate((prevElements) => {
          return prevElements.map((element) => {
            if (element.id === uuid) {
              return { ...element, text: el.value };
            }
            return element;
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
            <svg
              className="connections-container"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${canvasSize.width}px`,
                height: `${canvasSize.height}px`,
                pointerEvents: "none",
                zIndex: 9000,
              }}
            >
              <defs>
                {svgConnections &&
                  svgConnections.map((conn) => {
                    if (!conn.toolType || conn.toolType === 6 || conn.toolType === 7) {
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
                    border: elementStyle.type == 5 ? "" : `${elementStyle.border.split(" ")[0]} solid ${elementStyle.borderColor || "gray"}`,
                    backgroundColor: elementStyle.type == 5 ? "" : elementStyle.bgColor,
                    opacity: elementStyle.opacity !== undefined ? elementStyle.opacity : 1,
                    transform: elementStyle.transform,
                    cursor: tool.tool === 0 ? "move" : tool.tool === -1 ? "text" : "default",
                    zIndex: "2",
                    pointerEvents: "auto",
                  }}
                  shape-type={elementStyle.type}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "0",
                      left: "0",
                      width: "100%",
                      height: "100%",
                      display: "table",
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
                        display: "table-cell",
                        verticalAlign: (() => {
                          if (elementStyle.textVerticalAlign === "top") return "top";
                          if (elementStyle.textVerticalAlign === "bottom") return "bottom";
                          return "middle";
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