import React, { useCallback, useRef, useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import useClickOutside from "./useClickOutside";

export const PopoverPicker = ({ color, onChange, onOpenChange }) => {
  const popover = useRef();
  const [isOpen, toggle] = useState(false);

  const close = useCallback(() => {
    toggle(false);
    if (onOpenChange) onOpenChange(false);
  }, [onOpenChange]);

  useClickOutside(popover, close);

  // Effet pour notifier le parent de tout changement d'état
  useEffect(() => {
    if (onOpenChange) onOpenChange(isOpen);
  }, [isOpen, onOpenChange]);


  return (
    <div className="picker">
      <div
        className="swatch"
        style={{ backgroundColor: color }}
        onClick={() => toggle(true)}
       
      />

      {isOpen && (
        <div id="vbn" style={{ zIndex: "10" }}
        className="popover" ref={popover}>
          <HexColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  );
};
