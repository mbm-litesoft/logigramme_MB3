"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
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
              // Essayer d'obtenir directement le point de connexion (dot)
              const sourceDotId = `dot-${line.source}-${line.sourceSide}`;
              const sourceDot = document.getElementById(sourceDotId);

              if (sourceDot) {
                // Calculer la position relative du dot par rapport au container
                const dotRect = sourceDot.getBoundingClientRect();
                sourceX = dotRect.left + dotRect.width / 2 - containerRect.left;
                sourceY = dotRect.top + dotRect.height / 2 - containerRect.top;
              } else {
                // Ajustements précis pour chaque coin du losange
                switch (line.sourceSide) {
                  case "top-right":
                    sourceX = sourceRect.right - containerRect.left - 6;
                    sourceY = sourceRect.top - containerRect.top + 6;
                    break;
                  case "bottom-right":
                    sourceX = sourceRect.right - containerRect.left - 6;
                    sourceY = sourceRect.bottom - containerRect.top - 6;
                    break;
                  case "bottom-left":
                    sourceX = sourceRect.left - containerRect.left + 6;
                    sourceY = sourceRect.bottom - containerRect.top - 6;
                    break;
                  case "top-left":
                    sourceX = sourceRect.left - containerRect.left + 6;
                    sourceY = sourceRect.top - containerRect.top + 6;
                    break;
                  default:
                    // Pour les autres côtés (si jamais utilisés)
                    sourceX =
                      sourceRect.left +
                      sourceRect.width / 2 -
                      containerRect.left;
                    sourceY =
                      sourceRect.top +
                      sourceRect.height / 2 -
                      containerRect.top;
                }
              }
            } else {
              // Calcul standard pour les autres formes
              switch (line.sourceSide) {
                case "top":
                  sourceX =
                    sourceRect.left + sourceRect.width / 2 - containerRect.left;
                  sourceY = sourceRect.top - containerRect.top;
                  break;
                case "right":
                  sourceX = sourceRect.right - containerRect.left;
                  sourceY =
                    sourceRect.top + sourceRect.height / 2 - containerRect.top;
                  break;
                case "bottom":
                  sourceX =
                    sourceRect.left + sourceRect.width / 2 - containerRect.left;
                  sourceY = sourceRect.bottom - containerRect.top;
                  break;
                case "left":
                  sourceX = sourceRect.left - containerRect.left;
                  sourceY =
                    sourceRect.top + sourceRect.height / 2 - containerRect.top;
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
              // Essayer d'obtenir directement le point de connexion (dot)
              const targetDotId = `dot-${line.target}-${line.targetSide}`;
              const targetDot = document.getElementById(targetDotId);

              if (targetDot) {
                // Calculer la position relative du dot par rapport au container
                const dotRect = targetDot.getBoundingClientRect();
                targetX = dotRect.left + dotRect.width / 2 - containerRect.left;
                targetY = dotRect.top + dotRect.height / 2 - containerRect.top;
              } else {
                // Ajustements précis pour chaque coin du losange
                switch (line.targetSide) {
                  case "top-right":
                    targetX = targetRect.right - containerRect.left - 6;
                    targetY = targetRect.top - containerRect.top + 6;
                    break;
                  case "bottom-right":
                    targetX = targetRect.right - containerRect.left - 6;
                    targetY = targetRect.bottom - containerRect.top - 6;
                    break;
                  case "bottom-left":
                    targetX = targetRect.left - containerRect.left + 6;
                    targetY = targetRect.bottom - containerRect.top - 6;
                    break;
                  case "top-left":
                    targetX = targetRect.left - containerRect.left + 6;
                    targetY = targetRect.top - containerRect.top + 6;
                    break;
                  default:
                    // Pour les autres côtés (si jamais utilisés)
                    targetX =
                      targetRect.left +
                      targetRect.width / 2 -
                      containerRect.left;
                    targetY =
                      targetRect.top +
                      targetRect.height / 2 -
                      containerRect.top;
                }
              }
            } else {
              // Calcul standard pour les autres formes
              switch (line.targetSide) {
                case "top":
                  targetX =
                    targetRect.left + targetRect.width / 2 - containerRect.left;
                  targetY = targetRect.top - containerRect.top;
                  break;
                case "right":
                  targetX = targetRect.right - containerRect.left;
                  targetY =
                    targetRect.top + targetRect.height / 2 - containerRect.top;
                  break;
                case "bottom":
                  targetX =
                    targetRect.left + targetRect.width / 2 - containerRect.left;
                  targetY = targetRect.bottom - containerRect.top;
                  break;
                case "left":
                  targetX = targetRect.left - containerRect.left;
                  targetY =
                    targetRect.top + targetRect.height / 2 - containerRect.top;
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

            let sourceControlX, sourceControlY, targetControlX, targetControlY;

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
    if (
      document.querySelector(".shapeMenu").style.display == "flex" &&
      isDown
    ) {
      document.querySelector(".shapeMenu").style.display = "none";
    }

    if (!isDown || !uuid) return;

    const el = elements.find((el) => el.id === uuid);
    if (!el) return;

    const rect1 = document.getElementById(uuid).getBoundingClientRect();
    const rect3 = document.querySelector(".openDiv").getBoundingClientRect();

    // Vérifier les limites
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

    // Si on est pas bloqué, on peut bouger librement
    if (canMove && !blockLeft && !blockRight && !blockTop && !blockBottom) {
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

  // Fonction optimisée pour créer un modèle de points sur la grille
  const createDotPattern = () => {
    // Vérifier si le conteneur existe déjà
    if (document.getElementById("momo")) return;

    const container = document.querySelector(".openDiv");
    if (!container) return;

    // Constantes
    const dotBgColor = "#00000050";
    const spacing = 25;
    const windowWidth = 2500;
    const windowHeight = 3000;

    // Créer le conteneur avec toutes les propriétés définies en une fois
    const dotContainer = document.createElement("div");
    Object.assign(dotContainer.style, {
      position: "absolute",
      top: "8px",
      left: "8px",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });
    dotContainer.id = "momo";

    // Utiliser un DocumentFragment pour améliorer les performances
    const fragment = document.createDocumentFragment();

    // Calculer le nombre de points à créer
    const dotsX = Math.floor(windowWidth / spacing);
    const dotsY = Math.floor(windowHeight / spacing);

    // Créer un template pour les dots pour éviter de recréer le même HTML
    const dotTemplate = document.createElement("div");
    Object.assign(dotTemplate.style, {
      position: "absolute",
      width: "3px",
      height: "3px",
      backgroundColor: dotBgColor,
      borderRadius: "50%",
      pointerEvents: "auto",
    });
    dotTemplate.classList.add("zone");

    // Fonction de création unique pour éviter la surcharge des closures
    const handleDotHover = (e) => {
      const target = e.target;
      const x = target.getAttribute("x");
      const y = target.getAttribute("y");

      if (x && y) {
        setDotPosition([x, y]);
      }
    };

    // Optimisation: création par lots et utilisation de clonage
    // Créer les points par lots de 500 pour éviter de bloquer le thread principal
    const batchSize = 500;
    let dotsCreated = 0;
    let currentBatch = 0;
    const totalDots = dotsX * dotsY;

    const processBatch = () => {
      const batchStart = currentBatch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, totalDots);

      for (let i = batchStart; i < batchEnd; i++) {
        const x = i % dotsX;
        const y = Math.floor(i / dotsX);

        // Cloner le template est beaucoup plus performant que créer un nouvel élément
        const dot = dotTemplate.cloneNode(false);

        // Positionner le point
        const xPos = x * spacing;
        const yPos = y * spacing;

        dot.style.left = `${xPos}px`;
        dot.style.top = `${yPos}px`;
        dot.setAttribute("x", `${xPos + 8}`);
        dot.setAttribute("y", `${yPos + 8}`);

        // Utiliser la délégation d'événements au lieu d'attacher un événement à chaque point
        // Ceci est fait au niveau du conteneur pour économiser la mémoire

        fragment.appendChild(dot);
      }

      dotsCreated += batchEnd - batchStart;
      currentBatch++;

      if (dotsCreated < totalDots) {
        // Traiter le prochain lot sur le prochain frame d'animation
        requestAnimationFrame(processBatch);
      } else {
        // Tous les points sont créés, ajouter le fragment au DOM
        dotContainer.appendChild(fragment);
        container.appendChild(dotContainer);

        // Ajouter un seul écouteur d'événement sur le conteneur (délégation d'événements)
        dotContainer.addEventListener(
          "mouseover",
          (e) => {
            if (e.target.classList.contains("zone")) {
              handleDotHover(e);
            }
          },
          { passive: true }
        );
      }
    };

    // Démarrer le traitement par lots
    requestAnimationFrame(processBatch);
  };
  useEffect(() => {
    createDotPattern();
  }, []);

  const select = (e, id) => {
    setMouseIsDown(true);
    setUuid(id);
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
    menu(uuid);
    setMouseIsDown(false);

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
  return (
    <div style={{ flex: "auto", width: "84%" }}>
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
        <div
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
            width: "2500px",
            height: "3000px",
            background: "white",
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
            <div
              onClick={() => {
                tool.tool = -1;
              }}
            >
              <PopoverPicker
                color={color}
                onChange={(newColor) => {
                  setColor(newColor);
                  changeShapeColor(newColor);
                }}
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
