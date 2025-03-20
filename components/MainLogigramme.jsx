"use client";
import { useState, useEffect, useRef, useCallback } from "react";
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

  const [dotPosition, setDotPosition] = useState([0, 0]);

  const [color, setColor] = useState("#eeee");

  const select = (e, uuid) => {
    setMouseIsDown(true);
    setUuid(uuid);
  };

  const dotSelected = useRef(false);
  const dotUuid = useRef("");
  const lineUuid = useRef("");
  // Effet qui se déclenche quand la prop tool change
  useEffect(() => {
    console.log("L'outil a changé:", tool);

    if (tool.tool > 5) {
      const cc = document.querySelectorAll("[shape-type]");
      cc.forEach((element) => {
        const spans = element.querySelectorAll("span");
        spans.forEach((element) => {
          element.style.display = "flex";
        });
      });
    } else {
      const cc = document.querySelectorAll("[shape-type]");
      cc.forEach((element) => {
        const spans = element.querySelectorAll("span");
        spans.forEach((element) => {
          element.style.display = "none";
        });
      });
    }
  }, [tool]); // Le useEffect se déclenche à chaque changement de la prop tool

  function findClosestElement(referenceElement, elements) {
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
  }

  function findSideDotsMarker(referenceElement, elements) {
    if (!elements.length || referenceElement == null) return null;

    // Obtenir la position de l'élément de référence
    const refRect = referenceElement.getBoundingClientRect();
    const refX = [
      refRect.left - 25,
      refRect.right + 25,
      refRect.left + refRect.width / 2,
      refRect.left + refRect.width / 2,
    ];
    const refY = [
      refRect.top + refRect.height / 2,
      refRect.top + refRect.height / 2,
      refRect.top - 25,
      refRect.bottom + 25,
    ];

    let dots = [];

    const find = (referenceElement, elements, refX, refY) => {
      let minDistance = Infinity;
      let el = null;
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
          //  console.log(element, "dsggds")
          el = element;
        }
      });
      return el;
    };

    for (let i = 0; i < 4; i++) {
      //  console.log("dsggds"+ refY[i])
      dots.push(find(referenceElement, elements, refX[i], refY[i]));
    }
    console.log(dots, "dsggds");
    return dots;
  }

  // Function to create a grid of dots over the entire body
  function createDotPattern() {
    const dotBgColor = "#00000050";
    const dotHoverColor = "black";
    // Create a container for the dots
    const dotContainer = document.createElement("div");
    dotContainer.style.position = "absolute";
    dotContainer.style.top = "8px";
    dotContainer.style.left = "8px";
    dotContainer.style.width = "100%";
    dotContainer.style.height = "100%";
    // So clicks pass through to elements below
    dotContainer.id = "momo";
    // Get the window dimensions
    const windowWidth = 2500;
    const windowHeight = 3000;

    // The spacing between dots in pixels
    const spacing = 25;

    // Calculate the number of dots in each dimension
    const dotsX = Math.floor(windowWidth / spacing);
    const dotsY = Math.floor(windowHeight / spacing);

    // Create dots and position them in a grid
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

        // Rendre les points plus interactifs
        dot.addEventListener("mouseover", function () {
          // if (tool.tool !== 0) { // Seulement si un outil de dessin est actif}

          this.style.backgroundColor = dotHoverColor;
          setDotPosition([this.getAttribute("x"), this.getAttribute("y")]);
        });
        // dot.addEventListener("mouseleave", function () {
        //   // if (tool.tool !== 0) { // Seulement si un outil de dessin est actif}

        //   this.style.backgroundColor = dotBgColor;
        // });

        // Add the dot to the container
        dotContainer.appendChild(dot);
      }
    }

    // Add the container to the document body
    document.querySelector(".openDiv").appendChild(dotContainer);
  }

  useEffect(() => {
    createDotPattern();
  }, []);

  const setElementPosition = (e) => {
    console.log("sdgsdg");
    const el = elements.find((el) => el.id === uuid);

    if (isDown && uuid !== null) {
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

      console.log("mousemove + pos", typeof e.movementX + typeof elements[0].x);

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
      console.log(dotPosition);
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
      const containerRect = document
        .querySelector(".openDiv")
        .getBoundingClientRect();
      afters(defaultDimensions.current.width);
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

  const prepareFindElement = (hover) => {
    const reference = document.getElementById(uuid);
    const otherElements = Array.from(document.querySelector("#momo").children);

    if (!hover) {
      return findClosestElement(reference, otherElements);
    } else {
      return findSideDotsMarker(reference, otherElements);
    }
  };

  const mouseIsUp = () => {
    const elements = [];
    for (let i = 0; i < 4; i++) {
      const element = document.createElement("span");
      element.style.backgroundColor = "blue";
      element.style.borderRadius = "50%";
      element.style.width = "10px";
      element.style.height = "10px";
      element.style.position = "absolute";
      element.classList.add("sideDots");
      element.setAttribute("id", uuidv4());

      switch (i) {
        case 0:
          element.style.top = "50%";
          element.style.left = "-30px";
          element.style.transform = "translate(0, -50%)";
          element.setAttribute("side", "left");
          break;
        case 1:
          element.style.top = "50%";
          element.style.right = "-30px";
          element.style.transform = "translate(0, -50%)";
          element.setAttribute("side", "right");
          break;
        case 2:
          element.style.top = "-25px";
          element.style.right = "45%";
          element.style.transform = "translate(0, -50%)";
          element.setAttribute("side", "top");
          break;
        case 3:
          element.style.bottom = "-35px";
          element.style.left = "45%";
          element.style.transform = "translate(0, -50%)";
          element.setAttribute("side", "bottom");
          break;
        default:
      }

      element.addEventListener("click", function () {
        console.log("xsq0");
        if (!dotSelected.current) {
          dotSelected.current = true;

          dotUuid.current = element.getAttribute("id");
        } else {
          console.log("xsq2");

          dotSelected.current = false;

          let div = document.createElement("div");
          div.setAttribute("id", "t1");

          // Créer l'élément SVG
          const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
          );

          const rect = element.getBoundingClientRect();
          const rect2 = document
            .getElementById(dotUuid.current)
            .getBoundingClientRect();

          svg.setAttribute("width", rect.left - rect2.left + 8);
          svg.setAttribute("height", rect.top - rect2.top + 5);
          svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          svg.style.position = "absolute";

          for (let i = 0; i < 2; i++) {
            // Créer l'élément ligne
            const line = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "line"
            );

            if (lineUuid.current != "") {
              
           
              line.setAttribute("x1", (rect.left - rect2.left) / 2);
              line.setAttribute("y1", 0);
              line.setAttribute("x2", (rect.left - rect2.left) / 2);
              line.setAttribute("y2", rect.top - rect2.top + 5);
              line.setAttribute("stroke", "red");
              line.setAttribute("stroke-width", 4);
             

              svg.append(line);
            } else {
              line.setAttribute("x1", 8);
              line.setAttribute("y1", 0);
              line.setAttribute("x2", (rect.left - rect2.left) / 2);
              line.setAttribute("y2", 0);
              line.setAttribute("stroke", "red");
              line.setAttribute("stroke-width", 4);
              lineUuid.current = uuidv4;

              svg.append(line);
            }
          }

          // Ajouter la ligne au SVG

          document.getElementById(dotUuid.current).appendChild(svg);
          element.appendChild(div);
        }
      });

      document.getElementById(uuid).appendChild(element);
    }

    setMouseIsDown(false);

    if (tool.tool == 0) {
      const closest = prepareFindElement(false);
      if (closest == null) return;
      closest.style.backgroundColor = "red";
      console.log(closest.getAttribute("y"));
      document.getElementById(uuid).style.top =
        closest.getAttribute("y") + "px";
      document.getElementById(uuid).style.left =
        closest.getAttribute("x") + "px";
      console.log(closest, "log2");
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
  };

  const setDimensions = (e) => {
    if (isDown && tool.tool !== 0) {
      console.log(document.getElementById("input" + uuid).style.zIndex, "erfg");

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
      } else if (tool.tool === 1 || tool.tool === 5) {
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
    console.log(color, "zrb");
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
    console.log("logfgj");
    const el = document.getElementById("input" + uuid);
    el.style.zIndex = 1;
    el.removeAttribute("disabled");
    el.focus();
  };

  const setTextElement = () => {
    console.log(color, "zrb");
    const el = document.getElementById("input" + uuid);
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
  };

  const menu = (uuid) => {
    setUuid(uuid);
    console.log(document.getElementById(uuid).style.left, "erhsf");
    document.querySelector(".shapeMenu").style.display = "flex";
    document.querySelector(".shapeMenu").style.left =
      parseInt(document.getElementById(uuid).style.left) +
      parseInt(document.getElementById(uuid).style.width) -
      100 +
      "px";
    document.querySelector(".shapeMenu").style.top =
      parseInt(document.getElementById(uuid).style.top) - 45 + "px";
  };
  const deleteElement = () => {
    setElements((prevElements) => {
      return prevElements.map((element) => {
        if (element.id === uuid) {
          return {};
        } else {
          return element;
        }
      });
    });

    document.querySelector(".shapeMenu").style.display = "none";
  };

  const afters = (width) => {
    // Sélectionner la div shapeMenu
    const shapeMenu = document.querySelector(".shapeMenu");
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
    <div
      style={{
        flex: "auto",
        width: "84%",
      }}
    >
      <div
        id="boxs"
        onMouseMove={(e) => {
          console.log(tool.tool, isDown, "zegdsdf");
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
          onMouseDown={(e) =>
            (tool.tool !== 0 &&
              document.querySelector(".shapeMenu").style.display == "none") ||
            document.querySelector(".shapeMenu").style.display == ""
              ? [
                  mouseIsDown(e),
                  document.getElementById("input" + uuid) != null
                    ? [
                        document
                          .getElementById("input" + uuid)
                          .setAttribute("disabled", true),
                      ]
                    : null,
                ]
              : [
                  document
                    .getElementById("input" + uuid)
                    .setAttribute("disabled", true),
                ]
          }
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
              onMouseUp={() => mouseIsUp}
              onMouseOut={() => {
                document.querySelector(".shapeMenu").style.display = "none";
              }}
              onMouseOver={() => {
                !isDown ? menu(elementStyle.id) : null;
              }}
              id={elementStyle.id}
              onMouseDown={(e) => [
                select(e, elementStyle.id),
                console.log("dsf"),
              ]}
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
            >
              <input
                // onMouseOut={() => {
                //   setMouseIsDown();
                // }}
                onMouseDown={(e) => [
                  select(e, elementStyle.id),
                  console.log("dsf"),
                ]}
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
                  transform: "translate(-50%, -50%)",
                  zIndex: "1",
                }}
                onChange={() => [
                  setTextElement(
                    document.getElementById("input" + elementStyle.id).value
                  ),
                ]}
                value={elementStyle.text}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
