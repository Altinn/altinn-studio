import React from 'react';
import classes from './DigdirLogoLink.module.css';
import { DigdirLogo } from './DigdirLogo';
import { Paragraph } from '@digdir/design-system-react';
import { StudioPageHeaderButton } from '../StudioPageHeaderButton';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';
import { type StudioPageHeaderColor } from '../types/StudioPageHeaderColor';

export type DigdirLogoLinkProps = {
  title?: string;
  variant: StudioPageHeaderVariant; // TODO - Maybe move into context?
};

export const DigdirLogoLink = ({ title, variant }: DigdirLogoLinkProps): React.ReactElement => {
  const color: StudioPageHeaderColor = variant === 'regular' ? 'dark' : 'light';
  return (
    <div className={classes.wrapper}>
      <StudioPageHeaderButton asChild color={color} variant={variant}>
        <a href='/'>
          <DigdirLogo />
        </a>
      </StudioPageHeaderButton>
      {title && (
        <Paragraph size='large' className={classes.titleText}>
          {title}
        </Paragraph>
      )}
    </div>
  );
};
