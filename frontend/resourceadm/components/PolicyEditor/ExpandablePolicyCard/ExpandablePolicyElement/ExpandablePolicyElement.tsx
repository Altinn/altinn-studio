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

  const [isButtonFocused, setIsButtonFocused] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const handleClickMoreButton = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const getTopWrapperErrorClassName = () => {
    if (isCard && hasError) {
      return `${classes.topWrapperError} ${isOpen && classes.topWrapperErrorOpen}`;
    }
  };

  return (
    <div
      className={`
        ${classes.wrapper}
        ${isCard ? classes.cardWrapper : classes.elementWrapper}
        ${hasError && isCard && classes.cardError}
        ${hasError && isCard && isButtonHovered && classes.cardErrorHover}
        ${isButtonFocused && classes.buttonFocused}
        ${!hasError && isButtonHovered && classes.buttonHovered}
      `}
    >
      <div
        className={`
        ${classes.topWrapper}
        ${isCard ? classes.topWrapperCard : classes.topWrapperElement}
        ${isOpen && isCard && classes.topWrapperCardOpen}
        ${isOpen && !isCard && classes.topWrapperElementOpen}
        ${getTopWrapperErrorClassName()}`}
      >
        <button
          className={isCard ? classes.cardExpandButton : classes.elementExpandButton}
          onClick={() => setIsOpen((prev) => !prev)}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          onFocus={() => setIsButtonFocused(true)}
          onBlur={() => setIsButtonFocused(false)}
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
          isError={hasError}
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
