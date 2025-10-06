import React, { type ReactNode, type ReactElement } from 'react';
import classes from './StudioPaginatedContent.module.css';
import { StudioButton } from '../StudioButton';
import { ChevronLeftIcon, ChevronRightIcon } from '@studio/icons';
import { type StudioPaginatedNavigation } from './types/StudioPaginatedNavigation';

export type NavigationButtonTexts = {
  previous: string;
  next: string;
};

export type StudioPaginatedContentProps = {
  totalPages: number;
  currentPageNumber: number;
  componentToRender: ReactNode;
  navigationButtonTexts: NavigationButtonTexts;
  navigation: StudioPaginatedNavigation;
};

export const StudioPaginatedContent = ({
  navigation: { canGoNext = true, canGoPrevious = true, onNext, onPrevious },
  totalPages,
  componentToRender,
  currentPageNumber,
  navigationButtonTexts: { previous: previousButtonText, next: nextButtonText },
}: StudioPaginatedContentProps): ReactElement => {
  return (
    <div className={classes.wrapper}>
      <div>{componentToRender}</div>
      <div className={classes.buttonWrapper}>
        <NavigationButton onClick={onPrevious} disabled={!canGoPrevious}>
          <ChevronLeftIcon className={classes.icon} />
          {previousButtonText}
        </NavigationButton>
        <NavigationStepIndicator totalPages={totalPages} currentPageNumber={currentPageNumber} />
        <NavigationButton onClick={onNext} disabled={!canGoNext}>
          {nextButtonText}
          <ChevronRightIcon />
        </NavigationButton>
      </div>
    </div>
  );
};

type NavigationButtonProps = {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
};

const NavigationButton = ({ onClick, disabled, children }: NavigationButtonProps): ReactElement => (
  <StudioButton variant='tertiary' data-size='sm' onClick={onClick} disabled={disabled}>
    {children}
  </StudioButton>
);

type NavigationCirclesProps = {
  totalPages: number;
  currentPageNumber: number;
};

const NavigationStepIndicator = ({
  totalPages,
  currentPageNumber,
}: NavigationCirclesProps): React.ReactElement => {
  const safeTotal = Math.max(0, totalPages);
  const clampedCurrent = Math.min(Math.max(0, currentPageNumber), Math.max(0, safeTotal - 1));

  return (
    <div
      className={classes.statusBarContainer}
      role='list'
      aria-label={`Step ${clampedCurrent + 1} of ${safeTotal}`}
    >
      {Array.from({ length: safeTotal }, (_, index) => {
        const isCurrent = index === clampedCurrent;
        const isCompleted = index < clampedCurrent;
        return (
          <div
            key={index}
            role='listitem'
            aria-current={isCurrent ? 'step' : undefined}
            className={`${classes.statusBarPiece} ${isCurrent || isCompleted ? classes.active : ''}`}
          />
        );
      })}
    </div>
  );
};
