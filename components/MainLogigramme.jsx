"use client";
import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { PopoverPicker } from "./PopoverPicker";
import { HexColorPicker } from "react-colorful";

const MainLogigramme = forwardRef(({ tool, onUuidChange, onDataChange, elements: propElements, lines: propLines, setElements: propSetElements, setLines: propSetLines, onLoadComplete }, ref) => {
  // États principaux
  const [isDown, setMouseIsDown] = useState(false);
  const [style, setStyle] = useState({
    id: "",
    type: 0,
    width: 103,
    height: 103,
    bgColor: "white",
    x: 0,
    y: 0,
    radius: "15%",
    border: "1px solid gray",
    transform: "",
  });

  // États de chargement et d'initialisation
  const [isInternallyLoaded, setIsInternallyLoaded] = useState(false);
  const isInitialRender = useRef(true);
  const initializationComplete = useRef(false);

  // États pour le sélecteur de couleur
  const [isOpen, setIsOpen] = useState(false);
  const popover = useRef();
  const [topValue, setTopValue] = useState(0);
  const [leftValue, setLeftValue] = useState(0);
  const [color, setColor] = useState("#ffffff");

  // États pour les éléments et connexions
  const [elements, setElements] = useState([]);
  const [lines, setLines] = useState([]);
  const [uuid, setUuid] = useState("");
  const [svgConnections, setSvgConnections] = useState([]);

  // États pour le placement des éléments
  const [dotPosition, setDotPosition] = useState([0, 0]);
  const [connectingMode, setConnectingMode] = useState(false);
  const [sourceElement, setSourceElement] = useState(null);
  const [sourceDot, setSourceDot] = useState(null);

  // Références
  const dotSelected = useRef(false);
  const defaultDimensions = useRef({ width: 103, height: 103 });
  const sourceElementRef = useRef(null);
  const sourceSideRef = useRef(null);
  const sourceDotRef = useRef(null);
  const containerRef = useRef(null);
  const dotPatternCreationTimeout = useRef(null);
  const svgConnectionsUpdateTimeout = useRef(null);
  const lastDotGridUpdate = useRef(0);

  // Taille du canvas
  const [canvasSize] = useState({
    width: 5000,
    height: 5000,
  });


  // État du zoom
  const [nzoom, setNzoom] = useState("100%");

  useEffect(() => {
    const trackMousePosition = (e) => {
      window.mousePosition = { x: e.clientX, y: e.clientY };
    };

    document.addEventListener('mousemove', trackMousePosition);

    return () => {
      document.removeEventListener('mousemove', trackMousePosition);
    };
  }, []);

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

  // Notifier le parent du changement d'UUID
  useEffect(() => {
    if (uuid) {
      onUuidChange(uuid);
    }
  }, [uuid, onUuidChange]);

  // Dessiner les connexions existantes au chargement
  useEffect(() => {
    if (lines.length > 0) {
      setTimeout(() => {
        updateSvgConnections();
      }, 200);
    }
  }, []);

  // Gérer les changements d'outil
  useEffect(() => {
    // Gestion des points de connexion
    if (tool.tool === 6 || tool.tool === 7 || tool.tool === 8) {
      // Afficher les points de connexion pour les outils de connexion
      setTimeout(() => {
        const shapes = document.querySelectorAll("[shape-type]");
        shapes.forEach((element) => {
          showConnectionPoints(element);
        });
        setConnectingMode(true);
        updateSvgConnections();
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

  // Mettre à jour les connexions SVG lorsque les éléments ou lignes changent
  useEffect(() => {
    if (lines.length > 0) {
      updateSvgConnections();
    }
  }, [elements, lines]);

  // Gérer les événements mouseup au niveau du document
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDown) {
        setMouseIsDown(false);
      }
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDown]);

  // Fonction de sauvegarde en JSON
  function saveToJson() {
    const saveData = {
      elements: elements,
      lines: lines
    };

    const jsonString = JSON.stringify(saveData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "logigramme.json";

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  // Fonction pour afficher les points de connexion sur les éléments
  const showConnectionPoints = (element) => {
    if (!element) return;

    try {
      // Supprimer les points existants pour éviter les doublons
      const existingDots = element.querySelectorAll(".connection-dot");
      existingDots.forEach((dot) => dot.remove());

      const shapeType = parseInt(element.getAttribute("shape-type"));
      const elementId = element.id;

      // Déterminer la position des points en fonction du type de forme
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
      } else if (shapeType === 3) {
        // Losange - 4 points (au milieu des côtés, pas aux sommets)
        positions = [
          {
            side: "top",
            top: "-7%",
            left: "50%",
            transform: "translateX(-50%)",
          },
          {
            side: "right",
            top: "50%",
            right: "-7%",
            transform: "translateY(-50%)",
          },
          {
            side: "bottom",
            bottom: "-7%",
            left: "50%",
            transform: "translateX(-50%)",
          },
          {
            side: "left",
            top: "50%",
            left: "-7%",
            transform: "translateY(-50%)",
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

        // Gestionnaires d'événements
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
      console.error("Erreur lors de l'affichage des points de connexion:", error);
    }
  };

  // Mise à jour des connexions SVG
  const updateSvgConnections = useCallback(() => {
    // Fonction utilitaire pour obtenir les coordonnées d'un point de connexion
    function getConnectionPoint(
      elementId,
      side,
      shapeType,
      rect,
      containerRect
    ) {
      const centerX = rect.left + rect.width / 2 - containerRect.left;
      const centerY = rect.top + rect.height / 2 - containerRect.top;

      // Coordonnées par défaut
      let x = centerX;
      let y = centerY;

      // Points pour les losanges (rotation 45°)
      if (shapeType === 3) {
        switch (side) {
          case "top":
            x = centerX;
            y = rect.top - containerRect.top;
            break;
          case "right":
            x = rect.right - containerRect.left;
            y = centerY;
            break;
          case "bottom":
            x = centerX;
            y = rect.bottom - containerRect.top;
            break;
          case "left":
            x = rect.left - containerRect.left;
            y = centerY;
            break;
          default:
            x = centerX;
            y = centerY;
        }
      } else {
        // Points standard pour les autres formes
        switch (side) {
          case "top":
            x = centerX;
            y = rect.top - containerRect.top;
            break;
          case "right":
            x = rect.right - containerRect.left;
            y = centerY;
            break;
          case "bottom":
            x = centerX;
            y = rect.bottom - containerRect.top;
            break;
          case "left":
            x = rect.left - containerRect.left;
            y = centerY;
            break;
          case "top-right":
            x = rect.right - containerRect.left;
            y = rect.top - containerRect.top;
            break;
          case "bottom-right":
            x = rect.right - containerRect.left;
            y = rect.bottom - containerRect.top;
            break;
          case "bottom-left":
            x = rect.left - containerRect.left;
            y = rect.bottom - containerRect.top;
            break;
          case "top-left":
            x = rect.left - containerRect.left;
            y = rect.top - containerRect.top;
            break;
        }
      }

      return { x, y };
    }

    try {
      // Annuler toute mise à jour planifiée
      if (svgConnectionsUpdateTimeout.current) {
        clearTimeout(svgConnectionsUpdateTimeout.current);
      }

      if (!lines || lines.length === 0) {
        setSvgConnections([]);
        return;
      }

      const linesData = [...lines];
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

            // Récupérer les types de formes
            const sourceShapeType =
              parseInt(sourceElement.getAttribute("shape-type")) || 0;
            const targetShapeType =
              parseInt(targetElement.getAttribute("shape-type")) || 0;

            // Obtenir les rectangles englobants
            const sourceRect = sourceElement.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();

            // Obtenir les points de connexion
            const sourcePoint = getConnectionPoint(
              line.source,
              line.sourceSide,
              sourceShapeType,
              sourceRect,
              containerRect
            );
            const targetPoint = getConnectionPoint(
              line.target,
              line.targetSide,
              targetShapeType,
              targetRect,
              containerRect
            );

            // Vérification de validité des points
            if (
              !sourcePoint ||
              !targetPoint ||
              isNaN(sourcePoint.x) ||
              isNaN(sourcePoint.y) ||
              isNaN(targetPoint.x) ||
              isNaN(targetPoint.y)
            ) {
              return null;
            }

            // Calculer les points de contrôle pour la courbe Bézier
            const controlDistance =
              Math.min(
                Math.abs(targetPoint.x - sourcePoint.x),
                Math.abs(targetPoint.y - sourcePoint.y)
              ) / 2 + 50;

            // Déterminer les points de contrôle selon le type de forme et le côté
            let sourceControlX, sourceControlY, targetControlX, targetControlY;

            // Points de contrôle pour la source
            if (sourceShapeType === 3) {
              // Points de contrôle pour le losange
              switch (line.sourceSide) {
                case "top-right":
                  sourceControlX = sourcePoint.x + controlDistance;
                  sourceControlY = sourcePoint.y;
                  break;
                case "bottom-right":
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y + controlDistance;
                  break;
                case "bottom-left":
                  sourceControlX = sourcePoint.x - controlDistance;
                  sourceControlY = sourcePoint.y;
                  break;
                case "top-left":
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y - controlDistance;
                  break;
                default:
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y;
              }
            } else if (sourceShapeType === 4) {
              // Points de contrôle pour le parallélogramme
              const skewAngle = Math.PI / 12; // 15 degrés en radians

              switch (line.sourceSide) {
                case "top":
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y - controlDistance;
                  break;
                case "right":
                  sourceControlX = sourcePoint.x + controlDistance;
                  sourceControlY = sourcePoint.y;
                  break;
                case "bottom":
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y + controlDistance;
                  break;
                case "left":
                  sourceControlX = sourcePoint.x - controlDistance;
                  sourceControlY = sourcePoint.y;
                  break;
                default:
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y;
              }
            } else {
              // Points de contrôle standard pour les autres formes
              switch (line.sourceSide) {
                case "top":
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y - controlDistance;
                  break;
                case "right":
                  sourceControlX = sourcePoint.x + controlDistance;
                  sourceControlY = sourcePoint.y;
                  break;
                case "bottom":
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y + controlDistance;
                  break;
                case "left":
                  sourceControlX = sourcePoint.x - controlDistance;
                  sourceControlY = sourcePoint.y;
                  break;
                case "top-right":
                  sourceControlX = sourcePoint.x + controlDistance / 2;
                  sourceControlY = sourcePoint.y - controlDistance / 2;
                  break;
                case "bottom-right":
                  sourceControlX = sourcePoint.x + controlDistance / 2;
                  sourceControlY = sourcePoint.y + controlDistance / 2;
                  break;
                case "bottom-left":
                  sourceControlX = sourcePoint.x - controlDistance / 2;
                  sourceControlY = sourcePoint.y + controlDistance / 2;
                  break;
                case "top-left":
                  sourceControlX = sourcePoint.x - controlDistance / 2;
                  sourceControlY = sourcePoint.y - controlDistance / 2;
                  break;
                default:
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y;
              }
            }

            // Points de contrôle pour la cible
            if (targetShapeType === 3) {
              // Points de contrôle pour le losange
              switch (line.targetSide) {
                case "top-right":
                  targetControlX = targetPoint.x + controlDistance;
                  targetControlY = targetPoint.y;
                  break;
                case "bottom-right":
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y + controlDistance;
                  break;
                case "bottom-left":
                  targetControlX = targetPoint.x - controlDistance;
                  targetControlY = targetPoint.y;
                  break;
                case "top-left":
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y - controlDistance;
                  break;
                default:
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y;
              }
            } else if (targetShapeType === 4) {
              // Points de contrôle pour le parallélogramme
              const skewAngle = Math.PI / 12; // 15 degrés en radians

              switch (line.targetSide) {
                case "top":
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y - controlDistance;
                  break;
                case "right":
                  targetControlX = targetPoint.x + controlDistance;
                  targetControlY = targetPoint.y;
                  break;
                case "bottom":
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y + controlDistance;
                  break;
                case "left":
                  targetControlX = targetPoint.x - controlDistance;
                  targetControlY = targetPoint.y;
                  break;
                case "top-right":
                  targetControlX = targetPoint.x + controlDistance * Math.cos(skewAngle);
                  targetControlY = targetPoint.y - controlDistance * Math.sin(skewAngle);
                  break;
                case "bottom-right":
                  targetControlX = targetPoint.x + controlDistance * Math.cos(-skewAngle);
                  targetControlY = targetPoint.y + controlDistance * Math.sin(-skewAngle);
                  break;
                case "bottom-left":
                  targetControlX = targetPoint.x - controlDistance * Math.cos(skewAngle);
                  targetControlY = targetPoint.y + controlDistance * Math.sin(skewAngle);
                  break;
                case "top-left":
                  targetControlX = targetPoint.x - controlDistance * Math.cos(-skewAngle);
                  targetControlY = targetPoint.y - controlDistance * Math.sin(-skewAngle);
                  break;
                default:
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y;
              }
            } else {
              // Points de contrôle standard pour les autres formes
              switch (line.targetSide) {
                case "top":
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y - controlDistance;
                  break;
                case "right":
                  targetControlX = targetPoint.x + controlDistance;
                  targetControlY = targetPoint.y;
                  break;
                case "bottom":
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y + controlDistance;
                  break;
                case "left":
                  targetControlX = targetPoint.x - controlDistance;
                  targetControlY = targetPoint.y;
                  break;
                case "top-right":
                  targetControlX = targetPoint.x + controlDistance / 2;
                  targetControlY = targetPoint.y - controlDistance / 2;
                  break;
                case "bottom-right":
                  targetControlX = targetPoint.x + controlDistance / 2;
                  targetControlY = targetPoint.y + controlDistance / 2;
                  break;
                case "bottom-left":
                  targetControlX = targetPoint.x - controlDistance / 2;
                  targetControlY = targetPoint.y + controlDistance / 2;
                  break;
                case "top-left":
                  targetControlX = targetPoint.x - controlDistance / 2;
                  targetControlY = targetPoint.y - controlDistance / 2;
                  break;
                default:
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y;
              }
            }

            // Créer le chemin SVG avec courbe de Bézier
            const path = `M ${sourcePoint.x},${sourcePoint.y} C ${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetPoint.x},${targetPoint.y}`;

            return {
              id: line.id,
              path,
              color: line.color || "#2c3e50",
              thickness: line.thickness || 2,
              toolType: line.toolType,
            };
          } catch (error) {
            console.error("Erreur de calcul de connexion:", error);
            return null;
          }
        })
        .filter((conn) => conn !== null);

      // Mettre à jour les connexions SVG seulement si on a des connexions valides
      if (newConnections.length > 0) {
        setSvgConnections(newConnections);
      }
    } catch (error) {
      console.error("Erreur dans updateSvgConnections:", error);
    }
  }, [lines]);

  // Mettre à jour les connexions SVG quand les lignes changent
  useEffect(() => {
    if (lines.length > 0) {
      // Utiliser un debounce pour éviter trop de mises à jour
      if (svgConnectionsUpdateTimeout.current) {
        clearTimeout(svgConnectionsUpdateTimeout.current);
      }

      svgConnectionsUpdateTimeout.current = setTimeout(() => {
        updateSvgConnections();
      }, 100);

      return () => {
        if (svgConnectionsUpdateTimeout.current) {
          clearTimeout(svgConnectionsUpdateTimeout.current);
        }
      };
    }
  }, [lines, elements, updateSvgConnections]);

  // Gestion des clics sur les points de connexion
  const handleDotClick = (elementId, dot, side) => {

    if (!sourceElementRef.current) {
      // Premier clic - sélectionner le point de départ
      sourceElementRef.current = elementId;
      sourceSideRef.current = side;
      sourceDotRef.current = dot;
      dot.style.backgroundColor = "#e74c3c";
    } else {
      // Deuxième clic - créer la connexion seulement si on clique sur un élément différent
      if (sourceElementRef.current !== elementId) {
        const targetElementId = elementId;
        const targetSide = side;

        // Créer une nouvelle ligne avec un ID unique
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

        // Ajouter des offsets spécifiques pour le parallélogramme
        const sourceElement = document.getElementById(sourceElementRef.current);
        const targetElement = document.getElementById(targetElementId);

        if (sourceElement && sourceElement.getAttribute("shape-type") === "4") {
          newLine.sourceOffset = { x: 0, y: 0 };
        }

        if (targetElement && targetElement.getAttribute("shape-type") === "4") {
          newLine.targetOffset = { x: 0, y: 0 };
        }

        // Ajouter la nouvelle ligne
        updateLinesAndPropagate((prevLines) => [...prevLines, newLine]);
      }


      // Réinitialiser la sélection
      if (sourceDotRef.current) {
        sourceDotRef.current.style.backgroundColor = "#3498db";
      }
      sourceElementRef.current = null;
      sourceSideRef.current = null;
      sourceDotRef.current = null;
    }

  };
  useEffect(() => {
    if (lines && lines.length > 0) {
      // Utiliser un court délai pour s'assurer que le DOM est à jour
      setTimeout(() => {
        updateSvgConnections();
      }, 100);
    }
  }, [lines, updateSvgConnections]);

  // Création optimisée des points de la grille
  // Création optimisée des points de la grille
  const createDotPattern = useCallback(() => {
    // Limiter la fréquence de création de points (éviter les recréations trop fréquentes)
    const now = Date.now();
    if (now - lastDotGridUpdate.current < 200) {
      return;
    }
    lastDotGridUpdate.current = now;

    const dotBgColor = "#00000050";

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
    const containerEl = containerRef.current;
    if (!containerEl) return;

    // Obtenir le zoom actuel (depuis l'élément ou l'état)
    const currentZoom = parseFloat(containerEl.style.zoom || "100") / 100 || 1;

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
    const spacing = Math.max(baseSpacing, baseSpacing / Math.max(0.1, currentZoom) * 0.5);

    // Calculer les limites de la zone à couvrir (visible + marge)
    // Convertir les coordonnées de défilement en coordonnées de grille
    const startX = Math.floor(scrollLeft / spacing) * spacing;
    const startY = Math.floor(scrollTop / spacing) * spacing;

    // Ajouter une marge (2x) pour éviter les vides lors du défilement
    const endX = Math.ceil((scrollLeft + visibleWidth * 2) / spacing) * spacing;
    const endY = Math.ceil((scrollTop + visibleHeight * 2) / spacing) * spacing;

    // Calculer le nombre de points à créer
    const dotsX = Math.floor((endX - startX) / spacing) + 1;
    const dotsY = Math.floor((endY - startY) / spacing) + 1;

    console.log(`Création de la grille: ${dotsX}x${dotsY} points avec espacement ${Math.round(spacing)}px au zoom ${currentZoom}`);

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
      // Supprimer l'ancien motif
      const existingContainer = document.getElementById("dotsContainer");
      if (existingContainer) {
        existingContainer.remove();
      }

      openDiv.appendChild(dotContainer);
    }
  }, [containerRef]);

  // Fonction d'aide pour traiter un lot de points
  const processDotBatch = (batch, container, dotBgColor, setDotPosition) => {
    batch.forEach(dotData => {
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

  // Fonction pour sélectionner un élément
  const select = (e, id) => {
    setMouseIsDown(true);
    setUuid(id);
  };

  // Fonction pour déplacer un élément
  const setElementPosition = (e) => {
    if (isDown && uuid !== null) {
      const el = elements.find((el) => el.id === uuid);
      if (!el) return;

      // Calculer la nouvelle position
      const newX = parseInt(el.x) + e.movementX;
      const newY = parseInt(el.y) + e.movementY;

      // Obtenir les dimensions de la zone de travail
      const containerRect = document.querySelector(".openDiv")?.getBoundingClientRect();
      if (!containerRect) return;

      // Calculer les limites
      const maxX = canvasSize.width - el.width;
      const maxY = canvasSize.height - el.height;

      // S'assurer que l'élément reste dans les limites
      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      // Vérifier s'il y a une collision avec d'autres éléments
      const hasCollision = checkCollision(boundedX, boundedY, el.width, el.height, uuid);

      if (!hasCollision) {
        // Mettre à jour la position si pas de collision
        updateElementsAndPropagate((prevElements) => {
          return prevElements.map((element) => {
            if (element.id === uuid) {
              return {
                ...element,
                x: boundedX,
                y: boundedY,
              };
            } else {
              return element;
            }
          });
        });
      }

      // Optimisation: utiliser requestAnimationFrame pour mettre à jour les connexions
      if (lines.length > 0) {
        if (window.svgUpdateTimer) {
          cancelAnimationFrame(window.svgUpdateTimer);
        }

        window.svgUpdateTimer = requestAnimationFrame(() => {
          updateSvgConnections();
        });
      }
    }
  };

  // Fonction pour créer un nouvel élément
  const mouseIsDown = (e) => {
    if (tool.tool !== 0 && tool.tool < 6) {
      setMouseIsDown(true);

      // Générer un nouvel UUID
      const newId = uuidv4();

      // Récupérer la position initiale
      let initialX = parseInt(dotPosition[0]);
      let initialY = parseInt(dotPosition[1]);

      // Dimensions par défaut
      const width = defaultDimensions.current.width;
      const height = defaultDimensions.current.height;

      // Vérifier si la position est déjà occupée
      const hasCollision = checkCollision(initialX, initialY, width, height);

      // Si collision, trouver une position libre
      if (hasCollision) {
        const newPosition = findEmptyPosition(initialX, initialY, width, height);
        initialX = newPosition.x;
        initialY = newPosition.y;
      }

      // Créer une nouvelle forme avec les dimensions par défaut
      let newShape = {
        id: newId,
        x: initialX,
        y: initialY,
        width: width,
        height: height,
        bgColor: "#ffffff",
        border: "1px solid gray",
        text: "",
      };

      // Appliquer le type de forme
      switch (tool.tool) {
        case 1: // Rectangle
          newShape = { ...newShape, type: 1, radius: "15%", transform: "" };
          break;
        case 2: // Cercle
          newShape = { ...newShape, type: 2, radius: "50%", transform: "" };
          break;
        case 3: // Losange
          newShape = {
            ...newShape,
            type: 3,
            radius: "0%",
            transform: "",
            background: generateSvgBackgroundType3("#ffffff"),
            border: "none"
          };
          break;
        case 4: // Parallélogramme
          newShape = {
            ...newShape,
            type: 4,
            radius: "15%",
            transform: "skewX(15deg)",

          };
          break;
        case 5: // Note
          newShape = {
            ...newShape,
            type: 5,
            radius: "0%",
            transform: "",
            background: generateSvgBackgroundType5("#ffffff"),
            border: "none"
          };
          break;
      }

      // Mettre à jour le style courant
      setStyle(newShape);

      // Ajouter l'élément au tableau
      setElements(prevElements => {
        const newElements = [...prevElements, newShape];
        if (!isInitialRender.current) {
          setTimeout(() => {
            if (propSetElements) propSetElements(newElements);
            if (onDataChange) onDataChange(newElements, lines);
          }, 0);
        }
        return newElements;
      });

      // Stocker l'UUID pour le redimensionnement
      setUuid(newId);
    }
  };

  // Fonction pour vérifier les collisions avec les éléments existants
  const checkCollision = (x, y, width, height, currentElementId = null) => {
    // Vérifier la collision avec tous les éléments existants
    return elements.some(element => {
      // Ignorer l'élément courant
      if (currentElementId && element.id === currentElementId) return false;

      // Calculer les limites des éléments
      const elementLeft = parseInt(element.x);
      const elementRight = parseInt(element.x) + parseInt(element.width);
      const elementTop = parseInt(element.y);
      const elementBottom = parseInt(element.y) + parseInt(element.height);

      const newElementRight = x + width;
      const newElementBottom = y + height;

      // Vérifier s'il y a chevauchement
      return (
        x < elementRight &&
        newElementRight > elementLeft &&
        y < elementBottom &&
        newElementBottom > elementTop
      );
    });
  };

  // Fonction pour trouver une position libre
  const findEmptyPosition = (startX, startY, width, height) => {
    // Garantir que la position reste dans les limites
    const maxX = canvasSize.width - width;
    const maxY = canvasSize.height - height;

    // Grille avec espacement
    const gridSpacing = 25;

    // Chercher en spirale à partir du point de départ
    let layer = 1;
    const maxLayers = 30; // Limiter la recherche

    // Essayer d'abord la position initiale
    if (!checkCollision(startX, startY, width, height)) {
      return {
        x: Math.max(0, Math.min(startX, maxX)),
        y: Math.max(0, Math.min(startY, maxY))
      };
    }

    while (layer < maxLayers) {
      // Explorer en spirale carrée autour du point de départ

      // Dessus du carré
      for (let offsetX = -layer; offsetX <= layer; offsetX++) {
        const posX = startX + offsetX * gridSpacing;
        const posY = startY - layer * gridSpacing;

        if (posX >= 0 && posX <= maxX && posY >= 0 && posY <= maxY) {
          if (!checkCollision(posX, posY, width, height)) {
            return { x: posX, y: posY };
          }
        }
      }

      // Côté droit du carré
      for (let offsetY = -layer + 1; offsetY <= layer; offsetY++) {
        const posX = startX + layer * gridSpacing;
        const posY = startY + offsetY * gridSpacing;

        if (posX >= 0 && posX <= maxX && posY >= 0 && posY <= maxY) {
          if (!checkCollision(posX, posY, width, height)) {
            return { x: posX, y: posY };
          }
        }
      }

      // Dessous du carré
      for (let offsetX = layer - 1; offsetX >= -layer; offsetX--) {
        const posX = startX + offsetX * gridSpacing;
        const posY = startY + layer * gridSpacing;

        if (posX >= 0 && posX <= maxX && posY >= 0 && posY <= maxY) {
          if (!checkCollision(posX, posY, width, height)) {
            return { x: posX, y: posY };
          }
        }
      }

      // Côté gauche du carré
      for (let offsetY = layer - 1; offsetY >= -layer + 1; offsetY--) {
        const posX = startX - layer * gridSpacing;
        const posY = startY + offsetY * gridSpacing;

        if (posX >= 0 && posX <= maxX && posY >= 0 && posY <= maxY) {
          if (!checkCollision(posX, posY, width, height)) {
            return { x: posX, y: posY };
          }
        }
      }

      layer++;
    }

    // Position par défaut si aucune position libre n'est trouvée
    return {
      x: Math.max(0, Math.min(startX, maxX)),
      y: Math.max(0, Math.min(startY, maxY))
    };
  };

  // Formatage des couleurs hexadécimales
  function formatHexColor(color) {
    if (!color.startsWith("#")) return color;

    // Si le code est en format raccourci "#RGB"
    if (color.length === 4) {
      const r = color[1];
      const g = color[2];
      const b = color[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }

    return color;
  }

  const generateSvgBackgroundType3 = (fillColor) => {
    const validColor = formatHexColor(fillColor);
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2.9 2.9 23.8 23.8" preserveAspectRatio="none">
  <rect 
    x="5.8" 
    y="5.5" 
    width="18" 
    height="18" 
   fill="${validColor}"
    stroke="#2c3e50" 
    stroke-width="0.63" 
    rx="2.4" 
    ry="2.4"
    transform="rotate(45, 14.5, 14.5)"
    vector-effect="non-scaling-stroke"
  />
  </svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svgString)}")  no-repeat`;
  };


  // Génération du SVG pour la note
  const generateSvgBackgroundType5 = (fillColor) => {
    const validColor = formatHexColor(fillColor);
    const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="2.9 2.8 23.2 23.2" preserveAspectRatio="none">
    <path d="M6 3 H23 V6 C23 6.55228 23.4477 7 24 7 H26 V22.78 C26 24.4343 24.6569 25.80 23 25.80 H6 C4.34315 25.80 3 24.4343 3 22.78 V6 C3 4.34315 4.34315 3 6 3 Z" 
          fill="${validColor}" 
          stroke="#333333" 
          stroke-width="0.63" 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          vector-effect="non-scaling-stroke" />
          
    <path d="M23 3 L23 6 C23 6.55228 23.4477 7 24 7 H26 L23 3 Z" 
          fill="#f5f5f5" 
          stroke="#333333" 
          stroke-width="0.63" 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          vector-effect="non-scaling-stroke" />
</svg>
    `;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svgString)}") no-repeat`;
  };

  // Trouver l'élément le plus proche
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
      if (element === referenceElement) return;

      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      // Calculer la distance euclidienne
      const distance = Math.sqrt(Math.pow(refX - x, 2) + Math.pow(refY - y, 2));

      if (distance < minDistance) {
        minDistance = distance;
        closestElement = element;
      }
    });

    return closestElement;
  };

  // Gestion du relâchement de la souris
  const mouseIsUp = () => {
    setMouseIsDown(false);

    // Si l'outil d'alignement est actif, aligner à la grille
    if (tool.tool === 0 && uuid) {
      const reference = document.getElementById(uuid);
      const dotContainer = document.querySelector("#dotsContainer");

      if (reference && dotContainer) {
        const otherElements = Array.from(dotContainer.children);
        const closest = findClosestElement(reference, otherElements);

        if (closest) {
          // Aligner l'élément au point le plus proche
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

    // Annuler les mises à jour d'animation en cours
    if (window.svgUpdateTimer) {
      cancelAnimationFrame(window.svgUpdateTimer);
      window.svgUpdateTimer = null;
    }

    // Mettre à jour les connexions
    if (lines.length > 0) {
      setTimeout(() => {
        updateSvgConnections();

        // Réafficher les points de connexion en mode connexion
        if (connectingMode) {
          const shapes = document.querySelectorAll("[shape-type]");
          shapes.forEach((element) => {
            showConnectionPoints(element);
          });
        }
      }, 50);
    }
  };

  // Fonction pour redimensionner un élément
  const setDimensions = (e, active) => {
    if ((isDown && tool.tool !== 0 && tool.tool < 6 && tool.tool !== -1) || active) {
      const number = 25; // Incrément de taille
      let newWidth = style.width;
      let newHeight = style.height;

      // Mettre à jour les dimensions selon le type de forme
      if (tool.tool === 2 || tool.tool === 3) {
        // Cercle ou Losange - même largeur et hauteur
        if (e.movementX > 0 || e.movementY > 0) {
          newWidth = style.width + number;
          newHeight = newWidth;
        } else if (e.movementX < 0 || e.movementY < 0) {
          newWidth = Math.max(20, style.width - number);
          newHeight = newWidth;
        }
      } else if (tool.tool === 1 || tool.tool === 4 || tool.tool === 5) {
        // Rectangle, Parallélogramme ou Note - dimensions indépendantes
        if (e.movementX > 0) {
          newWidth = style.width + number;
        } else if (e.movementX < 0) {
          newWidth = Math.max(20, style.width - number);
        }

        if (e.movementY > 0) {
          newHeight = style.height + number;
        } else if (e.movementY < 0) {
          newHeight = Math.max(20, style.height - number);
        }
      }

      // Récupérer la position actuelle
      const element = elements.find(el => el.id === uuid);
      if (!element) return;

      // Limites de taille
      const maxX = canvasSize.width - element.x;
      const maxY = canvasSize.height - element.y;

      newWidth = Math.min(newWidth, maxX);
      newHeight = Math.min(newHeight, maxY);

      // Vérifier les collisions
      const hasCollision = checkCollision(parseInt(element.x), parseInt(element.y), newWidth, newHeight, uuid);

      if (!hasCollision) {
        // Mettre à jour le style local
        setStyle(prevStyle => ({
          ...prevStyle,
          width: newWidth,
          height: newHeight,
        }));

        // Mettre à jour l'élément dans le tableau
        updateElementsAndPropagate(prevElements => {
          return prevElements.map(el => {
            if (el.id === uuid) {
              shapeStyleAfter(newWidth);
              return {
                ...el,
                width: newWidth,
                height: newHeight,
              };
            } else {
              return el;
            }
          });
        });
      }
    }
  };

  // Fonction pour changer la couleur d'une forme
  const changeShapeColor = () => {
    // Mettre à jour la couleur dans l'état
    updateElementsAndPropagate(prevElements =>
      prevElements.map(element => {
        if (element.id === uuid) {
          let updatedElement = { ...element, bgColor: color };

          // Générer un fond personnalisé pour les types spéciaux
          if (element.type === 3) {
            updatedElement.background = generateSvgBackgroundType3(color);
          } else if (element.type === 5) {
            updatedElement.background = generateSvgBackgroundType5(color);
          }
          return updatedElement;
        }
        return element;
      })
    );
  };

  // Fonction pour gérer l'édition de texte
  const manageInput = () => {
    tool.tool = -1;
    const el = document.getElementById("input" + uuid);
    if (el) {
      // Rendre l'élément visible
      el.style.display = "flex";
      el.style.zIndex = "3";

      // Mettre le focus sur l'input
      setTimeout(() => {
        el.focus();
      }, 10);
    }
  };

  // Fonction pour mettre à jour le texte d'un élément
  const setTextElement = () => {
    const el = document.getElementById("input" + uuid);
    if (el) {
      updateElementsAndPropagate(prevElements => {
        return prevElements.map(element => {
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

  // Fonction pour afficher le menu d'une forme
  const menu = (elementId) => {
    setUuid(elementId);
    const element = document.getElementById(elementId);
    if (element) {
      const shapeMenu = document.querySelector(".shapeMenu");
      if (shapeMenu) {
        // Récupérer l'élément dans le tableau pour connaître son type
        const elementData = elements.find(el => el.id === elementId);
        if (!elementData) return;

        // Positionnement personnalisé selon le type de forme
        if (elementData.type === 3) { // Losange
          // Positionner le menu au centre du losange

          const elementRect = element.getBoundingClientRect();
          const centerX = parseInt(element.style.left) + parseInt(element.style.width) / 2;
          const centerY = parseInt(element.style.top) + parseInt(element.style.height) / 2;

          // Ajuster le positionnement du menu (centré horizontalement, au-dessus verticalement)
          shapeMenu.style.display = "flex";
          shapeMenu.style.left = `${centerX - 50}px`; // 50 = largeur du menu / 2
          shapeMenu.style.top = `${parseInt(element.style.top) - 45}px`;
        } else {
          // Positionnement standard pour les autres formes
          shapeMenu.style.display = "flex";
          shapeMenu.style.left = `${parseInt(element.style.left) + parseInt(element.style.width) - 100}px`;
          shapeMenu.style.top = `${parseInt(element.style.top) - 45}px`;
        }

        // Mise à jour des coordonnées pour le sélecteur de couleur
        const colorPicker = document.getElementById("ddc");
        if (colorPicker) {
          const rect = colorPicker.getBoundingClientRect();
          setTopValue(rect.top);
          setLeftValue(rect.left);
        }
      }
    }
  };

  // Fonction pour supprimer un élément
  const deleteElement = () => {
    // Supprimer l'élément
    updateElementsAndPropagate(prevElements =>
      prevElements.filter(element => element.id !== uuid)
    );

    // Supprimer les lignes connectées
    updateLinesAndPropagate(prevLines =>
      prevLines.filter(line => line.source !== uuid && line.target !== uuid)
    );

    // Cacher le menu
    const shapeMenu = document.querySelector(".shapeMenu");
    if (shapeMenu) {
      shapeMenu.style.display = "none";
    }

    // Mettre à jour les connexions
    setTimeout(() => {
      updateSvgConnections();
    }, 100);
  };

  // Fonction pour ajuster le style du menu
  const shapeStyleAfter = (width) => {
    const shapeMenu = document.querySelector(".shapeMenu");
    if (!shapeMenu) return;

    // Créer une feuille de style dynamique
    const styleSheet = document.createElement("style");
    document.head.appendChild(styleSheet);

    // Définir le style ::after avec une zone plus grande
    styleSheet.textContent = `
      .shapeMenu::after {
        content: "";
        position: absolute;
        left: 0;
        top: 100%;
        width: ${width}px;
        height: 20px;
        background-color: transparent;
        z-index: 10;
      }`;

    shapeMenu.style.position = "relative";
  };
  useEffect(() => {
    const trackMousePosition = (e) => {
      window.mousePosition = { x: e.clientX, y: e.clientY };
    };

    document.addEventListener('mousemove', trackMousePosition);

    return () => {
      document.removeEventListener('mousemove', trackMousePosition);
    };
  }, []);

  // Calculer la taille de police en fonction du texte
  const calculateFontSize = (text, width, height) => {
    if (!text) return "14px";

    // Taille de base selon l'espace disponible
    const baseSize = Math.min(width / (text.length * 0.7), height / 2);

    // Limiter la taille entre 9px et 20px
    return Math.max(9, Math.min(baseSize, 20)) + "px";
  };

  // Fonction pour importer un fichier JSON
  function importJsonFile(file) {
    const reader = new FileReader();

    reader.onload = event => {
      try {
        const parsedData = JSON.parse(event.target.result);

        updateElementsAndPropagate(parsedData.elements);
        updateLinesAndPropagate(parsedData.lines);

        // Recréer la grille de points après l'import
        setTimeout(createDotPattern, 100);
      } catch (error) {
        console.error('Erreur de parsing JSON:', error);
      }
    };

    reader.readAsText(file);
  }

  // Fonction pour mettre à jour les éléments et propager au parent
  const updateElementsAndPropagate = useCallback((updaterFn) => {
    if (typeof updaterFn === 'function') {
      setElements(prevElements => {
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
  }, [propSetElements, onDataChange, lines]);

  // Fonction pour mettre à jour les lignes et propager au parent
  const updateLinesAndPropagate = useCallback((updaterFn) => {
    if (typeof updaterFn === 'function') {
      setLines(prevLines => {
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
  }, [propSetLines, onDataChange, elements]);

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
    }
  }));

  // Garantir que le composant est marqué comme chargé
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInternallyLoaded) {
        setIsInternallyLoaded(true);
      }
    }, 1000); // Garantir que le chargement est marqué comme terminé après 1 seconde

    return () => clearTimeout(timer);
  }, []);

  // Fonction de zoom optimisée
  const zoomFunc = (action) => {
    const container = document.querySelector(".openDiv");
    if (!container) return;

    let newZoomValue;

    // Déterminer la nouvelle valeur de zoom
    if (action === 0) {
      // Zoom in: +5%
      newZoomValue = parseInt(container.style.zoom || "100") + 5;
    } else if (action === 1) {
      // Zoom out: -5%
      newZoomValue = parseInt(container.style.zoom || "100") - 5;
    } else {
      // Reset: 100%
      newZoomValue = 100;
    }

    // Limiter le zoom entre 10% et 200%
    newZoomValue = Math.max(10, Math.min(200, newZoomValue));

    // Appliquer le zoom
    container.style.zoom = newZoomValue + "%";
    setNzoom(newZoomValue + "%");

    // Recréer la grille après un court délai pour s'adapter au nouveau zoom
    if (dotPatternCreationTimeout.current) {
      clearTimeout(dotPatternCreationTimeout.current);
    }

    dotPatternCreationTimeout.current = setTimeout(() => {
      createDotPattern();
    }, 100);
  };

  // Composant pour les contrôles de zoom
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
            cursor: "pointer"
          }}
        >-</button>

        <div style={{
          display: "flex",
          alignItems: "center",
          minWidth: "50px",
          justifyContent: "center",
          fontSize: "14px"
        }}>
          {nzoom}
        </div>

        <button
          disabled={nzoom === "100%"}
          onClick={() => zoomFunc(0)}
          style={{
            width: "30px",
            height: "30px",
            border: "1px solid #ccc",
            borderRadius: "3px",
            background: "#fff",
            cursor: "pointer"
          }}
        >+</button>

        <button
          onClick={() => zoomFunc(2)}
          style={{
            padding: "0 10px",
            height: "30px",
            border: "1px solid #ccc",
            borderRadius: "3px",
            background: "#fff",
            cursor: "pointer"
          }}
        >Reset</button>
      </div>
    );
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
          border: "2px solid #333",
          padding: "15px",
          margin: "0 auto",
          overflow: "auto",
          boxSizing: "border-box",
          zoom: "100%",
          height: "100vh",
          position: "relative"
        }}
      >
        {/* Conteneur principal avec défilement */}
        <div
          ref={containerRef}
          className="openDiv"
          onMouseDown={(e) => {
            // Gestion de la création d'éléments
            if (
              tool.tool > 0 &&
              tool.tool < 6 &&
              (document.querySelector(".shapeMenu")?.style.display === "none" ||
                document.querySelector(".shapeMenu")?.style.display === "")
            ) {
              mouseIsDown(e);
            } else if (tool.tool === -1) {
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
            zoom: "100%",
          }}
        >
          {/* SVG pour les connexions */}
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
                  // Créer les marqueurs de flèche pour les connections
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
                        <polygon points="0 0, 10 3.5, 0 7" fill={conn.color} />
                      </marker>
                    );
                  }
                  return null;
                })}
            </defs>

            {/* Rendu des connexions */}
            {svgConnections &&
              svgConnections.map((conn) => {
                if (!conn.toolType || conn.toolType === 6) {
                  // Flèche standard
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
                  // Ligne pointillée avec flèche
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
                  // Ligne en pointillés sans flèche
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

          {/* Menu contextuel pour les formes */}
          <div
            className="shapeMenu"
            onMouseEnter={() => {
              // Annuler tout timeout qui pourrait cacher le menu
              if (window.hideMenuTimeout) {
                clearTimeout(window.hideMenuTimeout);
                window.hideMenuTimeout = null;
              }

              // S'assurer que le menu reste visible
              const shapeMenu = document.querySelector(".shapeMenu");
              if (shapeMenu) {
                shapeMenu.style.display = "flex";
              }
            }}
            onMouseLeave={() => {
              // Ne pas cacher immédiatement
              if (!isOpen) {
                window.hideMenuTimeout = setTimeout(() => {
                  const mousePos = window.mousePosition || { x: 0, y: 0 };
                  const shapeMenu = document.querySelector(".shapeMenu");
                  if (shapeMenu) {
                    const rect = shapeMenu.getBoundingClientRect();
                    const afterRect = {
                      left: rect.left,
                      top: rect.bottom,
                      width: parseInt(style.width) || 100,
                      height: 20,
                      right: rect.left + (parseInt(style.width) || 100),
                      bottom: rect.bottom + 20
                    };

                    // Vérifier si la souris est sur un élément
                    const elementsUnderMouse = document.elementsFromPoint(mousePos.x, mousePos.y);
                    const isMouseOnElement = elementsUnderMouse.some(el => el.classList.contains('shape-elementy'));

                    // Cacher seulement si la souris n'est ni dans la zone after ni sur un élément
                    if (
                      !isMouseOnElement && (
                        mousePos.x < afterRect.left ||
                        mousePos.x > afterRect.right ||
                        mousePos.y < afterRect.top ||
                        mousePos.y > afterRect.bottom
                      )
                    ) {
                      shapeMenu.style.display = "none";
                    }
                  }
                }, 300);
              }
            }}
          >
            <img src="/icons/policeIcon.png" onClick={() => [manageInput(), console.log('fedz')]} alt="Text" />
            <div id="ddc">
              <PopoverPicker
                color={color}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
              />
            </div>
            <img onClick={() => deleteElement()} src="/icons/trash.png" alt="Delete" />
          </div>

          {/* Rendu des éléments */}
          {elements
            .filter((el) => el.id)
            .map((elementStyle) => (
              <div
                onMouseUp={mouseIsUp}
                onMouseEnter={() => {
                  if (!isDown && tool.tool < 6) {
                    setColor(elementStyle.bgColor);
                    // Définir un flag ou un état indiquant que l'élément est survolé
                    // Vous pouvez ajouter un état comme: const [hoveredElement, setHoveredElement] = useState(null);
                    // et l'utiliser ici: setHoveredElement(elementStyle.id);

                    // Supprimer tout timeout existant pour cacher le menu
                    if (window.hideMenuTimeout) {
                      clearTimeout(window.hideMenuTimeout);
                      window.hideMenuTimeout = null;
                    }

                    // Montrer le menu immédiatement sans délai
                    menu(elementStyle.id);
                    const shapeMenu = document.querySelector(".shapeMenu");
                    if (shapeMenu) {
                      shapeMenu.style.display = "flex";
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  // Utiliser un délai plus long avant de cacher le menu
                  // Cela donnera plus de temps pour passer d'un élément à un autre
                  window.hideMenuTimeout = setTimeout(() => {
                    // Vérifier si le menu est ouvert ou si la souris est sur un autre élément
                    const shapeMenu = document.querySelector(".shapeMenu");
                    if (shapeMenu && !isOpen) {
                      const mousePos = window.mousePosition || { x: 0, y: 0 };
                      const menuRect = shapeMenu.getBoundingClientRect();

                      // Vérifier si la souris est sur le menu
                      const isMouseOnMenu =
                        mousePos.x >= menuRect.left &&
                        mousePos.x <= menuRect.right &&
                        mousePos.y >= menuRect.top &&
                        mousePos.y <= menuRect.bottom;

                      // Vérifier si la souris est dans la zone after
                      const afterRect = {
                        left: menuRect.left,
                        top: menuRect.bottom,
                        width: parseInt(style.width) || 100,
                        height: 20,
                        right: menuRect.left + (parseInt(style.width) || 100),
                        bottom: menuRect.bottom + 20
                      };

                      const isMouseOnAfter =
                        mousePos.x >= afterRect.left &&
                        mousePos.x <= afterRect.right &&
                        mousePos.y >= afterRect.top &&
                        mousePos.y <= afterRect.bottom;

                      // Vérifier si la souris est sur un autre élément
                      const elementsUnderMouse = document.elementsFromPoint(mousePos.x, mousePos.y);
                      const isMouseOnAnotherElement = elementsUnderMouse.some(el =>
                        el.classList.contains('shape-elementy') && el.id !== elementStyle.id
                      );

                      // Ne cacher le menu que si la souris n'est ni sur le menu, ni sur la zone after, ni sur un autre élément
                      if (!isMouseOnMenu && !isMouseOnAfter && !isMouseOnAnotherElement) {
                        shapeMenu.style.display = "none";
                      }
                    }
                  }, 300); // Augmenter le délai à 300ms
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
                  border: elementStyle.border,
                  background: elementStyle.type === 5 || elementStyle.type === 3
                    ? elementStyle.background
                    : elementStyle.bgColor,
                  transform: elementStyle.transform,
                  cursor: tool.tool === 0 ? "move" : "default",
                  zIndex: "2", // Ajouter un z-index supérieur à celui des points
                }}
                shape-type={elementStyle.type}
              >
                {/* Champ de texte pour l'élément */}
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
                    top: "50%",
                    left: "50%",
                    transform:
                      "translate(-50%, -50%)" +
                      (elementStyle.transform
                        ? ` ${elementStyle.transform.includes("rotate")
                          ? "rotate(-45deg)"
                          : elementStyle.transform.includes("skew")
                            ? "skewX(-15deg)"
                            : ""
                        }`
                        : ""),
                    textAlign: "center",
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
              </div>
            ))}
        </div>
      </div>

      {/* Sélecteur de couleur */}
      {isOpen && (
        <div
          onMouseLeave={() => {
            [document.querySelector(".shapeMenu").style.display = "none", console.log("out1")];
            setIsOpen(false);
          }}
          id="bbn"
          style={{
            zIndex: "10",
            top: `${topValue + 40}px`,
            left: `${leftValue}px`
          }}
          className="popover"
          ref={popover}
        >
          <HexColorPicker
            color={color}
            onChange={(newColor) => setColor(newColor)}
            onMouseUp={() => changeShapeColor()}
          />
        </div>
      )}

      {/* Contrôles de zoom */}
      <ZoomControls />
    </div>
  );
});

export default MainLogigramme;

