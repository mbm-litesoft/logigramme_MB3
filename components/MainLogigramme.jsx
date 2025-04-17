"use client";
import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { stringify, v4 as uuidv4 } from "uuid";
import { PopoverPicker } from "./PopoverPicker";
import { HexColorPicker } from "react-colorful";

const MainLogigramme = forwardRef(({ tool, onUuidChange, onDataChange, elements: propElements, lines: propLines, setElements: propSetElements, setLines: propSetLines, onLoadComplete }, ref) => {
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

  const [isInternallyLoaded, setIsInternallyLoaded] = useState(false);
  const isInitialRender = useRef(true);
  const initializationComplete = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const popover = useRef();

  const [elements, setElements] = useState([]);
  const [lines, setLines] = useState([]);
  const [uuid, setUuid] = useState("");
  const [svgConnections, setSvgConnections] = useState([]); // État pour les connexions SVG

  const [blockLeft, setBlockLeft] = useState(false);
  const [blockRight, setBlockRight] = useState(false);
  const [blockBottom, setBlockBottom] = useState(false);
  const [blockTop, setBlockTop] = useState(false);

  const [dotPosition, setDotPosition] = useState([0, 0]);
  const [color, setColor] = useState("#ffffff");
  const [connectingMode, setConnectingMode] = useState(false);
  const [sourceElement, setSourceElement] = useState(null);
  const [sourceDot, setSourceDot] = useState(null);

  const dotSelected = useRef(false);
  const defaultDimensions = useRef({ width: 103, height: 103 });

  // Par ces refs :
  const sourceElementRef = useRef(null);
  const sourceSideRef = useRef(null);
  const sourceDotRef = useRef(null);

  const [canvasSize, setCanvasSize] = useState({
    width: 5000, // Increased canvas size
    height: 5000, // Increased canvas size
  });

  const [zoom, setZoom] = useState(1);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isInternallyLoaded && !isInitialRender.current) {
      if (onLoadComplete) {
        onLoadComplete();
      }
    }
  }, [isInternallyLoaded, onLoadComplete]);

  // Ajoutez cet useEffect au début de votre composant
  // Configurer le composant
  useEffect(() => {
    // Marquer comme n'étant plus le rendu initial après la première exécution de l'effet
    isInitialRender.current = false;

    // Tâches de chargement initial
    let loadingTasks = 0;

    // 1. Rendre les connexions s'il y en a
    if (lines.length > 0) {
      loadingTasks++;
      console.log("Rendu initial des connexions");
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

    // Assurer que le chargement est marqué comme terminé après un délai
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
    if (color) {

      console.log("Color changed:", color);
    }
  }, [color]);
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

  function saveToJson() {
    // Créez un objet qui contient à la fois elements et lines
    const saveData = {
      elements: elements,
      lines: lines
    };
    console.log(elements, "elements")
    // Convertir en chaîne JSON
    const jsonString = JSON.stringify(saveData);

    // Créer un Blob avec le contenu JSON
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "logigramme.json";

    // Déclencher le téléchargement
    document.body.appendChild(link);
    link.click();

    // Nettoyer
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

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
      } else if (shapeType === 3) {
        // Losange - 4 points (aux sommets du losange)
        positions = [
          {
            side: "top-right",
            top: "-10px",
            right: "0",
            transform: "translate(50%, 0)",
          },

          {
            side: "bottom-right",
            bottom: "-10px",
            right: "0",
            transform: "translate(50%, 0)",
          },

          {
            side: "bottom-left",
            bottom: "-10px",
            left: "0",
            transform: "translate(-50%, 0)",
          },

          {
            side: "top-left",
            top: "-10px",
            left: "0",
            transform: "translate(-50%, 0)",
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
  // Fonction updateSvgConnections robuste qui ne dépend plus des éléments DOM visibles pour les connexions

  // Fonction updateSvgConnections mise à jour
  const updateSvgConnections = useCallback(() => {
    // Fonction utilitaire pour obtenir les coordonnées absolues d'un point de connexion
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

      // Points de connexion pour les losanges (rotated 45°)
      if (shapeType === 3) {
        // Pour les losanges, les coordonnées doivent tenir compte de la rotation de 45°
        switch (side) {
          case "top-right":
            // Point droit du losange
            x = centerX + rect.width / 2;
            y = centerY;
            break;
          case "bottom-right":
            // Point bas du losange
            x = centerX;
            y = centerY + rect.height / 2;
            break;
          case "bottom-left":
            // Point gauche du losange
            x = centerX - rect.width / 2;
            y = centerY;
            break;
          case "top-left":
            // Point haut du losange
            x = centerX;
            y = centerY - rect.height / 2;
            break;
        }
      } else {
        // Points de connexion standard pour les autres formes
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
      if (!lines || lines.length === 0) {
        setSvgConnections([]);
        return;
      }

      // Faire une copie des lignes
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

            if (!sourceElement || !targetElement) {
              console.log(
                "Élément non trouvé:",
                line.source,
                "ou",
                line.target
              );
              return null;
            }

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

            // Vérification supplémentaire
            if (
              !sourcePoint ||
              !targetPoint ||
              isNaN(sourcePoint.x) ||
              isNaN(sourcePoint.y) ||
              isNaN(targetPoint.x) ||
              isNaN(targetPoint.y)
            ) {
              console.error(
                "Points de connexion invalides:",
                sourcePoint,
                targetPoint
              );
              return null;
            }

            // Calculer les points de contrôle pour la courbe Bézier
            const controlDistance =
              Math.min(
                Math.abs(targetPoint.x - sourcePoint.x),
                Math.abs(targetPoint.y - sourcePoint.y)
              ) /
              2 +
              50;

            let sourceControlX, sourceControlY, targetControlX, targetControlY;

            // Déterminer la direction du point de contrôle source
            if (sourceShapeType === 3) {
              // Points de contrôle spécifiques pour le losange
              switch (line.sourceSide) {
                case "top-right": // Point droit
                  sourceControlX = sourcePoint.x + controlDistance;
                  sourceControlY = sourcePoint.y;
                  break;
                case "bottom-right": // Point bas
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y + controlDistance;
                  break;
                case "bottom-left": // Point gauche
                  sourceControlX = sourcePoint.x - controlDistance;
                  sourceControlY = sourcePoint.y;
                  break;
                case "top-left": // Point haut
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y - controlDistance;
                  break;
                default:
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y;
              }
            } else if (sourceShapeType === 4) {
              // Points de contrôle spécifiques pour le parallélogramme
              // Calculer l'angle du skew (15 degrés)
              const skewAngle = Math.PI / 12; // 15 degrés en radians
              console.log("fsq");
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
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y;
                  break;
                case "bottom-right":
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y;
                  break;
                case "bottom-left":
                  sourceControlX = sourcePoint.x;
                  sourceControlY = sourcePoint.y;
                  break;
                case "top-left":
                  sourceControlX = sourcePoint.x;
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

            // Déterminer la direction du point de contrôle cible
            if (targetShapeType === 3) {
              // Points de contrôle spécifiques pour le losange
              switch (line.targetSide) {
                case "top-right": // Point droit
                  targetControlX = targetPoint.x + controlDistance;
                  targetControlY = targetPoint.y;
                  break;
                case "bottom-right": // Point bas
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y + controlDistance;
                  break;
                case "bottom-left": // Point gauche
                  targetControlX = targetPoint.x - controlDistance;
                  targetControlY = targetPoint.y;
                  break;
                case "top-left": // Point haut
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y - controlDistance;
                  break;
                default:
                  targetControlX = targetPoint.x;
                  targetControlY = targetPoint.y;
              }
            } else if (targetShapeType === 4) {
              // Points de contrôle spécifiques pour le parallélogramme
              // Calculer l'angle du skew (15 degrés)
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
                  targetControlX =
                    targetPoint.x + controlDistance * Math.cos(skewAngle);
                  targetControlY =
                    targetPoint.y - controlDistance * Math.sin(skewAngle);
                  break;
                case "bottom-right":
                  targetControlX =
                    targetPoint.x + controlDistance * Math.cos(-skewAngle);
                  targetControlY =
                    targetPoint.y + controlDistance * Math.sin(-skewAngle);
                  break;
                case "bottom-left":
                  targetControlX =
                    targetPoint.x - controlDistance * Math.cos(skewAngle);
                  targetControlY =
                    targetPoint.y + controlDistance * Math.sin(skewAngle);
                  break;
                case "top-left":
                  targetControlX =
                    targetPoint.x - controlDistance * Math.cos(-skewAngle);
                  targetControlY =
                    targetPoint.y - controlDistance * Math.sin(-skewAngle);
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
        const sourceElement = document.getElementById(sourceElementRef.current);
        const targetElement = document.getElementById(targetElementId);

        if (sourceElement && sourceElement.getAttribute("shape-type") === "4") {
          newLine.sourceOffset = { x: 0, y: 0 }; // Ajustez ces valeurs selon vos besoins
        }

        if (targetElement && targetElement.getAttribute("shape-type") === "4") {
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

  // Fonction pour créer un modèle de points sur la grille
  const createDotPattern = useCallback(() => {
    const dotBgColor = "#00000050";
    const dotHoverColor = "black";

    // Create a container for the dots
    const dotContainer = document.createElement("div");
    dotContainer.style.position = "absolute";
    dotContainer.style.top = "8px";
    dotContainer.style.left = "8px";
    dotContainer.style.width = "100%";
    dotContainer.style.height = "100%";
    dotContainer.style.pointerEvents = "none";
    dotContainer.id = "momo";

    // Use dynamic canvas size
    const windowWidth = canvasSize.width;
    const windowHeight = canvasSize.height;

    // Spacing between dots in pixels
    const spacing = 25;

    // Calculate number of dots in each dimension
    const dotsX = Math.floor(windowWidth / spacing);
    const dotsY = Math.floor(windowHeight / spacing);

    // Create dots and position them on a grid
    for (let y = 0; y < dotsY; y++) {
      for (let x = 0; x < dotsX; x++) {
        const dot = document.createElement("div");

        // Style the dot
        dot.style.position = "absolute";
        dot.style.width = "3px";
        dot.style.height = "3px";
        dot.style.backgroundColor = dotBgColor;
        dot.style.borderRadius = "50%";
        dot.setAttribute("x", `${x * spacing + 8}`);
        dot.setAttribute("y", `${y * spacing + 8}`);
        dot.classList.add("zone");

        // Position the dot
        dot.style.left = `${x * spacing}px`;
        dot.style.top = `${y * spacing}px`;
        dot.style.pointerEvents = "auto";

        // Make dots more interactive
        dot.addEventListener("mouseover", function () {

          setDotPosition([this.getAttribute("x"), this.getAttribute("y")]);
        });

        // Add the dot to the container
        dotContainer.appendChild(dot);
      }
    }

    // Add the container to the document
    const openDiv = document.querySelector(".openDiv");
    if (openDiv) {
      // Remove existing dot pattern if exists
      const existingDotContainer = document.getElementById("momo");
      if (existingDotContainer) {
        existingDotContainer.remove();
      }

      openDiv.appendChild(dotContainer);
    }
  }, [canvasSize]);

  // Update useEffect to call createDotPattern
  useEffect(() => {
    createDotPattern();
  }, [createDotPattern]);

  const select = (e, id) => {
    setMouseIsDown(true);
    setUuid(id);
  };

  // Version améliorée de la fonction setElementPosition
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

      // Mettre à jour les connexions SVG après déplacement
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


  // Version améliorée de la fonction mouseIsDown pour la création d'éléments
  const mouseIsDown = (e) => {
    if (tool.tool !== 0 && tool.tool < 6) {
      setMouseIsDown(true);

      // Générer un nouvel UUID pour cet élément
      const newId = uuidv4();

      // Récupérer la position initiale à partir du point
      let initialX = parseInt(dotPosition[0]);
      let initialY = parseInt(dotPosition[1]);

      // Définir les dimensions par défaut
      const width = defaultDimensions.current.width;
      const height = defaultDimensions.current.height;

      // Vérifier si la position est déjà occupée
      const hasCollision = checkCollision(initialX, initialY, width, height);

      // Si collision ou hors limites, trouver une position libre
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
          newShape = { ...newShape, type: 3, radius: "0%", transform: "rotate(45deg)" };
          break;
        case 4: // Parallélogramme
          newShape = {
            ...newShape,
            type: 4,
            radius: "0%",
            transform: "skewX(15deg)",
            background: generateSvgBackgroundType4("#ffffff")
          };
          break;
        case 5: // Note
          newShape = {
            ...newShape,
            type: 5,
            radius: "0%",
            transform: "",
            background: generateSvgBackgroundType5("#ffffff")
          };
          break;
      }

      // Mettre à jour le style courant
      setStyle(newShape);

      // Créer une nouvelle fonction sécurisée pour cette opération spécifique
      const safelyAddElement = () => {
        setElements(prevElements => {
          const newElements = [...prevElements, newShape];
          // Propager seulement après l'initialisation complète du composant
          if (!isInitialRender.current) {
            setTimeout(() => {
              if (propSetElements) propSetElements(newElements);
              if (onDataChange) onDataChange(newElements, lines);
            }, 0);
          }
          return newElements;
        });
      };

      // Appeler la fonction sécurisée
      safelyAddElement();

      // Stocker l'UUID pour le redimensionnement
      setUuid(newId);
    }
  };

  // Fonction améliorée pour vérifier les collisions avec les éléments existants
  const checkCollision = (x, y, width, height, currentElementId = null) => {
    // Vérifier la collision avec tous les éléments existants
    return elements.some(element => {
      // Ignorer l'élément courant lors de la vérification
      if (currentElementId && element.id === currentElementId) return false;

      // Calculer les limites de l'élément existant
      const elementLeft = parseInt(element.x);
      const elementRight = parseInt(element.x) + parseInt(element.width);
      const elementTop = parseInt(element.y);
      const elementBottom = parseInt(element.y) + parseInt(element.height);

      // Calculer les limites du nouvel élément
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

  // Fonction améliorée pour trouver une position libre
  const findEmptyPosition = (startX, startY, width, height) => {
    // Récupérer les dimensions de la zone de travail
    const containerRect = document.querySelector(".openDiv")?.getBoundingClientRect();
    if (!containerRect) return { x: startX, y: startY };

    // Garantir que la position reste dans les limites de la zone de travail
    const maxX = canvasSize.width - width;
    const maxY = canvasSize.height - height;

    // Grille avec espacement
    const gridSpacing = 25;

    // Chercher en spirale à partir du point de départ
    let layer = 1;
    let maxLayers = 30; // Limiter la recherche pour éviter une boucle infinie

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

    // Si aucune position n'est trouvée après toutes les itérations, 
    // trouver une position qui est au moins à l'intérieur des limites
    return {
      x: Math.max(0, Math.min(startX, maxX)),
      y: Math.max(0, Math.min(startY, maxY))
    };
  };


  function formatHexColor(color) {
    // Si le code ne commence pas par "#", on le retourne inchangé
    console.log(color, "coloraa")
    if (!color.startsWith("#")) return color;

    // Si le code est en format raccourci "#RGB" ou "#RGBA"
    if (color.length === 4 || color.length === 5) {
      // On utilise les trois premières lettres (r, g, b) pour construire le code complet
      const r = color[1];
      const g = color[2];
      const b = color[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    // Sinon, on suppose que le code est déjà au format complet
    return color;
  }


  const generateSvgBackgroundType4 = (fillColor) => {
    const validColor = formatHexColor(fillColor);
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="2.9 2.9 23.2 23.8" preserveAspectRatio="none">
        <path d="M7 3 Q6.5 3 6.3 3.4 L4 26 Q4 26.6 4.6 26.6 H21 Q21.5 26.6 21.7 26.2 L24 3.6 Q24.1 3 23.5 3 Z" fill="${validColor}" stroke="#333333" stroke-width="0.63" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      </svg>
    `;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svgString)}") center no-repeat`;
  };

  const generateSvgBackgroundType5 = (fillColor) => {
    const validColor = formatHexColor(fillColor);
    console.log(validColor, "validColor")
    const svgString = `
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="2.9 2.9 23.2 23.8" preserveAspectRatio="none">
  <!-- Main shape with rounded corners at the bottom only -->
  <path d="M6 3 H23 V6 C23 6.55228 23.4477 7 24 7 H26 V23 C26 24.6569 24.6569 26 23 26.6 H6 C4.34315 26 3 24.6569 3 23 V6 C3 4.34315 4.34315 3 6 3 Z" 
        fill="${validColor}" 
        stroke="#333333" 
        stroke-width="0.63" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        vector-effect="non-scaling-stroke" />
        
  <!-- The folded corner effect at top right -->
  <path d="M23 3 L23 6 C23 6.55228 23.4477 7 24 7 H26 L23 3 Z" 
        fill="#f5f5f5" 
        stroke="#333333" 
        stroke-width="0.63" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        vector-effect="non-scaling-stroke" />
</svg>

    `;
    console.log(`url("data:image/svg+xml;utf8,${encodeURIComponent(svgString)}") center no-repeat`, "svgString");
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svgString)}") center no-repeat`;
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
      const distance = Math.sqrt(Math.pow(refX - x, 2) + Math.pow(refY - y, 2));

      if (distance < minDistance) {
        minDistance = distance;
        closestElement = element;
      }
    });

    return closestElement;
  };

  const mouseIsUp = () => {
    console.log(elements, "elements")
    setMouseIsDown(false);

    // Réinitialiser l'ID de l'élément en mouvement
    window.movingElementId = null;

    // Si l'outil d'alignement est actif, aligner à la grille
    if (tool.tool === 0 && uuid) {
      const reference = document.getElementById(uuid);
      const otherElements = Array.from(
        document.querySelector("#momo").children
      );
      const closest = findClosestElement(reference, otherElements);

      if (closest) {
        document.getElementById(uuid).style.top =
          closest.getAttribute("y") + "px";
        document.getElementById(uuid).style.left =
          closest.getAttribute("x") + "px";

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

    // Annuler toute mise à jour d'animation en cours
    if (window.svgUpdateTimer) {
      cancelAnimationFrame(window.svgUpdateTimer);
      window.svgUpdateTimer = null;
    }

    // Mettre à jour les connexions si nécessaire
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

  // Version améliorée de la fonction setDimensions
  const setDimensions = (e, active) => {
    if ((isDown && tool.tool !== 0 && tool.tool < 6 && tool.tool !== -1) || active) {
      const number = 25; // Incrément de taille
      let newWidth = style.width;
      let newHeight = style.height;

      // Mettre à jour les dimensions en fonction du type d'outil
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
        // Rectangle, Parallélogramme ou Autre - dimensions indépendantes
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

      // Vérifier les limites
      const maxX = canvasSize.width - element.x;
      const maxY = canvasSize.height - element.y;

      // Limiter les dimensions pour rester dans les limites
      newWidth = Math.min(newWidth, maxX);
      newHeight = Math.min(newHeight, maxY);

      // Vérifier les collisions avec d'autres éléments
      const hasCollision = checkCollision(parseInt(element.x), parseInt(element.y), newWidth, newHeight, uuid);

      if (!hasCollision) {
        // Mettre à jour le style local
        setStyle((prevStyle) => ({
          ...prevStyle,
          width: newWidth,
          height: newHeight,
        }));

        // Mettre à jour l'élément actif dans le tableau
        updateElementsAndPropagate((prevElements) => {
          return prevElements.map((el) => {
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

  const changeShapeColor = () => {
    // Met à jour la couleur générale dans l'état
    setColor(color);

    updateElementsAndPropagate((prevElements) =>
      prevElements.map((element) => {
        if (element.id === uuid) {
          let updatedElement = { ...element, bgColor: color };
          // Si l'élément est de type 4 ou 5, on génère un background personnalisé
          if (element.type === 4) {
            updatedElement.background = generateSvgBackgroundType4(color);
          } else if (element.type === 5) {
            console.log(color, "newColor2")
            updatedElement.background = generateSvgBackgroundType5(color);
          }
          return updatedElement;
        }
        return element;
      })
    );
  };

  const manageInput = () => {
    tool.tool = -1;
    const el = document.getElementById("input" + uuid);
    if (el) {
      // Rendre l'élément visible
      el.style.display = "flex";

      // Augmenter le z-index pour s'assurer qu'il est au-dessus
      el.style.zIndex = "3";
      el.focus();
      // Mettre le focus sur l'input après un court délai
      setTimeout(() => {
        el.focus();
      }, 10);
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

  const menu = (elementId) => {
    setUuid(elementId);
    const element = document.getElementById(elementId);
    if (element) {
      const shapeMenu = document.querySelector(".shapeMenu");
      if (shapeMenu) {
        shapeMenu.style.display = "flex";
        shapeMenu.style.left =
          parseInt(element.style.left) +
          parseInt(element.style.width) -
          100 +
          "px";
        shapeMenu.style.top = parseInt(element.style.top) - 45 + "px";
        const colorPicker = document.getElementById("ddc");
        const rect = colorPicker.getBoundingClientRect();
        setTopValue(rect.top);
        setLeftValue(rect.left);
      }
    }
  };

  const deleteElement = () => {
    // Supprimer l'élément
    updateElementsAndPropagate((prevElements) =>
      prevElements.filter((element) => element.id !== uuid)
    );

    // Supprimer également toutes les lignes connectées à cet élément
    updateLinesAndPropagate((prevLines) =>
      prevLines.filter((line) => line.source !== uuid && line.target !== uuid)
    );

    // Cacher le menu
    const shapeMenu = document.querySelector(".shapeMenu");
    if (shapeMenu) {
      shapeMenu.style.display = "none";
    }

    // Mettre à jour l'affichage des connexions
    setTimeout(() => {
      updateSvgConnections();
    }, 100);
  };

  // Gestion du zoom
  const handleWheel = (e) => {
    e.preventDefault();

    if (tool.tool === -1) {
      document.querySelector(".openDiv").scrollTo({
        top: 5000,
        left: 5000,
        behavior: "smooth",
      });
      // Déterminer la direction du zoom
      const delta = e.deltaY;

      // Ajuster le zoom (limiter entre 0.5 et 3)

      setZoom((prevZoom) => {
        let newZoom = prevZoom - delta * 0.001;
        return Math.max(0.5, Math.min(3, newZoom));
      });
    }
  };

  const shapeStyleAfter = (width) => {
    console.log(width, "erfg");
    // Sélectionner la div shapeMenu
    const shapeMenu = document.querySelector(".shapeMenu");
    if (!shapeMenu) return;

    // Créer une feuille de style dynamique
    const styleSheet = document.createElement("style");
    document.head.appendChild(styleSheet);

    // Définir le style ::after pour cette classe
    styleSheet.textContent = `
      .shapeMenu::after {
        content:"";
        position: absolute;
        right: 0;
        margin-top: 30px;
        margin-left: -90px;
        width: ${width}px;
        height: 20px;
      }`;

    // Assurez-vous que la div a position relative
    shapeMenu.style.position = "relative";
  };
  const calculateFontSize = (text, width, height) => {
    if (!text) return "14px"; // Taille par défaut

    // Calculer la taille de base en fonction de la largeur disponible
    const baseSize = Math.min(width / (text.length * 0.7), height / 2);

    // Limiter la taille dans une plage raisonnable (entre 9px et 20px)
    return Math.max(9, Math.min(baseSize, 20)) + "px";
  };


  function importJsonFile(file) {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        // Parser directement le contenu JSON
        const parsedData = JSON.parse(event.target.result);
        console.log(parsedData.elements, "parsedData");
        // Mettre à jour l'état

        updateElementsAndPropagate(parsedData.elements);
        updateLinesAndPropagate(parsedData.lines);
        console.log("Fichier importé avec succès");
      } catch (error) {
        console.error('Erreur de parsing JSON:', error);
      }
    };

    // Lire le fichier comme texte
    reader.readAsText(file);
  }
  const [topValue, setTopValue] = useState(0);
  const [leftValue, setLeftValue] = useState(0);
  useEffect(() => {

  }, [isOpen]);

  // 1. Définir correctement les fonctions de propagation
  const updateElementsAndPropagate = useCallback((updaterFn) => {
    // Vérifier s'il s'agit d'une fonction ou d'une valeur directe
    if (typeof updaterFn === 'function') {
      setElements(prevElements => {
        const newElements = updaterFn(prevElements);
        // Notifier le parent seulement après la mise à jour de l'état, pas pendant le rendu
        if (!isInitialRender.current) {
          setTimeout(() => {
            if (propSetElements) propSetElements(newElements);
            if (onDataChange) onDataChange(newElements, lines);
          }, 0);
        }
        return newElements;
      });
    } else {
      // Valeur directe fournie
      setElements(updaterFn);
      // Notifier le parent seulement après la mise à jour de l'état, pas pendant le rendu
      if (!isInitialRender.current) {
        setTimeout(() => {
          if (propSetElements) propSetElements(updaterFn);
          if (onDataChange) onDataChange(updaterFn, lines);
        }, 0);
      }
    }
  }, [propSetElements, onDataChange, lines]);

  const updateLinesAndPropagate = useCallback((updaterFn) => {
    // Vérifier s'il s'agit d'une fonction ou d'une valeur directe
    if (typeof updaterFn === 'function') {
      setLines(prevLines => {
        const newLines = updaterFn(prevLines);
        // Notifier le parent seulement après la mise à jour de l'état, pas pendant le rendu
        if (!isInitialRender.current) {
          setTimeout(() => {
            if (propSetLines) propSetLines(newLines);
            if (onDataChange) onDataChange(elements, newLines);
          }, 0);
        }
        return newLines;
      });
    } else {
      // Valeur directe fournie
      setLines(updaterFn);
      // Notifier le parent seulement après la mise à jour de l'état, pas pendant le rendu
      if (!isInitialRender.current) {
        setTimeout(() => {
          if (propSetLines) propSetLines(updaterFn);
          if (onDataChange) onDataChange(elements, updaterFn);
        }, 0);
      }
    }
  }, [propSetLines, onDataChange, elements]);

  // 2. Mettre à jour les effets pour qu'ils utilisent les fonctions correctes
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

  // 3. Pour useImperativeHandle, utiliser les fonctions setElements et setLines
  useImperativeHandle(ref, () => ({
    updateData: (newElements, newLines) => {
      setElements(newElements);
      setLines(newLines);
    }
  }));

  const hasDuplicates = elements.map(el => el.id).some((id, index, array) =>
    array.indexOf(id) !== index
  );
  console.log("Duplicate IDs found:", hasDuplicates);

  useEffect(() => {
    // Si tous les éléments nécessaires sont chargés, marquer comme prêt
    const timer = setTimeout(() => {
      if (!isInternallyLoaded) {
        setIsInternallyLoaded(true);
      }
    }, 1000); // Garantir que le composant sera marqué comme chargé après 1 seconde

    return () => clearTimeout(timer);
  }, []);


  const [nzoom, setNzoom] = useState("100%");

  const zoomFunc = (i) => {
    const container = document.querySelector(".openDiv");
    const rect = container.getBoundingClientRect();
    if (i < 2) {
      container.style.zoom = i == 0 ? (parseInt(container.style.zoom) + 5) + "%" : (parseInt(container.style.zoom) - 5) + "%";
      setNzoom(container.style.zoom);
    } else {
      container.style.zoom = "100%";
      setNzoom("100%");
    }



    console.log(rect.height, "zoom")
  };

  const ZoomControls = () => {
    return (
      <div className="zoom-controls" style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        zIndex: 1000,
        display: "flex",
        gap: "10px",
        background: "rgba(255, 255, 255, 0.8)",
        padding: "5px",
        borderRadius: "5px"
      }}>
        <button onClick={() => zoomFunc(1)}
          style={{ width: "30px", height: "30px" }}>-</button>
        <div style={{ display: "flex", alignItems: "center" }}>{nzoom}</div>
        <button onClick={() => zoomFunc(0)}
          style={{ width: "30px", height: "30px" }}>+</button>
        <button onClick={() => zoomFunc(2)}
          style={{ width: "auto", padding: "0 10px" }}>Reset</button>
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
        }}
      >

        <div
          ref={containerRef}
          onWheel={(e) => [handleWheel(e), console.log(zoom, "icic")]}
          className="openDiv"
          onMouseDown={(e) => {
            // Vérifier si on peut créer un nouvel élément
            if (
              tool.tool > 0 &&
              tool.tool < 6 &&
              (document.querySelector(".shapeMenu")?.style.display === "none" ||
                document.querySelector(".shapeMenu")?.style.display === "")
            ) {
              mouseIsDown(e);
            } else if (tool.tool == -1) {
              document.getElementById("input" + uuid).style.zIndex = 1;
            }
          }}
          onMouseUp={mouseIsUp}
          style={{
            position: "relative",
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            background: "white",
            // Add scrollable areas with infinite canvas feeling
            overflowX: "scroll",
            overflowY: "scroll",
            transform: `scale(${zoom})`,
            transformOrigin: "top left",

            transition: "transform 0.1s ease",
            zoom: "100%",
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
                        <polygon points="0 0, 10 3.5, 0 7" fill={conn.color} />
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

          <div
            className="shapeMenu"
            onMouseOver={() => menu(uuid)}
            onMouseOut={() => {
              isOpen ? null : document.querySelector(".shapeMenu").style.display = "none";
            }}
          >
            <img src="/icons/policeIcon.png" onClick={() => manageInput()} />
            <div id="ddc">
              <PopoverPicker
                color={color}
                isOpen={isOpen}             // Passe l'état au composant enfant
                setIsOpen={setIsOpen}
              />

            </div>
            <img onClick={() => deleteElement()} src="/icons/trash.png" />
          </div>

          {/* Rendu des éléments */}
          {elements
            .filter((el) => el.id)
            .map((elementStyle) => (
              <div
                onMouseUp={mouseIsUp}
                onMouseOut={() => {
                  [
                    isOpen ? null : document.querySelector(".shapeMenu").style.display = "none"];
                  //, setIsOpen(false)
                }}
                onMouseOver={() => {
                  [
                    !isDown && tool.tool < 6 ? [setColor(elementStyle.bgColor), setTimeout(() => { menu(elementStyle.id) }, 50)] : null,
                  ]
                  // setTimeout(() => {
                  //   setIsOpen(true);
                  // }, 500);
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
                  background: elementStyle.type === 4 || elementStyle.type === 5
                    ? elementStyle.background
                    : elementStyle.bgColor,
                  transform: elementStyle.transform,
                  cursor: tool.tool === 0 ? "move" : "default",
                }}
                shape-type={elementStyle.type}
              >
                <textarea
                  onMouseDown={(e) => {
                    select(e, elementStyle.id);
                  }}
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
                            ? "skewX(15deg)"
                            : ""
                        }`
                        : ""),
                    textAlign: "center",
                    display: "block",
                    opacity: elementStyle.text ? "1" : "0.7",
                    resize: "none", // Empêche le redimensionnement manuel
                    overflow: "auto", // Permet le défilement si nécessaire
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
      {isOpen && (
        <div onMouseLeave={() => [document.querySelector(".shapeMenu").style.display = "none", setIsOpen(false)]} id="bbn" style={{ zIndex: "10", top: `${topValue + 40}px`, left: `${leftValue}px` }} className="popover" ref={popover} onMouseOver={() => console.log("over")}>
          <HexColorPicker color={color} onChange={(newColor) => {
            setColor(newColor);

          }} onMouseUp={() => changeShapeColor()} />
        </div>
      )}
      <ZoomControls />
    </div>
  );
});
export default MainLogigramme;
