import React from 'react';

import { getLabelId } from 'src/components/label/Label';
import classes from 'src/components/presentation/Progress.module.css';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNavigationParam } from 'src/hooks/navigation';
import { useNavigatePage } from 'src/hooks/useNavigatePage';

export const Progress = () => {
  const currentPageId = useNavigationParam('pageKey');
  const { order } = useNavigatePage();
  const { langAsString } = useLanguage();

  if (!currentPageId) {
    return null;
  }

  const currentPageIndex = order?.findIndex((page) => page === currentPageId) || 0;
  const currentPageNum = currentPageIndex + 1;

  const numberOfPages = order?.length || 0;
  const labelText = `${currentPageNum}/${numberOfPages}`;
  const value = numberOfPages ? (currentPageNum / numberOfPages) * 100 : 0;

  return (
    <CircularProgress
      value={value}
      id='progress'
      label={labelText}
      ariaLabel={langAsString('general.progress', [currentPageNum, numberOfPages])}
    />
  );
};

type CircularProgressProps = {
  id: string;
  value: number;
  ariaLabel?: string;
  label?: string;
};

const CircularProgress = ({ value, ariaLabel, label, id }: CircularProgressProps) => {
  const labelId = getLabelId(id);
  const ariaLabelledby = !ariaLabel && label ? labelId : undefined;
  return (
    <div
      id={id}
      className={classes.container}
      role='progressbar'
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabel}
    >
      {label && (
        <div
          id={labelId}
          className={classes.label}
        >
          {label}
        </div>
      )}
      <svg
        className={classes.svg}
        viewBox='0 0 35.8 35.8'
        aria-hidden={true}
      >
        <Circle className={classes.circleBackground} />
        <Circle
          strokeDashoffset={100 - value}
          className={classes.circleTransition}
        />
      </svg>
    </div>
  );
};

const Circle = (props: React.SVGProps<SVGCircleElement>) => (
  <circle
    cx='50%'
    cy='50%'
    fill='none'
    r='15.9155'
    strokeWidth={2.5}
    {...props}
  />
);
