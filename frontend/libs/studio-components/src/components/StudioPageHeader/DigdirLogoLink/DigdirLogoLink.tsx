import React from 'react';
import classes from './DigdirLogoLink.module.css';
import { DigdirLogo } from './DigdirLogo';
import { Paragraph } from '@digdir/design-system-react';
import { StudioPageHeaderButton } from '../StudioPageHeaderButton';
import { useStudioPageHeaderContext } from '../context';

export type DigdirLogoLinkProps = {
  title?: string;
};

export const DigdirLogoLink = ({ title }: DigdirLogoLinkProps): React.ReactElement => {
  const { variant } = useStudioPageHeaderContext();
  const color = variant === 'regular' ? 'dark' : 'light';

  return (
    <div className={classes.wrapper}>
      <StudioPageHeaderButton asChild color={color}>
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
