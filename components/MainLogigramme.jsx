"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

export default function MainLogigramme({ tool, onUuidChange }) {
  // États principaux
  const [isDown, setMouseIsDown] = useState(false);
  const [style, setStyle] = useState({
    id: "",
    type: 0,
    width: 103,
    height: 103,
    bgColor: "#ffffff",
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
  const [dotPosition, setDotPosition] = useState([0, 0]);
  const [color, setColor] = useState("#ffffff");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [connectingMode, setConnectingMode] = useState(false);

  // États pour le blocage des mouvements
  const [blockLeft, setBlockLeft] = useState(false);
  const [blockRight, setBlockRight] = useState(false);
  const [blockBottom, setBlockBottom] = useState(false);
  const [blockTop, setBlockTop] = useState(false);

  // Références
  const dotSelected = useRef(false);
  const defaultDimensions = useRef({ width: 103, height: 103 });
  const sourceElementRef = useRef(null);
  const sourceSideRef = useRef(null);
  const sourceDotRef = useRef(null);

  // Propager l'UUID sélectionné au parent
  useEffect(() => {
    if (uuid) {
      onUuidChange(uuid);
    }
  }, [uuid, onUuidChange]);

  // Dessiner les connexions au chargement initial
  useEffect(() => {
    if (lines.length > 0) {
      setTimeout(() => updateSvgConnections(), 200);
    }
  }, []);

  // Gérer l'affichage des points de connexion selon l'outil
  useEffect(() => {
    if (tool.tool === 6 || tool.tool === 7 || tool.tool === 8) {
      // Mode connexion activé
      setTimeout(() => {
        const shapes = document.querySelectorAll("[shape-type]");
        shapes.forEach((element) => showConnectionPoints(element));
        setConnectingMode(true);
        updateSvgConnections();
      }, 100);
    } else {
      // Mode connexion désactivé mais on veut garder les liaisons visibles
      const dots = document.querySelectorAll(".connection-dot");
      dots.forEach((dot) => {
        dot.style.display = "none";
      });
      setConnectingMode(false);
      
      // Crucial: mettre à jour les connexions après changement d'outil
      setTimeout(() => {
        updateSvgConnections();
      }, 100);
    }
  }, [tool]);

  // Mettre à jour les connexions SVG quand les éléments ou lignes changent
  useEffect(() => {
    if (lines.length > 0) {
      updateSvgConnections();
    }
  }, [elements, lines]);

  // Gestionnaire global de relâchement de la souris
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

  // Convertir RGB en hexadécimal
  const rgbToHex = (rgbString) => {
    if (!rgbString || !rgbString.startsWith('rgb')) return "#ffffff";
    
    const matches = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!matches) return "#ffffff";

    const r = parseInt(matches[1], 10);
    const g = parseInt(matches[2], 10);
    const b = parseInt(matches[3], 10);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Fonction pour afficher/masquer le menu selon le colorPicker
  const manageColorMenuActive = () => {
    if (!colorPickerOpen) {
      document.querySelector(".shapeMenu").style.display = "none";
    }
  };

  // Afficher les points de connexion pour une forme
  const showConnectionPoints = (element) => {
    if (!element) return;
  
    try {
      // Supprimer les points existants
      const existingDots = element.querySelectorAll(".connection-dot");
      existingDots.forEach((dot) => dot.remove());
  
      const shapeType = parseInt(element.getAttribute("shape-type") || "1");
      const elementId = element.id;
  
      // Déterminer les positions selon le type de forme
      let positions = [];
  
      if (shapeType === 2) {
        // Cercle - 4 points (haut, droite, bas, gauche)
        positions = [
          { side: "top", top: "-10px", left: "50%", transform: "translateX(-50%)" },
          { side: "right", top: "50%", right: "-10px", transform: "translateY(-50%)" },
          { side: "bottom", bottom: "-10px", left: "50%", transform: "translateX(-50%)" },
          { side: "left", top: "50%", left: "-10px", transform: "translateY(-50%)" }
        ];
      } else if (shapeType === 3) {
        // Losange - 4 points aux sommets
        positions = [
          { side: "top-right", top: "-10px", right: "0", transform: "translate(50%, 0)" },
          { side: "bottom-right", bottom: "-10px", right: "0", transform: "translate(50%, 0)" },
          { side: "bottom-left", bottom: "-10px", left: "0", transform: "translate(-50%, 0)" },
          { side: "top-left", top: "-10px", left: "0", transform: "translate(-50%, 0)" }
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
          if (!(sourceElementRef.current === elementId && 
              sourceDotRef.current && 
              sourceSideRef.current === pos.side)) {
            dot.style.backgroundColor = "#3498db";
          }
          dot.style.transform = pos.transform;
        });
  
        element.appendChild(dot);
      });
      
      // Stocker les informations de connexion sur l'élément pour référence future
      element.setAttribute("data-connection-points", JSON.stringify(positions));
    } catch (error) {
      console.error("Error showing connection points:", error);
    }
  };
  

  const calculateConnectionPoint = (shapeType, rect, containerRect, elementId, side, pointType) => {
    // Pour le losange (type 3)
    if (shapeType === 3) {
      // Trouver le dot correspondant au côté pour le losange
      const dotId = `dot-${elementId}-${side}`;
      const dot = document.getElementById(dotId);
      
      if (dot) {
        const dotRect = dot.getBoundingClientRect();
        return {
          x: dotRect.left + dotRect.width / 2 - containerRect.left,
          y: dotRect.top + dotRect.height / 2 - containerRect.top
        };
      }
      
      // Si le dot n'est pas trouvé, calculer approximativement la position
      const element = document.getElementById(elementId);
      if (element) {
        const elRect = element.getBoundingClientRect();
        const width = elRect.width;
        const height = elRect.height;
        const centerX = elRect.left + width / 2 - containerRect.left;
        const centerY = elRect.top + height / 2 - containerRect.top;
        
        // Calculer la position selon le côté du losange
        switch (side) {
          case "top-right":
            return { x: centerX + width / 2, y: centerY };
          case "bottom-right":
            return { x: centerX, y: centerY + height / 2 };
          case "bottom-left":
            return { x: centerX - width / 2, y: centerY };
          case "top-left":
            return { x: centerX, y: centerY - height / 2 };
          default:
            return { x: centerX, y: centerY };
        }
      }
    }
  
    // Pour les autres formes, essayer d'utiliser le dot s'il est visible
    const dotId = `dot-${elementId}-${side}`;
    const dot = document.getElementById(dotId);
    if (dot && getComputedStyle(dot).display !== 'none') {
      const dotRect = dot.getBoundingClientRect();
      return {
        x: dotRect.left + dotRect.width / 2 - containerRect.left,
        y: dotRect.top + dotRect.height / 2 - containerRect.top
      };
    }
  
    // Calcul standard pour les autres formes
    switch (side) {
      case "top":
        return {
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top - containerRect.top
        };
      case "right":
        return {
          x: rect.right - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top
        };
      case "bottom":
        return {
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.bottom - containerRect.top
        };
      case "left":
        return {
          x: rect.left - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top
        };
      default:
        // Points aux coins
        let x, y;
        
        if (side && side.includes("top")) {
          y = rect.top - containerRect.top;
        } else if (side && side.includes("bottom")) {
          y = rect.bottom - containerRect.top;
        } else {
          y = rect.top + rect.height / 2 - containerRect.top;
        }
  
        if (side && side.includes("left")) {
          x = rect.left - containerRect.left;
        } else if (side && side.includes("right")) {
          x = rect.right - containerRect.left;
        } else {
          x = rect.left + rect.width / 2 - containerRect.left;
        }
  
        return { x, y };
    }
  };

  // Fonction pour calculer les points de contrôle
  const calculateControlPoint = (side, x, y, distance) => {
    let controlX, controlY;

    // Point de contrôle
    switch (side) {
      case "top":
        controlX = x;
        controlY = y - distance;
        break;
      case "right":
        controlX = x + distance;
        controlY = y;
        break;
      case "bottom":
        controlX = x;
        controlY = y + distance;
        break;
      case "left":
        controlX = x - distance;
        controlY = y;
        break;
      default:
        // Pour les coins
        if (side && side.includes("top")) {
          controlY = y - distance / 2;
        } else {
          controlY = y + distance / 2;
        }
        if (side && side.includes("right")) {
          controlX = x + distance / 2;
        } else {
          controlX = x - distance / 2;
        }
    }

    return { 
      sourceControlX: controlX, 
      sourceControlY: controlY, 
      targetControlX: controlX, 
      targetControlY: controlY 
    };
  };


  // Mettre à jour les connexions SVG
  const updateSvgConnections = useCallback(() => {
    try {
      if (!lines || lines.length === 0) {
        setSvgConnections([]);
        return;
      }
  
      const linesData = JSON.parse(JSON.stringify(lines));
      const containerRect = document.querySelector(".openDiv")?.getBoundingClientRect();
      if (!containerRect) return;
  
      const newConnections = linesData
        .map((line) => {
          try {
            const sourceElement = document.getElementById(line.source);
            const targetElement = document.getElementById(line.target);
  
            if (!sourceElement || !targetElement) return null;
  
            let sourceX, sourceY, targetX, targetY;
            
            // CORRECTION: Ne jamais utiliser les coordonnées exactes stockées
            // mais toujours recalculer en fonction de la position actuelle des éléments
            const sourceRect = sourceElement.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();
            
            const sourceShapeType = parseInt(sourceElement.getAttribute("shape-type") || "1");
            const targetShapeType = parseInt(targetElement.getAttribute("shape-type") || "1");
  
            // Calcul des points de connexion
            const sourcePoint = calculateConnectionPoint(
              sourceShapeType, 
              sourceRect, 
              containerRect, 
              line.source, 
              line.sourceSide, 
              "source"
            );
            
            const targetPoint = calculateConnectionPoint(
              targetShapeType, 
              targetRect, 
              containerRect, 
              line.target, 
              line.targetSide, 
              "target"
            );
            
            sourceX = sourcePoint.x;
            sourceY = sourcePoint.y;
            targetX = targetPoint.x;
            targetY = targetPoint.y;
  
            // Vérification des points
            if (isNaN(sourceX) || isNaN(sourceY) || isNaN(targetX) || isNaN(targetY)) {
              return null;
            }
  
            // Points de contrôle pour la courbe Bézier
            const controlDistance = Math.min(
              Math.abs(targetX - sourceX),
              Math.abs(targetY - sourceY)
            ) / 2 + 50;
  
            const { sourceControlX, sourceControlY } = calculateControlPoint(
              line.sourceSide, 
              sourceX, 
              sourceY, 
              controlDistance
            );
  
            const { targetControlX, targetControlY } = calculateControlPoint(
              line.targetSide, 
              targetX, 
              targetY, 
              controlDistance
            );
  
            // Créer le chemin SVG
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
  
      if (newConnections.length > 0) {
        setSvgConnections(newConnections);
      }
    } catch (error) {
      console.error("Error in updateSvgConnections:", error);
    }
  }, [lines, calculateControlPoint]);

  useEffect(() => {
    // Cette fonction met à jour les connexions à chaque rendu des éléments
    const updateAllConnections = () => {
      if (lines.length > 0 && elements.length > 0) {
        updateSvgConnections();
      }
    };
    
    // Appeler immédiatement puis configurer un observateur pour les modifications DOM
    updateAllConnections();
    
    // Observer chaque forme pour tout changement de position ou de taille
    const observer = new MutationObserver(updateAllConnections);
    const shapes = document.querySelectorAll(".shape-elementy");
    
    shapes.forEach(shape => {
      observer.observe(shape, { 
        attributes: true,
        attributeFilter: ['style'],
        subtree: true
      });
    });
    
    return () => {
      observer.disconnect();
    };
  }, [elements, lines, updateSvgConnections]);
  

  useEffect(() => {
    const handleElementMove = () => {
      if (lines.length > 0) {
        updateSvgConnections();
      }
    };
    
    // Observer les changements de position des éléments
    const observer = new MutationObserver(handleElementMove);
    const shapes = document.querySelectorAll(".shape-elementy");
    
    shapes.forEach(shape => {
      observer.observe(shape, { 
        attributes: true, 
        attributeFilter: ['style'] 
      });
    });
    
    return () => {
      observer.disconnect();
    };
  }, [elements, lines, updateSvgConnections]);

  useEffect(() => {
    // Mettre à jour les connexions chaque fois que les éléments changent
    if (elements.length > 0 && lines.length > 0) {
      setTimeout(() => {
        updateSvgConnections();
      }, 100);
    }
  }, [elements, updateSvgConnections]);  
  useEffect(() => {
    // This useEffect specifically handles when lines state changes
    if (lines.length > 0) {
      // Ensure the DOM has been updated before calculating positions
      const timer = setTimeout(() => {
        updateSvgConnections();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [lines, updateSvgConnections]);
  // Fonction pour calculer les points de connexion
  
  // Gérer le déplacement des éléments
  const setElementPosition = (e) => {
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
  
    // Si on n'est pas bloqué, on peut bouger librement
    if (canMove && !blockLeft && !blockRight && !blockTop && !blockBottom) {
      setElements((prevElements) => {
        const newElements = prevElements.map((element) => {
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
        
        // Important: retourner les nouveaux éléments
        return newElements;
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
  
    // CORRECTION: Forcer une mise à jour des connexions SVG immédiatement
    // et supprimer les coordonnées exactes pour forcer un recalcul
    if (lines.length > 0) {
      // Annuler toute mise à jour précédente en attente
      if (window.svgUpdateRequest) {
        cancelAnimationFrame(window.svgUpdateRequest);
      }
      
      // Supprimer les coordonnées exactes des lignes affectées par ce mouvement
      setLines(prevLines => 
        prevLines.map(line => {
          if (line.source === uuid || line.target === uuid) {
            // Supprimer les coordonnées exactes pour forcer un recalcul
            const { exactCoords, ...rest } = line;
            return rest;
          }
          return line;
        })
      );
      
      // Planifier une mise à jour immédiate des connexions
      window.svgUpdateRequest = requestAnimationFrame(() => {
        updateSvgConnections();
        window.svgUpdateRequest = null;
      });
    }
  };

  // Gérer le clic sur un point de connexion
  const handleDotClick = (elementId, dot, side) => {
    if (!sourceElementRef.current) {
      // Premier clic - sélectionner le point de départ
      sourceElementRef.current = elementId;
      sourceSideRef.current = side;
      sourceDotRef.current = dot;
      
      // Stocker les coordonnées exactes du point de départ
      const containerRect = document.querySelector(".openDiv")?.getBoundingClientRect();
      if (containerRect && dot) {
        const dotRect = dot.getBoundingClientRect();
        const sourceX = dotRect.left + dotRect.width / 2 - containerRect.left;
        const sourceY = dotRect.top + dotRect.height / 2 - containerRect.top;
        
        // Stocker temporairement les coordonnées
        window._tempSourceCoords = { x: sourceX, y: sourceY };
      }
      
      dot.style.backgroundColor = "#e74c3c";
    } else {
      // Deuxième clic - créer la connexion
      if (sourceElementRef.current !== elementId) {
        const targetElementId = elementId;
        const targetSide = side;
        const lineId = uuidv4();
        
        // Stocker les coordonnées exactes du point de destination
        const containerRect = document.querySelector(".openDiv")?.getBoundingClientRect();
        let targetX, targetY;
        
        if (containerRect && dot) {
          const dotRect = dot.getBoundingClientRect();
          targetX = dotRect.left + dotRect.width / 2 - containerRect.left;
          targetY = dotRect.top + dotRect.height / 2 - containerRect.top;
        }
  
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
        
        // Si nous avons les coordonnées exactes, les ajouter à la ligne
        if (window._tempSourceCoords && targetX !== undefined) {
          newLine.exactCoords = {
            source: window._tempSourceCoords,
            target: { x: targetX, y: targetY }
          };
        }
  
        // Ajouter la ligne
        setLines((prevLines) => [...prevLines, newLine]);
        
        // Nettoyer les coordonnées temporaires
        window._tempSourceCoords = null;
        
        // Mise à jour des connexions SVG
        setTimeout(() => {
          updateSvgConnections();
        }, 50);
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
  
  
  // Créer la grille de points
  const createDotPattern = () => {
    if (document.getElementById("momo")) return;

    const container = document.querySelector(".openDiv");
    if (!container) return;

    const dotBgColor = "#00000050";
    const spacing = 25;
    const windowWidth = 2500;
    const windowHeight = 3000;

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

    const fragment = document.createDocumentFragment();
    const dotsX = Math.floor(windowWidth / spacing);
    const dotsY = Math.floor(windowHeight / spacing);

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

    const handleDotHover = (e) => {
      const target = e.target;
      const x = target.getAttribute("x");
      const y = target.getAttribute("y");
      if (x && y) {
        setDotPosition([x, y]);
      }
    };

    // Création par lots
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

        const dot = dotTemplate.cloneNode(false);
        const xPos = x * spacing;
        const yPos = y * spacing;

        dot.style.left = `${xPos}px`;
        dot.style.top = `${yPos}px`;
        dot.setAttribute("x", `${xPos + 8}`);
        dot.setAttribute("y", `${yPos + 8}`);

        fragment.appendChild(dot);
      }

      dotsCreated += batchEnd - batchStart;
      currentBatch++;

      if (dotsCreated < totalDots) {
        requestAnimationFrame(processBatch);
      } else {
        dotContainer.appendChild(fragment);
        container.appendChild(dotContainer);

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

    requestAnimationFrame(processBatch);
  };

  useEffect(() => {
    createDotPattern();
  }, []);

  // Sélectionner un élément
  const select = (e, id) => {
    setMouseIsDown(true);
    setUuid(id);
  };

  // Créer une nouvelle forme
  const mouseIsDown = (e) => {
    if (tool.tool !== 0 && tool.tool < 6) {
      setMouseIsDown(true);
      const newId = uuidv4();

      let newShape = {
        id: newId,
        x: dotPosition[0],
        y: dotPosition[1],
        width: defaultDimensions.current.width,
        height: defaultDimensions.current.height,
        bgColor: "#ffffff",
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

      setStyle(newShape);
      setColor("#ffffff");
      setElements((prevElements) => [...prevElements, newShape]);
      setUuid(newId);
    }
  };

  // Trouver l'élément le plus proche
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
      const distance = Math.sqrt(Math.pow(refX - x, 2) + Math.pow(refY - y, 2));

      if (distance < minDistance) {
        minDistance = distance;
        closestElement = element;
      }
    });

    return closestElement;
  };

  // Gérer le relâchement de la souris
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
  
    // Mettre à jour les connexions - CORRECTION: forcer une mise à jour plus rapide
    if (lines.length > 0) {
      // Supprimer toutes les coordonnées exactes pour forcer un recalcul des connexions
      setLines(prevLines => 
        prevLines.map(line => {
          const { exactCoords, ...rest } = line;
          return rest;
        })
      );
      
      // Mise à jour immédiate des connexions
      updateSvgConnections();
    }
  };

  
  // Modifier les dimensions d'une forme
  const setDimensions = (e, active) => {
    if ((isDown && tool.tool !== 0 && tool.tool < 6 && tool.tool != -1) || active) {
      const number = 25;

      if (tool.tool === 2 || tool.tool === 3) {
        // Cercle ou Losange - mêmes dimensions
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
        // Rectangle et autres - dimensions indépendantes
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

  // Changer la couleur d'une forme
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

  // Activer l'édition de texte
  const manageInput = () => {
    tool.tool = -1;
    const el = document.getElementById("input" + uuid);
    if (el) {
      el.style.display = "flex";
      el.style.zIndex = "3";
      el.focus();
      setTimeout(() => {
        el.focus();
      }, 10);
    }
  };

  // Mettre à jour le texte d'un élément
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

  // Afficher le menu pour un élément
  const menu = (elementId) => {
    if (!elementId) return;
    
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Obtenir la couleur de l'élément et la convertir en hex
    const bgColor = element.style.backgroundColor;
    if (bgColor && bgColor !== "none") {
      console.log("dsv")
      setColor(rgbToHex(bgColor));
    }
    setUuid(elementId);
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
  };

  // Supprimer un élément et ses connexions
  const deleteElement = () => {
    setElements((prevElements) =>
      prevElements.filter((element) => element.id !== uuid)
    );

    setLines((prevLines) =>
      prevLines.filter((line) => line.source !== uuid && line.target !== uuid)
    );

    const shapeMenu = document.querySelector(".shapeMenu");
    if (shapeMenu) {
      shapeMenu.style.display = "none";
    }

    setTimeout(() => {
      updateSvgConnections();
    }, 100);
  };

  // Définir le style after pour le menu
  const shapeStyleAfter = (width) => {
    const shapeMenu = document.querySelector(".shapeMenu");
    if (!shapeMenu) return;

    const styleSheet = document.createElement("style");
    document.head.appendChild(styleSheet);

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

    shapeMenu.style.position = "relative";
  };

  // Calculer la taille de police en fonction du texte et des dimensions
  const calculateFontSize = (text, width, height) => {
    if (!text) return "14px"; // Taille par défaut

    // Calculer la taille de base en fonction de la largeur disponible
    const baseSize = Math.min(width / (text.length * 0.7), height / 2);

    // Limiter la taille dans une plage raisonnable
    return Math.max(9, Math.min(baseSize, 20)) + "px";
  };

  // Gérer le changement de couleur via l'input
  const handleColorInputChange = () => {
    const newColor = document.getElementById("colorInput").value;
    setColor(newColor);
    changeShapeColor(newColor);
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
            if (
              tool.tool > 0 &&
              tool.tool < 6 &&
              (document.querySelector(".shapeMenu")?.style.display === "none" ||
                document.querySelector(".shapeMenu")?.style.display === "")
            ) {
              mouseIsDown(e);
            } else if (tool.tool == -1) {
              const inputElement = document.getElementById("input" + uuid);
              if (inputElement) {
                inputElement.style.zIndex = "1";
              }
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
                  // Points sans flèche
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
            onMouseOut={() => manageColorMenuActive()}
          >
            <img src="/icons/policeIcon.png" onClick={manageInput} />

            <input
              id="colorInput"
              onChange={handleColorInputChange}
              type="color"
              value={color}
              className="border-0 rounded w-50 bg-transparent"
            />

            <img onClick={deleteElement} src="/icons/trash.png" />
          </div>

          {/* Rendu des éléments */}
          {elements
            .filter((el) => el.id)
            .map((elementStyle) => (
              <div
                onMouseUp={mouseIsUp}
                onMouseOut={() => manageColorMenuActive()}
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
                            ? "skewX(15deg)"
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
    </div>
  );
}