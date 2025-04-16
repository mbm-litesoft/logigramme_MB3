"use client";
import { useState, useRef, useEffect } from "react";
import "./globals.css";
import MainLogigramme from "../components/MainLogigramme.jsx";

export default function Home() {
  const [tool, setTool] = useState({ tool: 0 });
  const [uuid, setUuid] = useState();
  
  // Références aux données du diagramme
  const [elements, setElements] = useState([]);
  const [lines, setLines] = useState([]);
  
  // Fonction callback pour recevoir uuid du composant enfant
  const handleUuidChange = (newUuid) => {
    console.log("UUID reçu du composant enfant:", newUuid);
    setUuid(newUuid);
  };
  
  // Fonction callback pour recevoir les mises à jour des éléments et lignes
  const handleDataChange = (newElements, newLines) => {
    setElements(newElements);
    setLines(newLines);
  };
  
  // Fonction pour sauvegarder le diagramme en JSON
  const saveToJson = () => {
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
  };
  
  // Fonction pour importer un fichier JSON
  const importJsonFile = (file) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        // Parser directement le contenu JSON
        const parsedData = JSON.parse(event.target.result);
        console.log(parsedData.elements, "parsedData");
        
        // Mettre à jour l'état local
        setElements(parsedData.elements);
        setLines(parsedData.lines);
        
        // Si vous avez une référence au composant enfant, vous pouvez mettre à jour ses données
        if (logigrammeRef.current && logigrammeRef.current.updateData) {
          logigrammeRef.current.updateData(parsedData.elements, parsedData.lines);
        }
        
        console.log("Fichier importé avec succès");
      } catch (error) {
        console.error('Erreur de parsing JSON:', error);
      }
    };

    // Lire le fichier comme texte
    reader.readAsText(file);
  };
  
  // Référence pour accéder aux méthodes du composant enfant
  const logigrammeRef = useRef(null);

  return (
    <div className="container-fluid position-relative">
      <div className="row">
        <div className="mainMenu col-5 border bg-light rounded p-0 row position-absolute">
          <div className="d-flex text-light menu">
            <div className="" onClick={() => setTool({ tool: 0 })}>
              <img src="icons/cursor.png" alt="Cursor" />
            </div>

            <div className="" onClick={() => setTool({ tool: -1 })}>
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
            
            {/* Boutons de sauvegarde et d'importation */}
            <div className="ms-auto d-flex me-2" onClick={saveToJson}>
              <img src="icons/save.png" alt="Save" style={{ cursor: 'pointer' }} />
            </div>
            <div className="custom-file-input">
              <input
                type="file"
                id="fileInput"
                onChange={(e) => importJsonFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              <label htmlFor="fileInput">
                <img
                  src="icons/import.png"
                  alt="Importer un fichier"
                  className="upload-logo"
                  style={{ cursor: 'pointer', width: '40px', height: '40px' }}
                />
              </label>
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
            ref={logigrammeRef}
            tool={tool} 
            onUuidChange={handleUuidChange} 
            onDataChange={handleDataChange}
            elements={elements}
            lines={lines}
            setElements={setElements}
            setLines={setLines}
          />
        </div>
      </div>
    </div>
  );
}