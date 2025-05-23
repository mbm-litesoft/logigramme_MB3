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

    const initialDragPosition = useRef(null);
    const dragStartMousePosition = useRef(null);
    
    const dotSelected = useRef(false);
    const defaultDimensions = useRef({ width: 103, height: 103 });
    const dotPatternCreationTimeout = useRef(null);
    const lastDotGridUpdate = useRef(0);

    const sourceElementRef = useRef(null);
    const sourceSideRef = useRef(null);
    const sourceDotRef = useRef(null);
    const [deletingElements, setDeletingElements] = useState(new Set());

    const isDraggingRef = useRef(false);
const draggedElementRef = useRef(null);
const [tempPosition, setTempPosition] = useState(null);
const updateConnectionsTimeoutRef = useRef(null);
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

      // Initialiser seulement le pattern de points
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

    useEffect(() => {
      if (uuid) {
        onUuidChange(uuid);
      }
    }, [uuid, onUuidChange]);



    // Effet qui se déclenche quand la prop tool change
    useEffect(() => {
      if (tool.tool === 6 || tool.tool === 7 || tool.tool === 8) {
        setTimeout(() => {
          const shapes = document.querySelectorAll("[shape-type]");
          shapes.forEach((element) => {
            showConnectionPoints(element);
          });
          setConnectingMode(true);
          // ✅ SUPPRIMER cet appel - c'est géré par le useEffect centralisé
          // updateSvgConnectionsWithLines(lines, elements);
        }, 100);
      } else {
        const dots = document.querySelectorAll(".connection-dot");
        dots.forEach((dot) => {
          dot.style.display = "none";
        });
        setConnectingMode(false);
      }
    }, [tool]);


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



            if (!isInitialRender.current) {
              if (propSetElements) propSetElements(newElements);
              if (onDataChange) onDataChange(newElements, lines);
            }
            return newElements;
          });
        } else {
          setElements(updaterFn);



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



            if (!isInitialRender.current) {
              if (propSetLines) propSetLines(newLines);
              if (onDataChange) onDataChange(elements, newLines);
            }
            return newLines;
          });
        } else {
          setLines(updaterFn);



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

    const connectionData = useMemo(() => {
      console.log('🔄 useMemo: Calcul des données de connexion');
      
      if (!lines || lines.length === 0) {
        console.log('🗑️ Aucune ligne - pas de connexions');
        return [];
      }
      
      if (!elements || elements.length === 0) {
        console.log('⚠️ Aucun élément - pas de connexions');
        return [];
      }
    
      // Utiliser les positions temporaires si disponibles pendant le déplacement
      const elementsWithTemp = elements.map(el => {
        if (tempPosition && tempPosition.id === el.id) {
          return {
            ...el,
            x: tempPosition.x,
            y: tempPosition.y
          };
        }
        return el;
      });
    
      // Créer une signature des éléments basée uniquement sur les propriétés qui affectent les connexions
      const elementsSignature = elementsWithTemp.map(el => ({
        id: el.id,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        type: el.type
      }));
    
      console.log('📊 Calcul connexions avec:', {
        lignes: lines.length,
        elements: elementsSignature.length,
        dragging: isDraggingRef.current
      });
    
      const newConnections = lines
        .map((line) => {
          try {
            const sourceElement = elementsSignature.find(el => el.id === line.source);
            const targetElement = elementsSignature.find(el => el.id === line.target);
    
            if (!sourceElement || !targetElement) {
              console.warn(`⚠️ Éléments manquants pour ligne ${line.id}`);
              return null;
            }
    
            // Calcul des positions
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
    
            const sourceShapeType = sourceElement.type;
            const targetShapeType = targetElement.type;
    
            let sourceX, sourceY, targetX, targetY;
    
            // Calcul du point source
            if (sourceShapeType === 3) {
              const sourceCenterX = sourceRect.left + sourceRect.width / 2;
              const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    
              switch (line.sourceSide) {
                case "top-right":
                  sourceX = sourceCenterX + Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                  sourceY = sourceCenterY - Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                  break;
                case "bottom-right":
                  sourceX = sourceCenterX + Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                  sourceY = sourceCenterY + Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                  break;
                case "bottom-left":
                  sourceX = sourceCenterX - Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                  sourceY = sourceCenterY + Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                  break;
                case "top-left":
                  sourceX = sourceCenterX - Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                  sourceY = sourceCenterY - Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                  break;
                default:
                  sourceX = sourceCenterX;
                  sourceY = sourceCenterY;
              }
            } else {
              switch (line.sourceSide) {
                case "top":
                  sourceX = sourceRect.left + sourceRect.width / 2;
                  sourceY = sourceRect.top;
                  break;
                case "right":
                  sourceX = sourceRect.right;
                  sourceY = sourceRect.top + sourceRect.height / 2;
                  break;
                case "bottom":
                  sourceX = sourceRect.left + sourceRect.width / 2;
                  sourceY = sourceRect.bottom;
                  break;
                case "left":
                  sourceX = sourceRect.left;
                  sourceY = sourceRect.top + sourceRect.height / 2;
                  break;
                default:
                  if (line.sourceSide && line.sourceSide.includes("top")) {
                    sourceY = sourceRect.top;
                  } else if (line.sourceSide && line.sourceSide.includes("bottom")) {
                    sourceY = sourceRect.bottom;
                  } else {
                    sourceY = sourceRect.top + sourceRect.height / 2;
                  }
    
                  if (line.sourceSide && line.sourceSide.includes("left")) {
                    sourceX = sourceRect.left;
                  } else if (line.sourceSide && line.sourceSide.includes("right")) {
                    sourceX = sourceRect.right;
                  } else {
                    sourceX = sourceRect.left + sourceRect.width / 2;
                  }
              }
            }
    
            // Calcul du point cible
            if (targetShapeType === 3) {
              const targetCenterX = targetRect.left + targetRect.width / 2;
              const targetCenterY = targetRect.top + targetRect.height / 2;
    
              switch (line.targetSide) {
                case "top-right":
                  targetX = targetCenterX + Math.cos(Math.PI / 4) * (targetRect.width / 2);
                  targetY = targetCenterY - Math.sin(Math.PI / 4) * (targetRect.height / 2);
                  break;
                case "bottom-right":
                  targetX = targetCenterX + Math.cos(Math.PI / 4) * (targetRect.width / 2);
                  targetY = targetCenterY + Math.sin(Math.PI / 4) * (targetRect.height / 2);
                  break;
                case "bottom-left":
                  targetX = targetCenterX - Math.cos(Math.PI / 4) * (targetRect.width / 2);
                  targetY = targetCenterY + Math.sin(Math.PI / 4) * (targetRect.height / 2);
                  break;
                case "top-left":
                  targetX = targetCenterX - Math.cos(Math.PI / 4) * (targetRect.width / 2);
                  targetY = targetCenterY - Math.sin(Math.PI / 4) * (targetRect.height / 2);
                  break;
                default:
                  targetX = targetCenterX;
                  targetY = targetCenterY;
              }
            } else {
              switch (line.targetSide) {
                case "top":
                  targetX = targetRect.left + targetRect.width / 2;
                  targetY = targetRect.top;
                  break;
                case "right":
                  targetX = targetRect.right;
                  targetY = targetRect.top + targetRect.height / 2;
                  break;
                case "bottom":
                  targetX = targetRect.left + targetRect.width / 2;
                  targetY = targetRect.bottom;
                  break;
                case "left":
                  targetX = targetRect.left;
                  targetY = targetRect.top + targetRect.height / 2;
                  break;
                default:
                  if (line.targetSide && line.targetSide.includes("top")) {
                    targetY = targetRect.top;
                  } else if (line.targetSide && line.targetSide.includes("bottom")) {
                    targetY = targetRect.bottom;
                  } else {
                    targetY = targetRect.top + targetRect.height / 2;
                  }
    
                  if (line.targetSide && line.targetSide.includes("left")) {
                    targetX = targetRect.left;
                  } else if (line.targetSide && line.targetSide.includes("right")) {
                    targetX = targetRect.right;
                  } else {
                    targetX = targetRect.left + targetRect.width / 2;
                  }
              }
            }
    
            if (isNaN(sourceX) || isNaN(sourceY) || isNaN(targetX) || isNaN(targetY)) {
              return null;
            }
    
            const controlDistance = Math.min(
              Math.abs(targetX - sourceX),
              Math.abs(targetY - sourceY)
            ) / 2 + 50;
    
            let sourceControlX, sourceControlY, targetControlX, targetControlY;
    
            // Points de contrôle pour les courbes de Bézier
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
    
      console.log(`✅ ${newConnections.length} connexions calculées via useMemo`);
      return newConnections;
    }, [
      // Dépendances intelligentes : seulement ce qui affecte vraiment les connexions
      lines.map(l => `${l.id}-${l.source}-${l.target}-${l.sourceSide}-${l.targetSide}`).join(','),
      elements.map(e => `${e.id}-${e.x}-${e.y}-${e.width}-${e.height}-${e.type}`).join(','),
      tempPosition // Ajouter tempPosition pour recalculer pendant le déplacement
    ]);




    useEffect(() => {
      console.log('🔄 Mise à jour SVG connections depuis useMemo');
      setSvgConnections(connectionData);
    }, [connectionData]);

    useEffect(() => {
      if (uuid) {
        console.log('🎯 Élément sélectionné:', uuid);
        // Ne pas déclencher de mise à jour des connexions ici
      }
    }, [uuid]);

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
      console.log('🔄 updateSvgConnections appelée (mais gérée par useMemo)');
      // Ne rien faire - tout est géré par le useMemo
    }, []);

    // Amélioration du déplacement avec liaisons

    // 2. Corriger setElementPosition pour éviter les conflits
    const setElementPosition = (e) => {
      if (!isDraggingRef.current || !draggedElementRef.current) return;
    
      const el = elements.find((el) => el.id === draggedElementRef.current);
      if (!el) return;
    
      // S'assurer que les positions sont des nombres
      const currentX = typeof el.x === 'number' ? el.x : parseInt(el.x) || 0;
      const currentY = typeof el.y === 'number' ? el.y : parseInt(el.y) || 0;
      
      const newX = currentX + e.movementX;
      const newY = currentY + e.movementY;
    
      console.log('🔄 Déplacement:', {
        elementId: el.id,
        currentPos: { x: currentX, y: currentY },
        movement: { x: e.movementX, y: e.movementY },
        newPos: { x: newX, y: newY }
      });
    
      // Mettre à jour la position temporaire
      setTempPosition({ id: el.id, x: newX, y: newY });
      
      // Mettre à jour le DOM directement pour un mouvement fluide
      const domElement = document.getElementById(el.id);
      if (domElement) {
        domElement.style.left = `${newX}px`;
        domElement.style.top = `${newY}px`;
      }
      
      // Débouncer la mise à jour des données
      if (updateConnectionsTimeoutRef.current) {
        clearTimeout(updateConnectionsTimeoutRef.current);
      }
      
      updateConnectionsTimeoutRef.current = setTimeout(() => {
        updateElementsAndPropagate((prevElements) => {
          return prevElements.map((element) => {
            if (element.id === draggedElementRef.current) {
              return {
                ...element,
                x: newX,
                y: newY,
              };
            }
            return element;
          });
        });
      }, 50);
    };




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
    
      console.log('🎯 Select élément:', id, 'Tool:', tool.tool);
    
      setUuid(id);
      
      if (tool.tool === 0) {
        // Mode déplacement
        setMouseIsDown(true);
        isDraggingRef.current = true;
        draggedElementRef.current = id;
        
        // Stocker la position initiale
        const element = elements.find(el => el.id === id);
        if (element) {
          initialDragPosition.current = {
            x: typeof element.x === 'number' ? element.x : parseInt(element.x) || 0,
            y: typeof element.y === 'number' ? element.y : parseInt(element.y) || 0
          };
        }
      }
    };
  

    // Nettoyage automatique des connexions orphelines
    const cleanupConnections = useCallback(() => {
      if (elements.length === 0) return;

      const elementIds = new Set(elements.map(el => el.id));

      const cleaned = lines.filter(line => {
        const isValid = elementIds.has(line.source) && elementIds.has(line.target);
        if (!isValid) {
          console.log("🗑️ Suppression ligne orpheline:", line.id);
        }
        return isValid;
      });

      setLines(cleaned);



      if (!isInitialRender.current) {
        if (propSetLines) propSetLines(cleaned);
        if (onDataChange) onDataChange(elements, cleaned);
      }

    }, [elements, lines, propSetLines, onDataChange, isInitialRender]);

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
    const findClosestDot = (x, y, dots) => {
      let closestDot = null;
      let minDistance = Infinity;
      
      dots.forEach((dot) => {
        const dotX = parseInt(dot.getAttribute("x"));
        const dotY = parseInt(dot.getAttribute("y"));
        
        const distance = Math.sqrt(
          Math.pow(x - dotX, 2) + Math.pow(y - dotY, 2)
        );
        
        if (distance < minDistance && distance < 25) { // Seuil de 25px
          minDistance = distance;
          closestDot = dot;
        }
      });
      
      return closestDot;
    };

    const mouseIsUp = () => {
      console.log('🔴 MouseUp - État du drag:', {
        isDragging: isDraggingRef.current,
        draggedElement: draggedElementRef.current,
        tempPosition: tempPosition
      });
    
      const wasDragging = isDraggingRef.current;
      const draggedId = draggedElementRef.current;
      
      // Réinitialiser les états de déplacement
      setMouseIsDown(false);
      isDraggingRef.current = false;
      
      // Si on était en train de déplacer
      if (wasDragging && draggedId) {
        // Annuler le timeout de mise à jour
        if (updateConnectionsTimeoutRef.current) {
          clearTimeout(updateConnectionsTimeoutRef.current);
          updateConnectionsTimeoutRef.current = null;
        }
        
        // Position finale à appliquer
        let finalX, finalY;
        
        // Utiliser tempPosition si disponible, sinon position DOM
        if (tempPosition && tempPosition.id === draggedId) {
          finalX = tempPosition.x;
          finalY = tempPosition.y;
        } else {
          const domElement = document.getElementById(draggedId);
          if (domElement) {
            finalX = parseInt(domElement.style.left) || 0;
            finalY = parseInt(domElement.style.top) || 0;
          }
        }
        
        // Appliquer le magnétisme à la grille si activé
        if (tool.tool === 0 && finalX !== undefined && finalY !== undefined) {
          const dotsContainer = document.getElementById("dotsContainer");
          const reference = document.getElementById(draggedId);
          
          if (reference && dotsContainer) {
            const dots = Array.from(dotsContainer.children);
            const closest = findClosestDot(finalX, finalY, dots);
            
            if (closest) {
              finalX = parseInt(closest.getAttribute("x"));
              finalY = parseInt(closest.getAttribute("y"));
              console.log('🧲 Magnétisme appliqué:', { x: finalX, y: finalY });
            }
          }
        }
        
        // Mise à jour finale de la position
        if (finalX !== undefined && finalY !== undefined) {
          updateElementsAndPropagate((prevElements) => {
            return prevElements.map((element) => {
              if (element.id === draggedId) {
                console.log('✅ Position finale appliquée:', { id: draggedId, x: finalX, y: finalY });
                return {
                  ...element,
                  x: finalX,
                  y: finalY,
                };
              }
              return element;
            });
          });
        }
        
        // Nettoyer les états temporaires
        setTempPosition(null);
        draggedElementRef.current = null;
        initialDragPosition.current = null;
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

    useEffect(() => {
      const logDragState = () => {
        console.log('📊 État du système de drag:', {
          isDragging: isDraggingRef.current,
          draggedElement: draggedElementRef.current,
          tempPosition: tempPosition,
          tool: tool.tool,
          isDown: isDown
        });
      };
      
      // Log toutes les 2 secondes pendant le développement
      const interval = setInterval(logDragState, 2000);
      
      return () => clearInterval(interval);
    }, [tempPosition, tool.tool, isDown]);

    return (
      <div style={{ flex: "auto" }}>
        <div
          id="boxs"
          onMouseMove={(e) => {
            if (isDraggingRef.current && tool.tool === 0) {
              setElementPosition(e);
            } else if (isDown && tool.tool !== 0 && tool.tool < 6) {
              setDimensions(e, false);
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
                width: `${canvasSize.width}px`,    // ✅ Taille complète du canvas
                height: `${canvasSize.height}px`,  // ✅ Taille complète du canvas
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
                    border: elementStyle.type == 5 ? "" : `${elementStyle.border.split(" ")[0]} solid ${elementStyle.borderColor || "gray"
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