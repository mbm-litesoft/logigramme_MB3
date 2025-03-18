"use client";
import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { PopoverPicker } from "./PopoverPicker";

// Corriger la déstructuration des props
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
  const [uuid, setUuid] = useState("");

  const [blockLeft, setBlockLeft] = useState(false);
  const [blockRight, setBlockRight] = useState(false);
  const [blockBottom, setBlockBottom] = useState(false);
  const [blockTop, setBlockTop] = useState(false);

  const [dotPosition, setDotPosition] = useState([0,0]);


  const [color, setColor] = useState("#eeee");
 

  const select = (e, uuid) => {
    setMouseIsDown(true);
    setUuid(uuid);
  };



  function findClosestElement(referenceElement, elements) {
    if (!elements.length) return null;
    
    // Obtenir la position de l'élément de référence
    const refRect = referenceElement.getBoundingClientRect();
    const refX = refRect.left ;
    const refY = refRect.top ;
    
    let closestElement = elements[0];
    let minDistance = Infinity;
    
    // Parcourir tous les éléments et trouver le plus proche
    elements.forEach(element => {
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
  }


// Function to create a grid of dots over the entire body
function createDotPattern() {
const dotBgColor = "#00000050";
const dotHoverColor = "black";
  // Create a container for the dots
  const dotContainer = document.createElement('div');
  dotContainer.style.position = 'absolute';
  dotContainer.style.top = '8px';
  dotContainer.style.left = '8px';
  dotContainer.style.width = '100%';
  dotContainer.style.height = '100%';
 // So clicks pass through to elements below
  dotContainer.id = "momo"
  // Get the window dimensions
  const windowWidth =2500 ;
  const windowHeight =3000;
  
  // The spacing between dots in pixels
  const spacing = 25;
  
  // Calculate the number of dots in each dimension
  const dotsX = Math.floor(windowWidth / spacing);
  const dotsY = Math.floor(windowHeight / spacing);
  
  // Create dots and position them in a grid
  for (let y = 0; y < dotsY; y++) {
    for (let x = 0; x < dotsX; x++) {
      const dot = document.createElement('div');
      
      // Style the dot
      dot.style.position = 'absolute';
      dot.style.width = '3px';
      dot.style.height = '3px';
      dot.style.backgroundColor = dotBgColor;
      dot.style.borderRadius = '50%';
      dot.setAttribute("x", `${(x * spacing) + 8}`)
      dot.setAttribute("y", `${(y * spacing) + 8}`)
      dot.classList.add("zone")
      // Position the dot
      dot.style.left = `${x * spacing}px`;
      dot.style.top = `${y * spacing}px`;
   
     

       // Rendre les points plus interactifs
       dot.addEventListener('mouseover', function() {
      
        // if (tool.tool !== 0) { // Seulement si un outil de dessin est actif}
         
          this.style.backgroundColor = dotHoverColor
          setDotPosition([this.getAttribute("x"), this.getAttribute("y")])
          
        
      });
      dot.addEventListener('mouseleave', function() {
     
        // if (tool.tool !== 0) { // Seulement si un outil de dessin est actif}
         
           this.style.backgroundColor = dotBgColor
        
      });

      // Add the dot to the container
      dotContainer.appendChild(dot);
    
    }
  }
  
  // Add the container to the document body
  document.querySelector(".openDiv").appendChild(dotContainer);



}



useEffect(() => {
  createDotPattern()
}, []);




  const setElementPosition = (e) => {
    const el = elements.find((el) => el.id === uuid);

    if ( isDown && uuid !== null) {
      const rect1 = document.getElementById(uuid).getBoundingClientRect();

      // bouge avec le scroll tache ern pause
      // const rect2 = document
      //   .querySelector("#limitator2")
      //   .getBoundingClientRect();

      const rect3 = document.querySelector(".openDiv").getBoundingClientRect();

      console.log(
        rect1.right,
        rect3.right,
        "//",
        rect1.left,
        rect3.left,
        "//",
        rect1.top,
        rect3.top,
        "//",
        rect1.bottom,
        rect3.bottom
      );

      console.log("mousemove + pos", typeof(e.movementX) + typeof(elements[0].x));

      let move = 0;
      if (rect1.right > rect3.right - 10) {
        move = 1;
        setBlockRight(true);
      } else if (rect1.left < rect3.left + 8) {
        move = 2;
        el.x = 8;
        setBlockLeft(true);
      } else if (rect1.top < rect3.top) {
        move = 3;
        el.y = 0;
        setBlockTop(true);
      } else if (rect1.bottom > rect3.bottom) {
        move = 4;
        setBlockBottom(true);
      } else {
        move = 0;
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
console.log(dotPosition)
      if (move === 0) {
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
      } else {
        console.log("move2", move);
        if (rect1.right > rect3.right) {
          el.x -= rect1.right - rect3.right;
        } else if (rect1.bottom > rect3.bottom) {
          el.y -= rect1.bottom - rect3.bottom;
        }

        move = 0;
      }
    } else {
    }
  };


  // Créez un ref pour suivre les dimensions par défaut
// Ajoutez au début du composant:
// const defaultDimensions = useRef({ width: 103, height: 103 });
const defaultDimensions = useRef({ width: 103, height: 103 });
const mouseIsDown = (e) => {
  

  if (tool.tool !== 0) {
    setMouseIsDown(true);
    
    // Générer un nouvel UUID pour cet élément
    const newId = uuidv4();

    // Obtenir la position du conteneur
    const containerRect = document.querySelector(".openDiv").getBoundingClientRect();
    
    // Définir une forme avec dimensions par défaut
    let newShape = {
      id: newId,
      x: dotPosition[0],
      y: dotPosition[1],
      width: defaultDimensions.current.width,
      height: defaultDimensions.current.height,
      bgColor: "white",
      border: "1px solid gray",
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
          radius: "5%",
          }
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
    setElements(prevElements => [...prevElements, newShape]);
    
    // Stocker l'UUID pour le dimensionnement
    setUuid(newId);
  }
};

  const mouseIsUp = (closest) => {
    setMouseIsDown(false);
   console.log(closest,"log")
    if (closest != null) {
      
        const reference = document.getElementById(uuid);
        const otherElements = Array.from(document.querySelector("#momo").children);
        const closest = findClosestElement(reference, otherElements);

        closest.style.backgroundColor = "red";
        console.log(closest.getAttribute("y"));
        document.getElementById(uuid).style.top = closest.getAttribute("y") + "px";
        document.getElementById(uuid).style.left = closest.getAttribute("x") + "px";
        console.log(closest,"log2")
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
  };
}

  const setDimensions = (e) => {
    if (isDown && tool.tool !== 0) {
     
      
      let number = 25;

      // Mettre à jour le style local en fonction du type d'outil
      if (tool.tool === 2) {
        // Cercle - même largeur et hauteur
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
      } else if (tool.tool === 1) {
        // Rectangle - dimensions indépendantes
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
      } else if (tool.tool === 3) {
        // Polygone - dimensions égales
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
      }
  
      // Mettre à jour l'élément actif dans le tableau
      setElements((prevElements) => {
        return prevElements.map((element) =>
          element.id === uuid
            ? {
                ...element,
                width: style.width,
                height: style.height,
              }
            : element
        );
      });
    }
  };

  return (
    <div
      style={{
        flex: "auto",
        width: "84%",
      }}

    >
      <div
        id="boxs"
        
        
         onMouseMove={(e) => {
          if (isDown) {
            if (tool.tool !== 0) {
              setDimensions(e);
            } else {
              setElementPosition(e);
            }
          }
        }}
        
        // onMouseLeave={(e) => verifyPosition(e)}
        className="col fullHeight "
        style={{
          border: "2px solid #333",
          padding: "15px",
          margin: "0 auto",
          backgroundColor: "blue !important",
          overflow: "auto" /* Activer le défilement vertical */,
          boxSizing: "border-box",
        }}
      >
        <div
          className="openDiv"
         
          onMouseDown={(e) => (tool.tool !== 0 ? mouseIsDown(e) : null)}
        
          onMouseUp={mouseIsUp}
          style={{
            position: "relative",
            width: "2500px",
            height: "3000px",
            background: "white",
          }}
        >
 <div
            className="shapeMenu"
            onMouseOver={() => {
              menu(uuid);
            }}
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
              onClick={() => {
                [deleteElement()];
              }}
              src="/icons/trash.png"
            />
          </div>

          {elements.map((elementStyle, index) => (
            <div
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
              }}
              shape-type={elementStyle.type}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
