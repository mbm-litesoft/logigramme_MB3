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
      borderColor: "gray", // Nouvelle propriété
      textColor: "black", // Nouvelle propriété
      textAlign: "center", // Nouvelle propriété
      textVerticalAlign: "middle", // Nouvelle propriété
      opacity: 1, // Nouvelle propriété (1 = 100%)
      x: 0,
      y: 0,
      radius: "15%",
      border: "1px solid gray",
      transform: "",
    });
    const [elements, setElements] = useState([]);
    const [lines, setLines] = useState([]);
    const [uuid, setUuid] = useState("");
    const [svgConnections, setSvgConnections] = useState([]); // État pour les connexions SVG
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

    // Par ces refs :
    const sourceElementRef = useRef(null);
    const sourceSideRef = useRef(null);
    const sourceDotRef = useRef(null);

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
      // Marqué comme n'étant plus le rendu initial
      isInitialRender.current = false;

      // Tâches de chargement initial
      let loadingTasks = 0;

      // 1. Rendre les connexions s'il y en a
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

      // 2. Créer le motif de points
      loadingTasks++;
      setTimeout(() => {
        createDotPattern();
        loadingTasks--;
        if (loadingTasks === 0 && !initializationComplete.current) {
          setIsInternallyLoaded(true);
          initializationComplete.current = true;
        }
      }, 100);

      // Si aucune tâche n'a été planifiée, marquer comme chargé
      if (loadingTasks === 0 && !initializationComplete.current) {
        setIsInternallyLoaded(true);
        initializationComplete.current = true;
      }

      // Garantir que le chargement est marqué comme terminé après un délai
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

    // Ajoutez cet useEffect au début de votre composant
    useEffect(() => {
      // Redessiner toutes les connexions existantes au chargement
      if (lines.length > 0) {
        console.log("Initial rendering of connections");
        setTimeout(() => {
          updateSvgConnections();
        }, 200);
      }
    }, []);

    // Effet qui se déclenche quand la prop tool change
    useEffect(() => {
      console.log("L'outil a changé:", tool);

      // Gestion de l'affichage des points de connexion
      if (tool.tool === 6 || tool.tool === 7 || tool.tool === 8) {
        // Afficher les points de connexion pour tous les outils de connexion
        setTimeout(() => {
          const shapes = document.querySelectorAll("[shape-type]");
          shapes.forEach((element) => {
            showConnectionPoints(element);
          });
          setConnectingMode(true);
          updateSvgConnections(); // Mettre à jour les connexions SVG
        }, 100);
      } else {
        // Cacher les points de connexion
        const dots = document.querySelectorAll(".connection-dot");
        dots.forEach((dot) => {
          dot.style.display = "none";
        });
        setConnectingMode(false);
      }
    }, [tool]);

    // Effet pour mettre à jour les SVG lorsque les éléments ou les lignes changent
    useEffect(() => {
      if (lines.length > 0) {
        updateSvgConnections();
      }
    }, [elements, lines]);

    // Ajoutez un useEffect pour gérer les événements mouseup au niveau du document
    useEffect(() => {
      const handleGlobalMouseUp = () => {
        if (isDown) {
          setMouseIsDown(false);
          // Exécutez toute autre logique nécessaire ici
        }
      };

      // Ajouter l'écouteur d'événements au document
      document.addEventListener("mouseup", handleGlobalMouseUp);

      // Nettoyer l'écouteur d'événements lors du démontage du composant
      return () => {
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }, [isDown]); // Dépendance sur isDown pour éviter des problèmes de stale closure

    // Réagir aux changements de zoom
    useEffect(() => {
      const container = document.querySelector(".openDiv");
      if (container && nzoom) {
        container.style.zoom = nzoom;

        // Recréer la grille de points après le zoom
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
              setTimeout(() => {
                if (propSetElements) propSetElements(newElements);
                if (onDataChange) onDataChange(newElements, lines);
              }, 0);
            }
            return newElements;
          });
        } else {
          setElements(updaterFn);

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

    // Fonction pour mettre à jour les lignes et propager au parent
    const updateLinesAndPropagate = useCallback(
      (updaterFn) => {
        if (typeof updaterFn === "function") {
          setLines((prevLines) => {
            const newLines = updaterFn(prevLines);

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

    // Mettre à jour les éléments lorsqu'ils changent dans le parent
    useEffect(() => {
      if (propElements && propElements !== elements) {
        setElements(propElements);
      }
    }, [propElements]);

    // Mettre à jour les lignes lorsqu'elles changent dans le parent
    useEffect(() => {
      if (propLines && propLines !== lines) {
        setLines(propLines);
      }
    }, [propLines]);

    // Exposer des méthodes au parent via ref
    useImperativeHandle(ref, () => ({
      updateData: (newElements, newLines) => {
        setElements(newElements);
        setLines(newLines);
      },
      createDotPattern, // Exposer la fonction createDotPattern au parent
      setTextElement, // Exposer cette fonction pour permettre l'édition de texte
    }));

    // Fonction pour créer et afficher les points de connexion en fonction du type de forme
    const showConnectionPoints = (element) => {
      if (!element) return;

      console.log("Showing connection points for:", element.id);

      try {
        // Supprimer les points existants pour éviter les doublons
        const existingDots = element.querySelectorAll(".connection-dot");
        existingDots.forEach((dot) => dot.remove());

        const shapeType = parseInt(element.getAttribute("shape-type"));
        const elementId = element.id;

        // Déterminer le nombre et la position des points en fonction du type de forme
        let positions = [];

        if (shapeType === 2) {
          // Cercle - 4 points (haut, droite, bas, gauche)
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
        } // Dans la fonction showConnectionPoints, pour le type 3 (losange)
        else if (shapeType === 3) {
          // Losange - 4 points (aux coins)
          const width = parseInt(element.style.width);
          const height = parseInt(element.style.height);

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
          // Rectangle ou parallélogramme - 8 points
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

        // Créer et ajouter les points de connexion
        positions.forEach((pos) => {
          const dot = document.createElement("div");
          dot.className = "connection-dot";
          dot.setAttribute("data-element-id", elementId);
          dot.setAttribute("data-side", pos.side);
          dot.setAttribute("id", `dot-${elementId}-${pos.side}`);

          // Style du point
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

          // Positionner le point
          Object.keys(pos).forEach((key) => {
            if (key !== "side") {
              dot.style[key] = pos[key];
            }
          });

          // Ajouter les gestionnaires d'événements pour la connexion
          dot.addEventListener("click", (e) => {
            e.stopPropagation();
            console.log("Dot clicked:", elementId, pos.side);
            handleDotClick(elementId, dot, pos.side);
          });

          dot.addEventListener("mouseover", () => {
            dot.style.backgroundColor = "#2980b9";
            dot.style.transform = `${pos.transform} scale(1.2)`;
          });

          dot.addEventListener("mouseout", () => {
            // Ne pas changer la couleur si c'est le point source sélectionné
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

        console.log("Connection points added:", positions.length);
      } catch (error) {
        console.error("Error showing connection points:", error);
      }
    };

    // Fonction pour mettre à jour les connexions SVG
    // Version améliorée avec ajustement précis des points pour le losange
    const updateSvgConnections = useCallback(() => {
      try {
        if (!lines || lines.length === 0) {
          setSvgConnections([]);
          return;
        }

        // Faire une copie profonde des lignes pour éviter les mutations
        const linesData = JSON.parse(JSON.stringify(lines));
        const containerRect = document
          .querySelector(".openDiv")
          ?.getBoundingClientRect();
        if (!containerRect) return;

        const newConnections = linesData
          .map((line) => {
            try {
              // Récupérer les éléments source et cible
              const sourceElement = document.getElementById(line.source);
              const targetElement = document.getElementById(line.target);

              if (!sourceElement || !targetElement) return null;

              // Obtenir les rectangles englobants
              const sourceRect = sourceElement.getBoundingClientRect();
              const targetRect = targetElement.getBoundingClientRect();

              // Obtenir les types de formes
              const sourceShapeType = parseInt(
                sourceElement.getAttribute("shape-type")
              );
              const targetShapeType = parseInt(
                targetElement.getAttribute("shape-type")
              );

              // Variables pour les points de connexion
              let sourceX, sourceY, targetX, targetY;

              // ===== CALCUL DU POINT SOURCE =====
              if (sourceShapeType === 3) {
                // Losange
                // Calcul spécial pour les losanges: prendre en compte la rotation
                const sourceCenterX =
                  sourceRect.left + sourceRect.width / 2 - containerRect.left;
                const sourceCenterY =
                  sourceRect.top + sourceRect.height / 2 - containerRect.top;

                // Calculer les coordonnées des coins en tenant compte de la rotation de 45 degrés
                switch (line.sourceSide) {
                  case "top-right":
                    // Position à droite du centre
                    sourceX =
                      sourceCenterX +
                      Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                    sourceY =
                      sourceCenterY -
                      Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                    break;
                  case "bottom-right":
                    // Position en bas à droite du centre
                    sourceX =
                      sourceCenterX +
                      Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                    sourceY =
                      sourceCenterY +
                      Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                    break;
                  case "bottom-left":
                    // Position en bas à gauche du centre
                    sourceX =
                      sourceCenterX -
                      Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                    sourceY =
                      sourceCenterY +
                      Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                    break;
                  case "top-left":
                    // Position en haut à gauche du centre
                    sourceX =
                      sourceCenterX -
                      Math.cos(Math.PI / 4) * (sourceRect.width / 2);
                    sourceY =
                      sourceCenterY -
                      Math.sin(Math.PI / 4) * (sourceRect.height / 2);
                    break;
                  default:
                    // Par défaut, utiliser le centre
                    sourceX = sourceCenterX;
                    sourceY = sourceCenterY;
                }
              } else {
                // Calcul standard pour les autres formes
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
                    // Points aux coins
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

              // ===== CALCUL DU POINT CIBLE =====
              if (targetShapeType === 3) {
                // Losange
                // Appliquer le même calcul spécial pour la cible si c'est un losange
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
                // Calcul standard pour les autres formes
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
                    // Points aux coins
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

              // Vérification que les points sont valides
              if (
                isNaN(sourceX) ||
                isNaN(sourceY) ||
                isNaN(targetX) ||
                isNaN(targetY)
              ) {
                return null;
              }

              // Calculer les points de contrôle pour la courbe Bézier
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
                  // Pour les coins, utiliser une direction diagonale
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
                  // Pour les coins, utiliser une direction diagonale
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

              // Créer le chemin SVG avec courbe de Bézier
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

        // Mettre à jour les connexions SVG
        if (newConnections.length > 0) {
          setSvgConnections(newConnections);
        }
      } catch (error) {
        console.error("Error in updateSvgConnections:", error);
      }
    }, [lines]);

    // Amélioration pour optimiser les mises à jour SVG pendant le déplacement
    const setElementPosition = (e) => {
      if (!isDown || !uuid) return;

      const el = elements.find((el) => el.id === uuid);
      if (!el) return;

      const currentElement = document.getElementById(uuid);
      const rect1 = currentElement.getBoundingClientRect();
      const rect3 = document.querySelector(".openDiv").getBoundingClientRect();

      // Vérifier les limites du conteneur
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

      // Calculer la nouvelle position potentielle
      const newX = parseInt(el.x) + e.movementX;
      const newY = parseInt(el.y) + e.movementY;
      const width = parseInt(el.width);
      const height = parseInt(el.height);

      // Vérifier les collisions avec les autres éléments
      if (canMove && !blockLeft && !blockRight && !blockTop && !blockBottom) {
        // Vérifier si la nouvelle position causerait un chevauchement avec un autre élément
        const wouldOverlap = elements.some((otherEl) => {
          // Ignorer l'élément lui-même
          if (otherEl.id === uuid) return false;

          const otherX = parseInt(otherEl.x);
          const otherY = parseInt(otherEl.y);
          const otherWidth = parseInt(otherEl.width);
          const otherHeight = parseInt(otherEl.height);

          // Détecter un chevauchement (formule standard de collision de rectangles)
          return (
            newX < otherX + otherWidth &&
            newX + width > otherX &&
            newY < otherY + otherHeight &&
            newY + height > otherY
          );
        });

        // Procéder au déplacement seulement s'il n'y a pas de chevauchement
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

          // Si l'élément déplacé est un losange, forcer une mise à jour des connexions
          const element = document.getElementById(uuid);
          if (element && parseInt(element.getAttribute("shape-type")) === 3) {
            // Forcer une mise à jour complète des connexions après le déplacement d'un losange
            requestAnimationFrame(() => {
              updateSvgConnections();
            });
          }
        }
      }

      // Détecter quand on peut débloquer
      if (blockLeft && e.movementX > 0) {
        setBlockLeft(false);
      } else if (blockRight && e.movementX < 0) {
        setBlockRight(false);
      } else if (blockTop && e.movementY > 0) {
        setBlockTop(false);
      } else if (blockBottom && e.movementY < 0) {
        setBlockBottom(false);
      }

      // Mettre à jour les connexions SVG après déplacement avec requestAnimationFrame
      if (lines.length > 0) {
        // Utiliser une approche de throttling pour les mises à jour
        if (window.svgUpdateRequest) {
          cancelAnimationFrame(window.svgUpdateRequest);
        }
        window.svgUpdateRequest = requestAnimationFrame(() => {
          updateSvgConnections();
          window.svgUpdateRequest = null;
        });
      }
    };

    // Remplacez votre useEffect pour les lignes avec ceci:
    useEffect(() => {
      if (lines.length > 0) {
        // Utiliser un seul setTimeout, avec un délai raisonnable
        const timer = setTimeout(() => {
          updateSvgConnections();
        }, 100);

        return () => clearTimeout(timer); // Nettoyer le timeout si le composant est démonté
      }
    }, [lines, elements, updateSvgConnections]);

    // Modifiez votre fonction handleDotClick pour utiliser un seul setTimeout:
    const handleDotClick = (elementId, dot, side) => {
      if (!sourceElementRef.current) {
        // Premier clic - sélectionner le point de départ
        sourceElementRef.current = elementId;
        sourceSideRef.current = side;
        sourceDotRef.current = dot;
        dot.style.backgroundColor = "#e74c3c";
        console.log("Source set:", elementId, side);
      } else {
        // Deuxième clic - créer la connexion seulement si on clique sur un élément différent
        if (sourceElementRef.current !== elementId) {
          const targetElementId = elementId;
          const targetSide = side;

          // Créer une nouvelle ligne avec un ID unique
          const lineId = uuidv4();
          console.log(
            "Creating new line:",
            sourceElementRef.current,
            sourceSideRef.current,
            "to",
            targetElementId,
            targetSide
          );

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
            newLine.sourceOffset = { x: 0, y: 0 }; // Ajustez ces valeurs selon vos besoins
          }

          if (
            targetElement &&
            targetElement.getAttribute("shape-type") === "4"
          ) {
            newLine.targetOffset = { x: 0, y: 0 }; // Ajustez ces valeurs selon vos besoins
          }
          // Ajouter la nouvelle ligne à la liste des lignes
          updateLinesAndPropagate((prevLines) => [...prevLines, newLine]);
        }

        // Réinitialiser la sélection dans tous les cas
        if (sourceDotRef.current) {
          sourceDotRef.current.style.backgroundColor = "#3498db"; // Remettre le point source à sa couleur d'origine
        }
        sourceElementRef.current = null;
        sourceSideRef.current = null;
        sourceDotRef.current = null;
      }
    };

    // Fonction optimisée pour créer un modèle de points sur la grille
    const createDotPattern = useCallback(() => {
      // Limiter la fréquence de création de points (éviter les recréations trop fréquentes)
      const now = Date.now();
      if (now - lastDotGridUpdate.current < 200) {
        return;
      }
      lastDotGridUpdate.current = now;

      // Supprimer l'ancien motif de points si existant
      const existingDotsContainer = document.getElementById("dotsContainer");
      if (existingDotsContainer) {
        existingDotsContainer.remove();
      }

      const dotBgColor = "#D0D0D0";

      // Créer un conteneur pour les points
      const dotContainer = document.createElement("div");
      dotContainer.style.position = "absolute";
      dotContainer.style.top = "0";
      dotContainer.style.left = "0";
      dotContainer.style.width = "100%";
      dotContainer.style.height = "100%";
      dotContainer.style.pointerEvents = "none";
      dotContainer.id = "dotsContainer";

      // Récupérer les dimensions visibles
      const containerEl = document.querySelector(".openDiv");
      if (!containerEl) return;

      // Obtenir le zoom actuel (depuis l'élément ou l'état)
      const currentZoom =
        parseFloat(containerEl.style.zoom || "100") / 100 || 1;

      // Obtenir les dimensions réelles de la zone visible
      const containerRect = containerEl.getBoundingClientRect();
      const scrollLeft = containerEl.scrollLeft;
      const scrollTop = containerEl.scrollTop;

      // Calculer les dimensions de la zone visible en tenant compte du zoom
      const visibleWidth = containerRect.width / currentZoom;
      const visibleHeight = containerRect.height / currentZoom;

      // Définir l'espacement entre les points, ajusté en fonction du zoom
      // Plus le zoom est petit, plus l'espacement sera grand pour éviter trop de points
      const baseSpacing = 25;
      const spacing = Math.max(
        baseSpacing,
        (baseSpacing / Math.max(0.1, currentZoom)) * 0.5
      );

      // Calculer les limites de la zone à couvrir (visible + marge)
      // Convertir les coordonnées de défilement en coordonnées de grille
      const startX = Math.floor(scrollLeft / spacing) * spacing;
      const startY = Math.floor(scrollTop / spacing) * spacing;

      // Ajouter une marge (2x) pour éviter les vides lors du défilement
      const endX =
        Math.ceil((scrollLeft + visibleWidth * 2) / spacing) * spacing;
      const endY =
        Math.ceil((scrollTop + visibleHeight * 2) / spacing) * spacing;

      // Calculer le nombre de points à créer
      const dotsX = Math.floor((endX - startX) / spacing) + 1;
      const dotsY = Math.floor((endY - startY) / spacing) + 1;

      console.log(
        `Création de la grille: ${dotsX}x${dotsY} points avec espacement ${Math.round(
          spacing
        )}px au zoom ${currentZoom}`
      );

      // Traiter les points par lots pour optimiser les performances
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

      // Traiter les points restants
      if (batch.length > 0) {
        processDotBatch(batch, dotContainer, dotBgColor, setDotPosition);
      }

      // Ajouter le conteneur au document
      const openDiv = document.querySelector(".openDiv");
      if (openDiv) {
        openDiv.appendChild(dotContainer);
      }
    }, []);

    // Fonction d'aide pour traiter un lot de points
    const processDotBatch = (batch, container, dotBgColor, setDotPosition) => {
      batch.forEach((dotData) => {
        const dot = document.createElement("div");

        // Style du point
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

        // Optimisation du gestionnaire d'événements
        dot.addEventListener("mouseover", function () {
          setDotPosition([this.getAttribute("x"), this.getAttribute("y")]);
        });

        container.appendChild(dot);
      });
    };

    const select = (e, id) => {
      setMouseIsDown(true);
      setUuid(id);
    };

    const mouseIsDown = (e) => {
      if (tool.tool !== 0 && tool.tool < 6) {
        setMouseIsDown(true);

        // Générer un nouvel UUID pour cet élément
        const newId = uuidv4();

        // Récupérer les coordonnées du point sélectionné
        const initialX = parseInt(dotPosition[0]);
        const initialY = parseInt(dotPosition[1]);
        const width = defaultDimensions.current.width;
        const height = defaultDimensions.current.height;

        // Vérifier s'il y a chevauchement avec des éléments existants
        const isOverlapping = (x, y) => {
          return elements.some((element) => {
            const elX = parseInt(element.x);
            const elY = parseInt(element.y);
            const elWidth = parseInt(element.width || width);
            const elHeight = parseInt(element.height || height);

            // Vérifier le chevauchement
            return (
              x < elX + elWidth &&
              x + width > elX &&
              y < elY + elHeight &&
              y + height > elY
            );
          });
        };

        // Trouver la position libre la plus proche
        let finalX = initialX;
        let finalY = initialY;

        // Si la position initiale est occupée, chercher une position libre
        if (isOverlapping(initialX, initialY)) {
          // Vérifier les positions autour en spirale (avec un maximum de 10 itérations)
          const spacing = 25; // Espacement entre les points
          let found = false;

          for (let distance = 1; distance <= 10 && !found; distance++) {
            // Vérifier les positions en formant un carré autour du point initial
            // Haut
            for (let i = -distance; i <= distance && !found; i++) {
              const x = initialX + i * spacing;
              const y = initialY - distance * spacing;
              if (!isOverlapping(x, y)) {
                finalX = x;
                finalY = y;
                found = true;
              }
            }

            // Droite
            for (let i = -distance + 1; i <= distance && !found; i++) {
              const x = initialX + distance * spacing;
              const y = initialY + i * spacing;
              if (!isOverlapping(x, y)) {
                finalX = x;
                finalY = y;
                found = true;
              }
            }

            // Bas
            for (let i = distance - 1; i >= -distance && !found; i--) {
              const x = initialX + i * spacing;
              const y = initialY + distance * spacing;
              if (!isOverlapping(x, y)) {
                finalX = x;
                finalY = y;
                found = true;
              }
            }

            // Gauche
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

        // Définir une forme avec dimensions par défaut
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

        // Appliquer le type de forme
        switch (tool.tool) {
          case 1: // Rectangle
            newShape = {
              ...newShape,
              type: 1,
              radius: "15%",
              transform: "",
            };
            break;
          case 2: // Cercle
            newShape = {
              ...newShape,
              type: 2,
              radius: "50%",
              transform: "",
            };
            break;
          case 3: // Polygone/diamant
            newShape = {
              ...newShape,
              type: 3,
              radius: "5%",
              transform: "rotate(45deg)",
            };
            break;
          case 4: // Parallélogramme
            newShape = {
              ...newShape,
              type: 4,
              radius: "5%",
              transform: "skewX(-15deg)",
            };
            break;
          case 5: // Autre forme
            newShape = {
              ...newShape,
              type: 5,
              width: newShape.width + 5,
              height: newShape.height + 5,
              bgColor: "none",
              border: "none",
            };
            break;
          default:
            newShape = {
              ...newShape,
              type: 0,
            };
            break;
        }

        // Mettre à jour le style actuel
        setStyle(newShape);

        // Ajouter l'élément au tableau
        updateElementsAndPropagate((prevElements) => [
          ...prevElements,
          newShape,
        ]);

        // Stocker l'UUID pour le dimensionnement
        setUuid(newId);
      }
    };

    const findClosestElement = (referenceElement, elements) => {
      if (!elements.length || referenceElement == null) return null;

      // Obtenir la position de l'élément de référence
      const refRect = referenceElement.getBoundingClientRect();
      const refX = refRect.left;
      const refY = refRect.top;

      let closestElement = elements[0];
      let minDistance = Infinity;

      // Parcourir tous les éléments et trouver le plus proche
      elements.forEach((element) => {
        // Ignorer l'élément de référence s'il est dans la liste
        if (element === referenceElement) return;

        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // Calculer la distance euclidienne
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

      // Si l'outil d'alignement est actif, aligner à la grille
      if (tool.tool === 0 && uuid) {
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

      // Mettre à jour les connexions si nécessaire
      if (lines.length > 0) {
        setTimeout(() => {
          updateSvgConnections();
        }, 100);
      }
    };

    const setDimensions = (e, active) => {
      console.log(tool, "dsfds");
      if (
        (isDown && tool.tool !== 0 && tool.tool < 6 && tool.tool != -1) ||
        active
      ) {
        const number = 25; // Incrément de taille

        // Mettre à jour le style local en fonction du type d'outil
        if (tool.tool === 2 || tool.tool === 3) {
          // Cercle ou Losange - même largeur et hauteur
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
          // Rectangle, Parallélogramme ou Autre - dimensions indépendantes
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

        // Mettre à jour l'élément actif dans le tableau
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
      if (!text) return "14px"; // Taille par défaut

      // Calculer la taille de base en fonction de la largeur disponible
      const baseSize = Math.min(width / (text.length * 0.7), height / 2);

      // Limiter la taille dans une plage raisonnable (entre 9px et 20px)
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
              // Vérifier si on peut créer un nouvel élément
              if (tool.tool > 0 && tool.tool < 6) {
                mouseIsDown(e);
              } else if (tool.tool == -1) {
                const inputElement = document.getElementById("input" + uuid);
                if (inputElement) {
                  inputElement.style.zIndex = "3";
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
              zoom: nzoom, // Utiliser la valeur de zoom du parent
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
                    // Créez la flèche pour les outils 6 et 7
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
                    // Flèche standard (outil 6)
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
                    // Ligne pointillée avec flèche (outil 7)
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
                    // Points sans flèche (outil 8)
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
      onMouseDown={(e) => select(e, elementStyle.id)}
      style={{
        position: "absolute",
        left: `${elementStyle.x}px`,
        top: `${elementStyle.y}px`,
        width: `${elementStyle.width}px`,
        height: `${elementStyle.height}px`,
        borderRadius: elementStyle.radius,
        border: `${elementStyle.border.split(' ')[0]} solid ${elementStyle.borderColor || 'gray'}`,
        backgroundColor: elementStyle.bgColor,
        opacity: elementStyle.opacity !== undefined ? elementStyle.opacity : 1,
        transform: elementStyle.transform,
        cursor: tool.tool === 0 ? "move" : "default",
        zIndex: "2",
      }}
      shape-type={elementStyle.type}
    >
      {(() => {
        let topPosition = "50%";
        let translateY = "-50%";
        let transformOrigin = "center";
        
        if (elementStyle.textVerticalAlign === "top") {
          topPosition = "0";
          translateY = "0";
          transformOrigin = "top center";
        } else if (elementStyle.textVerticalAlign === "bottom") {
          topPosition = "100%";
          translateY = "-100%";
          transformOrigin = "bottom center";
        }
        
        // Déterminer la transformation de base sans la rotation/skew
        let baseTransform = `translate(-50%, ${translateY})`;
        
        // Ajouter les transformations spécifiques selon le type d'élément
        let additionalTransform = "";
        if (elementStyle.transform) {
          if (elementStyle.transform.includes("rotate")) {
            additionalTransform = " rotate(-45deg)";
          } else if (elementStyle.transform.includes("skew")) {
            additionalTransform = " skewX(15deg)";
          }
        }
        
        return (
          <textarea
            onMouseDown={(e) => select(e, elementStyle.id)}
            id={"input" + elementStyle.id}
            className="text-dark shape-input"
            style={{
              position: "absolute",
              width: `${elementStyle.width - 25}px`,
              height: `${elementStyle.height - 25}px`,
              border: "none",
              borderRadius: elementStyle.radius,
              backgroundColor: "transparent",
              top: topPosition,
              left: "50%",
              transformOrigin: transformOrigin,
              transform: baseTransform + additionalTransform,
              textAlign: elementStyle.textAlign || "center",
              color: elementStyle.textColor || "black",
              display: "block",
              opacity: elementStyle.text ? "1" : "0.7",
              resize: "none",
              overflow: "auto",
              padding: "5px",
              lineHeight: "1.2",
              fontSize: calculateFontSize(
                elementStyle.text || "",
                elementStyle.width - 25,
                elementStyle.height - 25
              ),
            }}
            onChange={() => setTextElement()}
            value={elementStyle.text || ""}
          />
        );
      })()}
    </div>
  ))}
          </div>
        </div>
      </div>
    );
  }
);

export default MainLogigramme;
