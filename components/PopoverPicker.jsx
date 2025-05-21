import React, { useCallback, useRef, useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import useClickOutside from "./useClickOutside";

export const PopoverPicker = ({ color, onChange }) => {
  const popover = useRef();
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useClickOutside(popover, close);

  return (
    <div className="picker">
      <div
        className="swatch"
        style={{ backgroundColor: color }}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <div className="popover" ref={popover}>
          <HexColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  );
};