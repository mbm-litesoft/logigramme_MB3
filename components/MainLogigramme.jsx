"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { stringify, v4 as uuidv4 } from "uuid";
import { PopoverPicker } from "./PopoverPicker";

export default function MainLogigramme({ tool, onUuidChange }) {
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
  const [elements, setElements] = useState([]);
  const [lines, setLines] = useState([]);
  const [uuid, setUuid] = useState("");
  const [svgConnections, setSvgConnections] = useState([]); // État pour les connexions SVG

  const [blockLeft, setBlockLeft] = useState(false);
  const [blockRight, setBlockRight] = useState(false);
  const [blockBottom, setBlockBottom] = useState(false);
  const [blockTop, setBlockTop] = useState(false);

  const [dotPosition, setDotPosition] = useState([0, 0]);
  const [color, setColor] = useState("#eeee");
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

  const saveToJson = () => {
    const data = elements;

    console.log(elements);
    

   // console.log(JSON.stringify(data["mm"]) )
   const content = [JSON.stringify(data),lines]
      
   // Créer un Blob avec le contenu
      const blob = new Blob([content], { type: 'text/plain' });
      
      // Créer un lien de téléchargement
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = "momo";
      
      // Déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      
      // Nettoyer
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    
    
    // Utilisation
    saveTextFile('Contenu du fichier', 'mon-fichier.json');
  };



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
        setLines((prevLines) => [...prevLines, newLine]);
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
          this.style.backgroundColor = dotHoverColor;
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

  const setElementPosition = (e) => {
    if (isDown && uuid !== null) {
      const el = elements.find((el) => el.id === uuid);
      if (!el) return;

      const rect1 = document.getElementById(uuid).getBoundingClientRect();
      const rect3 = document.querySelector(".openDiv").getBoundingClientRect();

      // Définir l'ID de l'élément en cours de déplacement
      window.movingElementId = uuid;

      // Vérifier les limites
      if (rect1.right > rect3.right - 10) {
        setBlockRight(true);
      } else if (rect1.left < rect3.left + 8) {
        setBlockLeft(true);
        el.x = 8;
      } else if (rect1.top < rect3.top) {
        setBlockTop(true);
        el.y = 0;
      } else if (rect1.bottom > rect3.bottom) {
        setBlockBottom(true);
      } else {
        // Si on n'est pas bloqué, on peut bouger librement
        if (!blockLeft && !blockRight && !blockTop && !blockBottom) {
          setElements((prevElements) => {
            return prevElements.map((element) => {
              if (element.id === uuid) {
                return {
                  ...element,
                  x: parseInt(element.x) + e.movementX,
                  y: parseInt(element.y) + e.movementY,
                };
              } else {
                return element;
              }
            });
          });
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

      // Mettre à jour les connexions SVG après déplacement
      if (lines.length > 0) {
        // Utiliser requestAnimationFrame pour limiter les mises à jour graphiques
        if (window.svgUpdateTimer) {
          cancelAnimationFrame(window.svgUpdateTimer);
        }

        window.svgUpdateTimer = requestAnimationFrame(() => {
          updateSvgConnections();
        });
      }
    }
  };

  const mouseIsDown = (e) => {
    if (tool.tool !== 0 && tool.tool < 6) {
      setMouseIsDown(true);

      // Générer un nouvel UUID pour cet élément
      const newId = uuidv4();

      // Définir une forme avec dimensions par défaut
      let newShape = {
        id: newId,
        x: dotPosition[0],
        y: dotPosition[1],
        width: defaultDimensions.current.width,
        height: defaultDimensions.current.height,
        bgColor: "white",
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
            width: newShape.width,
            height: newShape.height,
            bgColor: "none",
            border: "none",
          };
          break;
        case 5: // Autre forme
          newShape = {
            ...newShape,
            type: 5,
            width: newShape.width,
            height: newShape.height,
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
      setElements((prevElements) => [...prevElements, newShape]);

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
      const distance = Math.sqrt(Math.pow(refX - x, 2) + Math.pow(refY - y, 2));

      if (distance < minDistance) {
        minDistance = distance;
        closestElement = element;
      }
    });

    return closestElement;
  };

  const mouseIsUp = () => {
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

        setElements((prevElements) => {
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
      setElements((prevElements) => {
        return prevElements.map((element) => {
          if (element.id === uuid) {
            shapeStyleAfter(style.width);
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

  const changeShapeColor = (newColor) => {
    setElements((prevElements) => {
      return prevElements.map((element) => {
        if (element.id === uuid) {
          return {
            ...element,
            bgColor: newColor,
          };
        } else {
          return element;
        }
      });
    });
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
      setElements((prevElements) => {
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
      }
    }
  };

  const deleteElement = () => {
    // Supprimer l'élément
    setElements((prevElements) =>
      prevElements.filter((element) => element.id !== uuid)
    );

    // Supprimer également toutes les lignes connectées à cet élément
    setLines((prevLines) =>
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

  const [jsonData, setJsonData ] = useState()
  function importJsonFile(file) {
    const openFile = new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        
        try {
          // Parser le contenu JSON
          setJsonData(JSON.parse(event.target.result))
          
          resolve(jsonData);
         
         
        } catch (error) {
          reject(new Error('Erreur de parsing JSON'));
        }
      };
  
      // Lire le fichier comme texte
      reader.readAsText(file);
    } );
    openFile.then(() => {
console.log(lines, "ff")
        setElements(jsonData)

    })

    
  }
  
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
        className="col fullHeight"
        style={{
          border: "2px solid #333",
          padding: "15px",
          margin: "0 auto",
          overflow: "auto",
          boxSizing: "border-box",
        }}
      >
        <div onClick={() => [saveToJson(), console.log(elements)]}>save</div>
       
        <div>
      <input 
        type="file" 
        onChange={(e) => importJsonFile(e.target.files[0])}
      />

   

        </div>
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
              document.querySelector(".shapeMenu").style.display = "none";
            }}
          >
            <img src="/icons/policeIcon.png" onClick={() => manageInput()} />

            <PopoverPicker
              color={color}
              onChange={(newColor) => {
                setColor(newColor);
                changeShapeColor(newColor);
              }}
            />
            <img onClick={() => deleteElement()} src="/icons/trash.png" />
          </div>

          {/* Rendu des éléments */}
          {elements
            .filter((el) => el.id)
            .map((elementStyle) => (
              <div
                onMouseUp={mouseIsUp}
                onMouseOut={() => {
                  document.querySelector(".shapeMenu").style.display = "none";
                }}
                onMouseOver={() => {
                  !isDown && tool.tool < 6 ? menu(elementStyle.id) : null;
                }}
                id={elementStyle.id}
                className="shape-elementy"
                onMouseDown={(e) => select(e, elementStyle.id)}
                key={elementStyle.id}
                style={{
                  position: "absolute",
                  left: `${elementStyle.x}px`,
                  top: `${elementStyle.y}px`,
                  width: `${elementStyle.width}px`,
                  height: `${elementStyle.height}px`,
                  borderRadius: elementStyle.radius,
                  border: elementStyle.border,
                  backgroundColor: elementStyle.bgColor,
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
                        ? ` ${
                            elementStyle.transform.includes("rotate")
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
    </div>
  );
}
