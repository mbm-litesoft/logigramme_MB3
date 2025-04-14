import React, { useCallback, useRef, useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import useClickOutside from "./useClickOutside";

export const PopoverPicker = ({ color, onOpenChange, isOpen, setIsOpen }) => {
  const popover = useRef();
 const [isPickerOpen, setIsPickerOpen] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
    if (onOpenChange) onOpenChange(false);
  }, [onOpenChange, setIsOpen]);

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
        onClick={() => [setIsOpen(true)]}
      />
    </div>
  );
};
