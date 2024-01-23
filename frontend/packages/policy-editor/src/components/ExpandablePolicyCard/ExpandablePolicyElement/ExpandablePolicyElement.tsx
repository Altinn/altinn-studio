import React, { ReactNode, useState } from 'react';
import classes from './ExpandablePolicyElement.module.css';
import { ChevronDownIcon, ChevronUpIcon } from '@navikt/aksel-icons';
import { PolicyEditorDropdownMenu } from './PolicyEditorDropdownMenu';
import { Label } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export type ExpandablePolicyElementProps = {
  title: string;
  children: ReactNode;
  isCard?: boolean;
  handleRemoveElement: () => void;
  handleCloneElement: () => void;
  hasError?: boolean;
};

/**
 * @component
 *    Displays a wrapper component that can be expanded and collapsed. The wrapper
 *    component is wrapped around the content that can be collapsed.
 *
 * @example
 *    <ExpandablePolicyElement
 *      title='Some title'
 *      isCard
 *      handleCloneElement={handleCloneRule}
 *      handleRemoveElement={handleDeleteRule}
 *      hasError={showErrors && getHasRuleError()}
 *    >
 *      <div>...</div>
 *    </ExpandablePolicyElement>
 *
 * @property {string}[title] - The title to display on the element.
 * @property {ReactNode}[children] - The React childrens to display inside it.
 * @property {boolean}[isCard] - Optional flag for if the component is a card or an element
 * @property {function}[handleRemoveElement] - Function to be executed when the element is to be removed
 * @property {function}[handleCloneElement] - Function to be executed when the element is cloned
 * @property {boolean}[hasError] - Optional flag for if the component has error
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ExpandablePolicyElement = ({
  title,
  children,
  isCard = true,
  handleRemoveElement,
  handleCloneElement,
  hasError = false,
}: ExpandablePolicyElementProps): React.ReactNode => {
  const { t } = useTranslation();

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
          <Label as='p' size='small'>
            {title}
          </Label>
          {isOpen ? (
            <ChevronUpIcon
              title={t('policy_editor.expandable_card_close_icon')}
              fontSize='1.8rem'
            />
          ) : (
            <ChevronDownIcon
              title={t('policy_editor.expandable_card_open_icon')}
              fontSize='1.8rem'
            />
          )}
        </button>
        <PolicyEditorDropdownMenu
          isOpen={isDropdownOpen}
          handleClickMoreIcon={handleClickMoreButton}
          handleCloseMenu={() => setIsDropdownOpen(false)}
          handleClone={() => {
            handleCloneElement();
            setIsDropdownOpen(false);
          }}
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
