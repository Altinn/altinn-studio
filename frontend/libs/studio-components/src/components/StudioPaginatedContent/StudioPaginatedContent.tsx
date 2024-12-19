import React, { type ReactNode, type ReactElement } from 'react';
import classes from './StudioPaginatedContent.module.css';
import { StudioButton } from '../StudioButton';
import { ChevronLeftIcon, ChevronRightIcon } from '@studio/icons';

export type StudioPaginatedContentProps = {
  componentToRender: ReactNode;
  totalPages: number;
  currentPageNumber: number;
  previousButtonText: string;
  nextButtonText: string;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  onNext: () => void;
  onPrevious: () => void;
};

export const StudioPaginatedContent = ({
  componentToRender,
  totalPages,
  currentPageNumber,
  previousButtonText,
  nextButtonText,
  canGoNext = true,
  canGoPrevious = true,
  onNext,
  onPrevious,
}: StudioPaginatedContentProps): ReactElement => {
  return (
    <div className={classes.wrapper}>
      <div>{componentToRender}</div>
      <div className={classes.buttonWrapper}>
        <StudioButton variant='tertiary' size='sm' onClick={onPrevious} disabled={!canGoPrevious}>
          <ChevronLeftIcon className={classes.icon} />
          {previousButtonText}
        </StudioButton>
        <div className={classes.statusBarContainer}>
          {Array.from({ length: totalPages }, (_, index) => (
            <div
              key={index}
              className={`${classes.statusBarPiece} ${index <= currentPageNumber ? classes.active : ''}`}
            />
          ))}
        </div>
        <StudioButton variant='tertiary' size='sm' onClick={onNext} disabled={!canGoNext}>
          {nextButtonText}
          <ChevronRightIcon />
        </StudioButton>
      </div>
    </div>
  );
};
