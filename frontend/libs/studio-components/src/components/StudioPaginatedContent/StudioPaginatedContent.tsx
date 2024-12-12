import React, { type ReactNode, type ReactElement, useState } from 'react';
import classes from './StudioPaginatedContent.module.css';
import { StudioButton } from '../StudioButton';
import { ChevronLeftIcon, ChevronRightIcon } from '@studio/icons';

type PaginatedItem = {
  children: ReactNode;
  disableNext: boolean;
};

export type StudioPaginatedContentProps = {
  items: PaginatedItem[];
  previousButtonText: string;
  nextButtonText: string;
};

export const StudioPaginatedContent = ({
  items,
  previousButtonText,
  nextButtonText,
}: StudioPaginatedContentProps): ReactElement => {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = items.length;
  const currentItem = items[currentPage];

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1 && !currentItem.disableNext) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  return (
    <div className={classes.wrapper}>
      <div>{currentItem.children}</div>
      <div className={classes.buttonWrapper}>
        <StudioButton
          variant='tertiary'
          size='sm'
          onClick={handlePrevious}
          disabled={currentPage <= 0}
        >
          <ChevronLeftIcon className={classes.icon} />
          {previousButtonText}
        </StudioButton>
        <div className={classes.statusBarContainer}>
          {Array.from({ length: totalPages }, (_, index) => (
            <div
              key={index}
              className={`${classes.statusBarPiece} ${index <= currentPage ? classes.active : ''}`}
            />
          ))}
        </div>
        <StudioButton
          variant='tertiary'
          size='sm'
          onClick={handleNext}
          disabled={currentPage >= totalPages - 1 || currentItem.disableNext}
        >
          {nextButtonText}
          <ChevronRightIcon />
        </StudioButton>
      </div>
    </div>
  );
};
