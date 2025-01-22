import React from 'react';
import commonClasses from '../StudioPageHeader/common.module.css';
import cn from 'classnames';

export type StudioBetaTagProps = {
  className?: string;
  'aria-label'?: string;
};

export const defaultAriaLabel = 'Beta feature';

export const StudioBetaTag = ({
  className: givenClass,
  'aria-label': ariaLabel = defaultAriaLabel,
}: StudioBetaTagProps): React.ReactElement => {
  const className = cn(commonClasses['isBeta'], givenClass);
  return (
    <span className={className} aria-label={ariaLabel}>
      Beta
    </span>
  );
};
