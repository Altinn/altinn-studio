import React, { ReactNode, useState } from 'react';
import classes from './ExpandablePolicyElement.module.css';
import { ChevronDownIcon, ChevronUpIcon } from '@navikt/aksel-icons';
import { DropdownMenu } from './DropdownMenu';
import { Label } from '@digdir/design-system-react';

interface Props {
  title: string;
  children: ReactNode;
  isCard?: boolean;
  handleRemoveElement: () => void;
  handleDuplicateElement: () => void;
  hasError?: boolean;
}

/**
 * Displays a wrapper component that can be expanded and collapsed. The wrapper
 * component is wrapped around the content that can be collapsed.
 *
 * @param props.title the title to display on the element.
 * @param props.children the React childrens to display inside it.
 * @param props.isCard optional for if the component is a card or an element
 * @param props.handleRemoveElement function to be executed when the element is to be removed
 * @param props.handleDuplicateElement function to be executed when the element is duplicated
 */
export const ExpandablePolicyElement = ({
  title: cardTitle,
  children,
  isCard = true,
  handleRemoveElement,
  handleDuplicateElement,
  hasError = false,
}: Props) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleClickMoreButton = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const getElementClassName = () => {
    if (isCard) {
      if (hasError) return `${classes.cardErrorWrapper}`;
      return classes.cardWrapper;
    }
    return classes.elementWrapper;
  };

  const getTopWrapperErrorClassName = () => {
    if (isCard && hasError) {
      return `${classes.topWrapperError} ${isOpen && classes.topWrapperErrorOpen}`;
    }
  };

  return (
    <div className={getElementClassName()}>
      <div className={`${classes.topWrapper} ${getTopWrapperErrorClassName()}`}>
        <button
          className={isCard ? classes.cardExpandButton : classes.elementExpandButton}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <Label size='small'>{cardTitle}</Label>
          {isOpen ? (
            <ChevronUpIcon title='Close the card' fontSize='1.8rem' />
          ) : (
            <ChevronDownIcon title='Open the card' fontSize='1.8rem' />
          )}
        </button>
        <DropdownMenu
          isOpen={isDropdownOpen}
          handleClickMoreIcon={handleClickMoreButton}
          handleCloseMenu={() => setIsDropdownOpen(false)}
          handleDuplicate={handleDuplicateElement}
          handleDelete={() => {
            handleRemoveElement();
            setIsDropdownOpen(false);
          }}
        />
      </div>
      {isOpen && (
        <div className={isCard ? classes.cardBottomWrapper : classes.elementBottomWrapper}>
          {children}
        </div>
      )}
    </div>
  );
};
