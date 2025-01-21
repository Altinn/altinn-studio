import React from 'react';
import commonClasses from '../StudioPageHeader/common.module.css';
import cn from 'classnames';

export type StudioBetaTag = {
  className?: string;
};

export const StudioBetaTag = ({ className: givenClass }: StudioBetaTag): React.ReactElement => {
  const className = cn(commonClasses['isBeta'], givenClass);
  return <div className={className}>Beta</div>;
};
