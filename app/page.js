"use client";
import { useState, useRef, useEffect } from "react";
import "./globals.css";
import MainLogigramme from "../components/MainLogigramme.jsx";

export default function Home() {
  const [tool, setTool] = useState({ tool: 0 });
  const [uuid, setUuid] = useState();


  // Fonction callback pour recevoir uuid du composant enfant
  const handleUuidChange = (newUuid) => {
    console.log("UUID reçu du composant enfant:", newUuid);
    setUuid(newUuid);
  };


 
  
 

  return (
    <div
     
      className="container-fluid position-relative"
    >
      <div className="row">
        <div className="mainMenu col-5 border bg-light rounded p-0 row position-absolute">
          <div className="d-flex text-light menu">
            <div className="" onClick={() => setTool({ tool: 0 })}>
              <img src="icons/cursor.png" alt="Cursor" />
            </div>

            <div className="" onClick={() => [setTool({ tool: -1 })]}>
              <img src="icons/zoom.png" alt="Cursor" />
            </div>

            <div className="ms-auto" onClick={() => setTool({ tool: 1 })}>
              <img src="icons/rectangle.png" alt="Rectangle" />
            </div>
            <div className="" onClick={() => setTool({ tool: 2 })}>
              <img src="icons/circle.png" alt="Circle" />
            </div>
            <div className="" onClick={() => setTool({ tool: 3 })}>
              <img src="icons/losange.png" alt="Diamond" />
            </div>
            <div className="" onClick={() => setTool({ tool: 4 })}>
              <img src="icons/rhomboide.png" alt="Parallelogram" />
            </div>
            <div className="me-auto" onClick={() => setTool({ tool: 5 })}>
              <img src="icons/note.png" alt="Note" />
            </div>

            <div className="ms-auto" onClick={() => setTool({ tool: 6 })}>
              <img src="icons/arrow.png" alt="Arrow" />
            </div>
            <div className="" onClick={() => setTool({ tool: 7 })}>
              <img src="icons/dotted-arrow.png" alt="Dotted Arrow" />
            </div>
            <div className="dotsMenu" onClick={() => setTool({ tool: 8 })}>
              ••••
            </div>
          </div>
        </div>
        <div 
         onMouseDown={() => {
           const elements = document.querySelectorAll(".shape-input");
           if (elements.length != 0) {
             elements.forEach((element) => {
               element.style.zIndex = 1;
             });
           }
         }}
         
        >
          <MainLogigramme 
            tool={tool} 
            onUuidChange={handleUuidChange} 
            
          />
        </div>
      </div>
    </div>
  );
}