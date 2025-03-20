
"use client";
import { useState } from "react";
import './globals.css';
import Button from '../components/Box.jsx'
import MainLogigramme from '../components/MainLogigramme.jsx'



export default function Home() {



  const [tool, setTool] = useState({tool: 0});

  return (
    <div className="container-fluid position-relative">
     
      <div className="row">
        <div className=" mainMenu col-5 border bg-light rounded p-0 row position-absolute z-1 ">
       
          <div className=" d-flex text-light menu">
            

            <div className="" onClick={() =>  setTool({tool: 0})}> <img src="icons/cursor.png" /></div>

            <div className="ms-auto" onClick={() =>  setTool({tool: 1})} > <img src="icons/rectangle.png" /> </div>
            <div className="" onClick={() =>  setTool({tool: 2})}><img src="icons/circle.png" /></div>
            <div className="" onClick={() =>  setTool({tool: 3})}><img src="icons/losange.png" /></div>
            <div className="" onClick={() =>  setTool({tool: 4})}><img src="icons/rhomboide.png" /></div>
            <div className="me-auto" onClick={() =>  setTool({tool: 5})}><img src="icons/note.png" /></div>

            <div className="ms-auto" onClick={() =>  setTool({tool: 6})}><img src="icons/arrow.png" /></div>
            <div className="" onClick={() =>  setTool({tool: 7})}><img src="icons/dotted-arrow.png" /></div>
            <div className="dotsMenu" onClick={() =>  setTool({tool: 8})}>••••</div>
          </div>
        </div>
        <MainLogigramme tool={tool}/>
      </div>
    </div>
  );
}
