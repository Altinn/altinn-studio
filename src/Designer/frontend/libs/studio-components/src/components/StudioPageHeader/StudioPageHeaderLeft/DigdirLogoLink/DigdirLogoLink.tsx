import React from 'react';
import classes from './DigdirLogoLink.module.css';
import { DigdirLogo } from './DigdirLogo';
import { StudioParagraph } from '../../../StudioParagraph';

export type DigdirLogoLinkProps = {
  title: string;
  showTitle: boolean;
};

export const DigdirLogoLink = ({ title, showTitle }: DigdirLogoLinkProps): React.ReactElement => {
  return (
    <div className={classes.wrapper}>
      <DigdirLogo />
      {showTitle && (
        <StudioParagraph data-size='lg' className={classes.titleText}>
          {title}
        </StudioParagraph>
      )}
    </div>
  );
};
