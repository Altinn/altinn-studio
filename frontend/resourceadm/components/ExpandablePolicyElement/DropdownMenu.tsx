import React, { useEffect, useRef } from 'react';
import classes from './DropdownMenu.module.css';
import { Button } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon, TabsIcon, TrashIcon } from '@navikt/aksel-icons';

interface Props {
  isOpen: boolean;
  handleClickMoreIcon: () => void;
  handleCloseMenu: () => void;
  handleDuplicate: () => void;
  handleDelete: () => void;
}

/**
 * Dropdown menu component that displays a duplicate and a delete button
 *
 * @param props.isOpen boolean for if the menu is open or not
 * @param props.handleClickMoreIcon function to be executed when the menu icon is clicked
 * @param props.handleCloseMenu function to be executed when closing the menu
 * @param props.handleDuplicate function to handle the click of the duplicate button
 * @param props.handleDelete function to handle the click of the delete button
 */
export const DropdownMenu = ({
  isOpen,
  handleClickMoreIcon,
  handleCloseMenu,
  handleDuplicate,
  handleDelete,
}: Props) => {
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
    if (e.key === 'Escape') {
      handleCloseMenu();
    }
  };

  /**
   * Closes the menu when the menu is open and the user is navigating backwards
   * out of the menu using SHIFT + TAB.
   */
  const handleFirstMenuItemShiftTabKey = (e: KeyboardEvent) => {
    if (e.key === 'Tab' && e.shiftKey && e.target === firstMenuItemRef.current) {
      handleCloseMenu();
    }
  };

  /**
   * Closes the menu when the menu is open and the user is navigating
   * out of the menu using TAB.
   */
  const handleLastMenuItemTabKey = (e: KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      handleCloseMenu();
    }
  };

  /**
   * Listens to the events of clicking outside or using the keys on the menu
   */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => handleClickOutside(e);
    const handleKeydown = (e: KeyboardEvent) => handleEscapeKey(e);
    const handleFirstTabKey = (e: KeyboardEvent) => handleFirstMenuItemShiftTabKey(e);
    const handleLastTabKey = (e: KeyboardEvent) => handleLastMenuItemTabKey(e);

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);

    if (isOpen && firstMenuItemRef.current && lastMenuItemRef.current) {
      const firstMenuItem = firstMenuItemRef.current;
      const lastMenuItem = lastMenuItemRef.current;

      firstMenuItem.addEventListener('keydown', handleFirstTabKey);
      lastMenuItem.addEventListener('keydown', handleLastTabKey);

      return () => {
        firstMenuItem.removeEventListener('keydown', handleFirstTabKey);
        lastMenuItem.removeEventListener('keydown', handleLastTabKey);
      };
    }

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  return (
    <div className={classes.dropdownContainer} ref={dropdownRef}>
      <Button
        icon={<MenuElipsisVerticalIcon title='More' fontSize='1.8rem' />}
        onClick={handleClickMoreIcon}
        onKeyDown={(e) => {}}
        variant='quiet'
        color='secondary'
      />
      {isOpen && (
        <div className={classes.dropdownMenu}>
          <button
            className={classes.dropdownDuplicateButton}
            type='button'
            onClick={handleDuplicate}
            ref={firstMenuItemRef}
          >
            <TabsIcon title='Dupliser' fontSize='1.3rem' />
            <p className={classes.dropdownItemText}>Lag kopi</p>
          </button>
          <button
            className={classes.dropdownDeleteButton}
            type='button'
            onClick={handleDelete}
            ref={lastMenuItemRef}
          >
            <TrashIcon title='Slett' fontSize='1.3rem' />
            <p className={classes.dropdownItemText}>Slett</p>
          </button>
        </div>
      )}
    </div>
  );
};
