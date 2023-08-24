import React, { useEffect, useRef } from "react";
import classes from "./DropdownMenu.module.css";
import { Button, Paragraph } from "@digdir/design-system-react";
import {
  MenuElipsisVerticalIcon,
  TabsIcon,
  TrashIcon,
} from "@navikt/aksel-icons";

interface DropdownMenuProps {
  /**
   * Boolean for if the menu is open or not
   */
  isOpen: boolean;
  /**
   * Function to be executed when the menu icon is clicked
   * @returns void
   */
  handleClickMoreIcon: () => void;
  /**
   * Function to be executed when closing the menu
   * @returns void
   */
  handleCloseMenu: () => void;
  /**
   * Function to handle the click of the clone button
   * @returns void
   */
  handleClone: () => void;
  /**
   * Function to handle the click of the delete button
   * @returns void
   */
  handleDelete: () => void;
  /**
   * Optional flag for if there is an error or not
   */
  isError?: boolean;
}

/**
 * @component
 *    Dropdown menu component that displays a clone and a delete button
 *
 * @property {boolean}[isOpen] - Boolean for if the menu is open or not
 * @property {function}[handleClickMoreIcon] - Function to be executed when the menu icon is clicked
 * @property {function}[handleCloseMenu] - Function to be executed when closing the menu
 * @property {function}[handleClone] - Function to handle the click of the clone button
 * @property {function}[handleDelete] - Function to handle the click of the delete button
 * @property {boolean}[isError] - Optional flag for if there is an error or not
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const DropdownMenu = ({
  isOpen,
  handleClickMoreIcon,
  handleCloseMenu,
  handleClone,
  handleDelete,
  isError = false,
}: DropdownMenuProps): React.ReactNode => {
  // TODO - Replace this with Popover from Design system - Issue: #10869

  const dropdownRef = useRef(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);
  const lastMenuItemRef = useRef<HTMLButtonElement>(null);

  /**
   * Closes the menu when clicking outside the menu
   */
  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      handleCloseMenu();
    }
  };

  /**
   * Closes the menu when clicking the ESCAPE key
   */
  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCloseMenu();
    }
  };

  /**
   * Closes the menu when the menu is open and the user is navigating backwards
   * out of the menu using SHIFT + TAB.
   */
  const handleFirstMenuItemShiftTabKey = (e: KeyboardEvent) => {
    if (
      e.key === "Tab" &&
      e.shiftKey &&
      e.target === firstMenuItemRef.current
    ) {
      handleCloseMenu();
    }
  };

  /**
   * Closes the menu when the menu is open and the user is navigating
   * out of the menu using TAB.
   */
  const handleLastMenuItemTabKey = (e: KeyboardEvent) => {
    if (e.key === "Tab" && !e.shiftKey) {
      handleCloseMenu();
    }
  };

  /**
   * Listens to the events of clicking outside or using the keys on the menu
   */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => handleClickOutside(e);
    const handleKeydown = (e: KeyboardEvent) => handleEscapeKey(e);
    const handleFirstTabKey = (e: KeyboardEvent) =>
      handleFirstMenuItemShiftTabKey(e);
    const handleLastTabKey = (e: KeyboardEvent) => handleLastMenuItemTabKey(e);

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeydown);

    if (isOpen && firstMenuItemRef.current && lastMenuItemRef.current) {
      const firstMenuItem = firstMenuItemRef.current;
      const lastMenuItem = lastMenuItemRef.current;

      firstMenuItem.addEventListener("keydown", handleFirstTabKey);
      lastMenuItem.addEventListener("keydown", handleLastTabKey);

      return () => {
        firstMenuItem.removeEventListener("keydown", handleFirstTabKey);
        lastMenuItem.removeEventListener("keydown", handleLastTabKey);
      };
    }

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeydown);
    };
  });

  return (
    <div className={classes.dropdownContainer} ref={dropdownRef}>
      <Button
        icon={<MenuElipsisVerticalIcon title="More" fontSize="1.8rem" />}
        onClick={handleClickMoreIcon}
        onKeyDown={() => {}}
        variant="quiet"
        color={isError ? "danger" : "secondary"}
        className={isError && classes.errorButton}
      />
      {isOpen && (
        <div className={classes.dropdownMenu}>
          <button
            className={classes.dropdownDuplicateButton}
            type="button"
            onClick={handleClone}
            ref={firstMenuItemRef}
          >
            <TabsIcon title="Dupliser" fontSize="1.3rem" />
            <Paragraph short size="xsmall" className={classes.dropdownItemText}>
              Lag kopi
            </Paragraph>
          </button>
          <button
            className={classes.dropdownDeleteButton}
            type="button"
            onClick={handleDelete}
            ref={lastMenuItemRef}
          >
            <TrashIcon title="Slett" fontSize="1.3rem" />
            <Paragraph short size="xsmall" className={classes.dropdownItemText}>
              Slett
            </Paragraph>
          </button>
        </div>
      )}
    </div>
  );
};
