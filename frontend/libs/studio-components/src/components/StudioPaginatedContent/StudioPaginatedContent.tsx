import React, { type ReactNode, type ReactElement } from 'react';
import classes from './StudioPaginatedContent.module.css';
import { StudioButton } from '../StudioButton';
import { ChevronLeftIcon, ChevronRightIcon } from '@studio/icons';
import { type StudioPaginatedNavigation } from './types/StudioPaginatedNavigation';

type ButtonTexts = {
  previous: string;
  next: string;
};

export type StudioPaginatedContentProps = {
  totalPages: number;
  currentPageNumber: number;
  componentToRender: ReactNode;
  buttonTexts: ButtonTexts;
  navigation: StudioPaginatedNavigation;
};

export const StudioPaginatedContent = ({
  navigation: { canGoNext = true, canGoPrevious = true, onNext, onPrevious },
  totalPages,
  componentToRender,
  currentPageNumber,
  buttonTexts: { previous: previousButtonText, next: nextButtonText },
}: StudioPaginatedContentProps): ReactElement => {
  return (
    <div className={classes.wrapper}>
      <div>{componentToRender}</div>
      <div className={classes.buttonWrapper}>
        <StudioButton variant='tertiary' size='sm' onClick={onPrevious} disabled={!canGoPrevious}>
          <ChevronLeftIcon className={classes.icon} />
          {previousButtonText}
        </StudioButton>
        <NavigationCircles totalPages={totalPages} currentPageNumber={currentPageNumber} />
        <StudioButton variant='tertiary' size='sm' onClick={onNext} disabled={!canGoNext}>
          {nextButtonText}
          <ChevronRightIcon />
        </StudioButton>
      </div>
    </div>
  );
};

type NavigationCirclesProps = {
  totalPages: number;
  currentPageNumber: number;
};

const NavigationCircles = ({ totalPages, currentPageNumber }: NavigationCirclesProps) => {
  return (
    <div className={classes.statusBarContainer}>
      {getArrayFromLength(totalPages).map((_, index) => (
        <div
          key={index}
          role='status'
          className={`${classes.statusBarPiece} ${index <= currentPageNumber ? classes.active : ''}`}
        />
      ))}
    </div>
  );
};

const getArrayFromLength = (length: number): number[] =>
  Array.from({ length }, (_, index) => index);
