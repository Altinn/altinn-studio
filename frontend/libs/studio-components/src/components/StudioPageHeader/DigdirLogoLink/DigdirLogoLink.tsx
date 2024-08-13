import React from 'react';
import classes from './DigdirLogoLink.module.css';
import { DigdirLogo } from './DigdirLogo';
import { Paragraph } from '@digdir/design-system-react';
import { StudioButton } from '../../StudioButton';

export type DigdirLogoLinkProps = {
  title?: string;
};

export const DigdirLogoLink = ({ title }: DigdirLogoLinkProps): React.ReactElement => {
  return (
    <div className={classes.wrapper}>
      <StudioButton asChild color='inverted'>
        <a href='/'>
          <DigdirLogo />
        </a>
      </StudioButton>
      {title && (
        <Paragraph size='large' className={classes.titleText}>
          {title}
        </Paragraph>
      )}
    </div>
  );
};
