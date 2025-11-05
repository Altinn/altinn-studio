import type { ReactNode } from 'react';
import React, { useState } from 'react';
import classes from './ExpandablePolicyElement.module.css';
import { ChevronDownIcon, ChevronUpIcon } from '@studio/icons';
import { PolicyEditorDropdownMenu } from './PolicyEditorDropdownMenu';
import { useTranslation } from 'react-i18next';
import { StudioParagraph, StudioLabelAsParagraph } from '@studio/components';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';

export type ExpandablePolicyElementProps = {
  title: string;
  description?: string;
  children: ReactNode;
  isCard?: boolean;
  handleRemoveElement: () => void;
  handleCloneElement: () => void;
  hasError?: boolean;
};

export const ExpandablePolicyElement = ({
  title,
  description,
  children,
  isCard = true,
  handleRemoveElement,
  handleCloneElement,
  hasError = false,
}: ExpandablePolicyElementProps): React.ReactNode => {
  const { t } = useTranslation();
  const { usageType } = usePolicyEditorContext();

  const [isOpen, setIsOpen] = useState(usageType !== 'app');
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
          <div className={classes.headerWrapper}>
            <StudioLabelAsParagraph data-size='sm'>{title}</StudioLabelAsParagraph>
            {description && (
              <StudioParagraph data-size='xs' className={classes.headerDescription}>
                {description}
              </StudioParagraph>
            )}
          </div>
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
