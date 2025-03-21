"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { PopoverPicker } from "./PopoverPicker";

export default function MainLogigramme({ tool }) {
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
    if (tool.tool === 6) { // Outil de connexion
      // Afficher les points de connexion sur tous les éléments
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
      dots.forEach(dot => {
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

  // Fonction pour créer et afficher les points de connexion en fonction du type de forme
  const showConnectionPoints = (element) => {
    if (!element) return;
    
    console.log("Showing connection points for:", element.id);
    
    try {
      // Supprimer les points existants pour éviter les doublons
      const existingDots = element.querySelectorAll(".connection-dot");
      existingDots.forEach(dot => dot.remove());
      
      const shapeType = parseInt(element.getAttribute("shape-type"));
      const elementId = element.id;
      
      // Déterminer le nombre et la position des points en fonction du type de forme
      let positions = [];
      
      if (shapeType === 2 || shapeType === 3) {
        // Cercle ou losange - 4 points (haut, droite, bas, gauche)
        positions = [
          { side: "top", top: "-10px", left: "50%", transform: "translateX(-50%)" },
          { side: "right", top: "50%", right: "-10px", transform: "translateY(-50%)" },
          { side: "bottom", bottom: "-10px", left: "50%", transform: "translateX(-50%)" },
          { side: "left", top: "50%", left: "-10px", transform: "translateY(-50%)" }
        ];
      } else {
        // Rectangle ou parallélogramme - 8 points
        positions = [
          { side: "top", top: "-10px", left: "50%", transform: "translateX(-50%)" },
          { side: "top-right", top: "-10px", right: "0", transform: "translate(50%, 0)" },
          { side: "right", top: "50%", right: "-10px", transform: "translateY(-50%)" },
          { side: "bottom-right", bottom: "-10px", right: "0", transform: "translate(50%, 0)" },
          { side: "bottom", bottom: "-10px", left: "50%", transform: "translateX(-50%)" },
          { side: "bottom-left", bottom: "-10px", left: "0", transform: "translate(-50%, 0)" },
          { side: "left", top: "50%", left: "-10px", transform: "translateY(-50%)" },
          { side: "top-left", top: "-10px", left: "0", transform: "translate(-50%, 0)" }
        ];
      }
      
      // Créer et ajouter les points de connexion
      positions.forEach(pos => {
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
          display: "block"
        });
        
        // Positionner le point
        Object.keys(pos).forEach(key => {
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
          if (!(sourceElement === elementId && sourceDot && sourceDot.side === pos.side)) {
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

  // Fonction pour gérer le clic sur un point de connexion
  // Fonction pour gérer le clic sur un point de connexion
const handleDotClick = (elementId, dot, side) => {
  console.log("Dot clicked:", elementId, side, "Source element ref:", sourceElementRef.current);
  
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
      const targetElement = elementId;
      const targetSide = side;
      
      // Créer une nouvelle ligne avec un ID unique
      const lineId = uuidv4();
      console.log("Creating new line:", sourceElementRef.current, sourceSideRef.current, "to", targetElement, targetSide);
      
      const newLine = {
        id: lineId,
        source: sourceElementRef.current,
        sourceSide: sourceSideRef.current,
        target: targetElement,
        targetSide: targetSide,
        color: "#2c3e50",
        thickness: 2
      };
      
      // Ajouter la nouvelle ligne à la liste des lignes
      setLines(prevLines => {
        const updatedLines = [...prevLines, newLine];
        console.log("Updated lines:", updatedLines);
        return updatedLines;
      });
      
    }
    
    // Réinitialiser la sélection dans tous les cas
    if (sourceDotRef.current) {
      sourceDotRef.current.style.backgroundColor = "#3498db"; // Remettre le point source à sa couleur d'origine
    }
    sourceElementRef.current = null;
    sourceSideRef.current = null;
    sourceDotRef.current = null;
    
    // Mettre à jour les connexions SVG
    setTimeout(() => {
      updateSvgConnections();
    }, 300);
  }
};

  

  // Fonction pour mettre à jour les connexions SVG
  const updateSvgConnections = () => {
    try {
      console.log("Updating SVG connections, lines:", lines);
      
      if (!lines || lines.length === 0) {
        setSvgConnections([]);
        return;
      }
      
      // Faire une copie profonde des lignes pour éviter les mutations
      const linesData = JSON.parse(JSON.stringify(lines));
      
      const newConnections = linesData.map(line => {
        try {
          // Forcer la récupération des éléments DOM à chaque fois
          const sourceElement = document.getElementById(line.source);
          const targetElement = document.getElementById(line.target);
          
          if (!sourceElement || !targetElement) {
            console.log(`Elements not found: source=${line.source}, target=${line.target}`);
            return null;
          }
          
          // Obtenir les rectangles englobants
          const sourceRect = sourceElement.getBoundingClientRect();
          const targetRect = targetElement.getBoundingClientRect();
          const containerRect = document.querySelector(".openDiv").getBoundingClientRect();
          
          console.log("Rectangles calculés:", {
            source: { 
              width: sourceRect.width, 
              height: sourceRect.height, 
              left: sourceRect.left, 
              top: sourceRect.top 
            },
            target: { 
              width: targetRect.width, 
              height: targetRect.height, 
              left: targetRect.left, 
              top: targetRect.top 
            }
          });
          
          // Calculer les points de départ et d'arrivée
          let sourceX, sourceY, targetX, targetY;
          
          // Source point
          switch (line.sourceSide) {
            case "top":
              sourceX = sourceRect.left + sourceRect.width/2 - containerRect.left;
              sourceY = sourceRect.top - containerRect.top;
              break;
            case "right":
              sourceX = sourceRect.right - containerRect.left;
              sourceY = sourceRect.top + sourceRect.height/2 - containerRect.top;
              break;
            case "bottom":
              sourceX = sourceRect.left + sourceRect.width/2 - containerRect.left;
              sourceY = sourceRect.bottom - containerRect.top;
              break;
            case "left":
              sourceX = sourceRect.left - containerRect.left;
              sourceY = sourceRect.top + sourceRect.height/2 - containerRect.top;
              break;
            default:
              // Points aux coins
              if (line.sourceSide && line.sourceSide.includes("top")) {
                sourceY = sourceRect.top - containerRect.top;
              } else if (line.sourceSide && line.sourceSide.includes("bottom")) {
                sourceY = sourceRect.bottom - containerRect.top;
              } else {
                sourceY = sourceRect.top + sourceRect.height/2 - containerRect.top;
              }
              
              if (line.sourceSide && line.sourceSide.includes("left")) {
                sourceX = sourceRect.left - containerRect.left;
              } else if (line.sourceSide && line.sourceSide.includes("right")) {
                sourceX = sourceRect.right - containerRect.left;
              } else {
                sourceX = sourceRect.left + sourceRect.width/2 - containerRect.left;
              }
          }
          
          // Target point
          switch (line.targetSide) {
            case "top":
              targetX = targetRect.left + targetRect.width/2 - containerRect.left;
              targetY = targetRect.top - containerRect.top;
              break;
            case "right":
              targetX = targetRect.right - containerRect.left;
              targetY = targetRect.top + targetRect.height/2 - containerRect.top;
              break;
            case "bottom":
              targetX = targetRect.left + targetRect.width/2 - containerRect.left;
              targetY = targetRect.bottom - containerRect.top;
              break;
            case "left":
              targetX = targetRect.left - containerRect.left;
              targetY = targetRect.top + targetRect.height/2 - containerRect.top;
              break;
            default:
              // Points aux coins
              if (line.targetSide && line.targetSide.includes("top")) {
                targetY = targetRect.top - containerRect.top;
              } else if (line.targetSide && line.targetSide.includes("bottom")) {
                targetY = targetRect.bottom - containerRect.top;
              } else {
                targetY = targetRect.top + targetRect.height/2 - containerRect.top;
              }
              
              if (line.targetSide && line.targetSide.includes("left")) {
                targetX = targetRect.left - containerRect.left;
              } else if (line.targetSide && line.targetSide.includes("right")) {
                targetX = targetRect.right - containerRect.left;
              } else {
                targetX = targetRect.left + targetRect.width/2 - containerRect.left;
              }
          }
          
          console.log("Points calculés:", {
            source: { x: sourceX, y: sourceY },
            target: { x: targetX, y: targetY }
          });
          
          // Valider que les points sont des nombres valides
          if (isNaN(sourceX) || isNaN(sourceY) || isNaN(targetX) || isNaN(targetY)) {
            console.error("Points de connexion invalides:", { sourceX, sourceY, targetX, targetY });
            return null;
          }
          
          // Calculer les points de contrôle pour la courbe
          const controlDistance = Math.min(
            Math.abs(targetX - sourceX), 
            Math.abs(targetY - sourceY)
          ) / 2 + 50;
          
          let sourceControlX, sourceControlY, targetControlX, targetControlY;
          
          // Source control point
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
                sourceControlY = sourceY - controlDistance/2;
              } else {
                sourceControlY = sourceY + controlDistance/2;
              }
              if (line.sourceSide && line.sourceSide.includes("right")) {
                sourceControlX = sourceX + controlDistance/2;
              } else {
                sourceControlX = sourceX - controlDistance/2;
              }
          }
          
          // Target control point
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
                targetControlY = targetY - controlDistance/2;
              } else {
                targetControlY = targetY + controlDistance/2;
              }
              if (line.targetSide && line.targetSide.includes("right")) {
                targetControlX = targetX + controlDistance/2;
              } else {
                targetControlX = targetX - controlDistance/2;
              }
          }
          
          // Créer le chemin SVG avec courbe de Bézier
          const path = `M ${sourceX},${sourceY} C ${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`;
          console.log("Chemin SVG créé:", path);
          
          return {
            id: line.id,
            path,
            color: line.color || "#ff0000", // Rouge vif pour tester la visibilité
            thickness: line.thickness || 3   // Plus épais pour tester la visibilité
          };
        } catch (error) {
          console.error("Error calculating connection for line:", line, error);
          return null;
        }
      }).filter(conn => conn !== null);
      
      console.log("New SVG connections:", newConnections);
      
      if (newConnections.length > 0) {
        setSvgConnections(newConnections);
      }
      setTimeout(() => {
        // Forcer un re-rendu des connexions SVG
        const temp = [...svgConnections];
        setSvgConnections([]);
        setTimeout(() => {
          setSvgConnections(temp);
        }, 10);
      }, 1000);
    } catch (error) {
      console.error("Error in updateSvgConnections:", error);
    }
  };

  // Fonction pour créer un modèle de points sur la grille
  function createDotPattern() {
    const dotBgColor = "#00000050";
    const dotHoverColor = "black";
    // Créer un conteneur pour les points
    const dotContainer = document.createElement("div");
    dotContainer.style.position = "absolute";
    dotContainer.style.top = "8px";
    dotContainer.style.left = "8px";
    dotContainer.style.width = "100%";
    dotContainer.style.height = "100%";
    dotContainer.style.pointerEvents = "none"; // Pour que les clics passent à travers
    dotContainer.id = "momo";
    
    // Dimensions de la fenêtre
    const windowWidth = 2500;
    const windowHeight = 3000;

    // Espacement entre les points en pixels
    const spacing = 25;

    // Calculer le nombre de points dans chaque dimension
    const dotsX = Math.floor(windowWidth / spacing);
    const dotsY = Math.floor(windowHeight / spacing);

    // Créer les points et les positionner sur une grille
    for (let y = 0; y < dotsY; y++) {
      for (let x = 0; x < dotsX; x++) {
        const dot = document.createElement("div");

        // Styler le point
        dot.style.position = "absolute";
        dot.style.width = "3px";
        dot.style.height = "3px";
        dot.style.backgroundColor = dotBgColor;
        dot.style.borderRadius = "50%";
        dot.setAttribute("x", `${x * spacing + 8}`);
        dot.setAttribute("y", `${y * spacing + 8}`);
        dot.classList.add("zone");
        // Positionner le point
        dot.style.left = `${x * spacing}px`;
        dot.style.top = `${y * spacing}px`;
        dot.style.pointerEvents = "auto"; // Les points peuvent recevoir des événements

        // Rendre les points plus interactifs
        dot.addEventListener("mouseover", function () {
          this.style.backgroundColor = dotHoverColor;
          setDotPosition([this.getAttribute("x"), this.getAttribute("y")]);
        });

        // Ajouter le point au conteneur
        dotContainer.appendChild(dot);
      }
    }

    // Ajouter le conteneur au corps du document
    document.querySelector(".openDiv").appendChild(dotContainer);
  }

  useEffect(() => {
    createDotPattern();
  }, []);

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
        // Si on est pas bloqué, on peut bouger librement
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
        updateSvgConnections();
      }
    }
  };

  const mouseIsDown = (e) => {
    if (tool.tool !== 0 && tool.tool !== 6) {
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
    setMouseIsDown(false);

    // Si l'outil d'alignement est actif, aligner à la grille
    if (tool.tool === 0 && uuid) {
      const reference = document.getElementById(uuid);
      const otherElements = Array.from(document.querySelector("#momo").children);
      const closest = findClosestElement(reference, otherElements);
      
      if (closest) {
        document.getElementById(uuid).style.top = closest.getAttribute("y") + "px";
        document.getElementById(uuid).style.left = closest.getAttribute("x") + "px";
        
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

  const setDimensions = (e) => {
    if (isDown && tool.tool !== 0 && tool.tool !== 6) {
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
            afters(style.width);
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
    tool.tool = 0;
    const el = document.getElementById("input" + uuid);
    if (el) {
      el.style.zIndex = 10;
      el.removeAttribute("disabled");
      el.focus();
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
        shapeMenu.style.left = (parseInt(element.style.left) + parseInt(element.style.width) - 100) + "px";
        shapeMenu.style.top = (parseInt(element.style.top) - 45) + "px";
      }
    }
  };

  const deleteElement = () => {
    // Supprimer l'élément
    setElements((prevElements) => 
      prevElements.filter(element => element.id !== uuid)
    );

    // Supprimer également toutes les lignes connectées à cet élément
    setLines((prevLines) => 
      prevLines.filter(line => line.source !== uuid && line.target !== uuid)
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

  const afters = (width) => {
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
        margin-top: 30px;
        margin-left: -90px;
        width: ${width}px;
        height: 44px;
      }`;

    // Assurez-vous que la div a position relative
    shapeMenu.style.position = "relative";
  };

  return (
    <div style={{ flex: "auto", width: "84%" }}>
      <div
        id="boxs"
        onMouseMove={(e) => {
          if (isDown) {
            if (tool.tool !== 0 && tool.tool !== 6) {
              setDimensions(e);
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
            if ((tool.tool !== 0 && tool.tool !== 6) && 
                (document.querySelector(".shapeMenu")?.style.display === "none" || 
                 document.querySelector(".shapeMenu")?.style.display === "")) {
              mouseIsDown(e);
              
              // Désactiver l'input si nécessaire
              const inputEl = document.getElementById("input" + uuid);
              if (inputEl) {
                inputEl.setAttribute("disabled", true);
              }
            } else if (document.getElementById("input" + uuid)) {
              document.getElementById("input" + uuid).setAttribute("disabled", true);
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
              zIndex: 9000
            }}
          >
            <defs>
              {svgConnections && svgConnections.map(conn => (
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
              ))}
            </defs>
            
            {svgConnections && svgConnections.map(conn => (
              <path
                key={`path-${conn.id}`}
                d={conn.path}
                stroke={conn.color}
                strokeWidth={conn.thickness}
                fill="none"
                markerEnd={`url(#arrowhead-${conn.id})`}
              />
            ))}
            
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
            <img
              onClick={() => deleteElement()}
              src="/icons/trash.png"
            />
          </div>
          
          {/* Rendu des éléments */}
          {elements.filter(el => el.id).map((elementStyle) => (
            <div
              onMouseUp={mouseIsUp}
              onMouseOut={() => {
                document.querySelector(".shapeMenu").style.display = "none";
              }}
              onMouseOver={() => {
                !isDown ? menu(elementStyle.id) : null;
              }}
              id={elementStyle.id}
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
              <input
                onMouseDown={(e) => select(e, elementStyle.id)}
                id={"input" + elementStyle.id}
                className="text-dark"
                type="text"
                disabled
                style={{
                  position: "absolute",
                  width: `${elementStyle.width - 25}px`,
                  height: `${elementStyle.height - 25}px`,
                  border: "none",
                  borderRadius: elementStyle.radius,
                  backgroundColor: "transparent",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)" + (elementStyle.transform ? ` ${elementStyle.transform.includes("rotate") ? "rotate(-45deg)" : elementStyle.transform.includes("skew") ? "skewX(15deg)" : ""}` : ""),
                  zIndex: "1",
                  textAlign: "center",
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