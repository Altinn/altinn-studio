import React from 'react';
import classes from './DigdirLogoLink.module.css';
import { DigdirLogo } from './DigdirLogo';
import { Paragraph } from '@digdir/designsystemet-react';
import { StudioPageHeaderHeaderButton } from '../../StudioPageHeaderHeaderButton';
import { useStudioPageHeaderContext } from '../../context';

export type DigdirLogoLinkProps = {
  title: string;
  showTitle: boolean;
};

export const DigdirLogoLink = ({ title, showTitle }: DigdirLogoLinkProps): React.ReactElement => {
  const { variant } = useStudioPageHeaderContext();
  const color = variant === 'regular' ? 'dark' : 'light';

  return (
    <div className={classes.wrapper}>
      <StudioPageHeaderHeaderButton as='a' color={color} variant={variant} href='/' title={title}>
        <DigdirLogo />
      </StudioPageHeaderHeaderButton>
      {showTitle && (
        <Paragraph size='large' className={classes.titleText}>
          {title}
        </Paragraph>
      )}
    </div>
  );
};
