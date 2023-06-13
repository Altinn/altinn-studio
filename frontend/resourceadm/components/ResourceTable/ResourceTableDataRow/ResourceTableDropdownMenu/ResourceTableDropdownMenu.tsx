import React, { useEffect, useRef } from 'react';
import classes from './ResourceTableDropdownMenu.module.css';
import { Button } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon, TrashIcon } from '@navikt/aksel-icons';

interface Props {
  isOpen: boolean;
  handleClickMoreIcon: () => void;
  handleCloseMenu: () => void;
  handleDelete: () => void;
}

/**
 * Dropdown menu component that displays a delete button
 *
 * @param props.isOpen boolean for if the menu is open or not
 * @param props.handleClickMoreIcon function to be executed when the menu icon is clicked
 * @param props.handleCloseMenu function to be executed when closing the menu
 * @param props.handleDelete function to handle the click of the delete button
 */
export const ResourceTableDropdownMenu = ({
  isOpen,
  handleClickMoreIcon,
  handleCloseMenu,
  handleDelete,
}: Props) => {
  const dropdownRef = useRef(null);
  const menuItemRef = useRef<HTMLButtonElement>(null);

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
   * Closes the menu when the menu is open and the user is navigating
   * out of the menu using TAB.
   */
  const handleMenuItemTabKey = (e: KeyboardEvent) => {
    if ((e.key === 'Tab' && !e.shiftKey) || (e.key === 'Tab' && e.shiftKey)) {
      handleCloseMenu();
    }
  };

  /**
   * Listens to the events of clicking outside or using the keys on the menu
   */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => handleClickOutside(e);
    const handleKeydown = (e: KeyboardEvent) => handleEscapeKey(e);
    const handleTabKey = (e: KeyboardEvent) => handleMenuItemTabKey(e);

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);

    if (isOpen && menuItemRef.current) {
      const menuItem = menuItemRef.current;

      menuItem.addEventListener('keydown', handleTabKey);

      return () => {
        menuItem.removeEventListener('keydown', handleTabKey);
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
            className={classes.dropdownDeleteButton}
            type='button'
            onClick={handleDelete}
            ref={menuItemRef}
          >
            <TrashIcon title='Slett' fontSize='1.3rem' />
            <p className={classes.dropdownItemText}>Slett</p>
          </button>
        </div>
      )}
    </div>
  );
};
