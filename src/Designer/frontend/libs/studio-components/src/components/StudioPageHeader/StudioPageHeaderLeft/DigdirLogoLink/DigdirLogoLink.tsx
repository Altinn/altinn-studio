import React from 'react';
import classes from './DigdirLogoLink.module.css';
import { DigdirLogo } from './DigdirLogo';
import { StudioParagraph } from '../../../StudioParagraph';
import { StudioLink } from '../../../StudioLink';
import { useStudioPageHeaderContext } from '../../context';
import cn from 'classnames';

export type DigdirLogoLinkProps = {
  title: string;
  showTitle: boolean;
};

export const DigdirLogoLink = ({ title, showTitle }: DigdirLogoLinkProps): React.ReactElement => {
  const { variant } = useStudioPageHeaderContext();
  const isPreview = variant === 'preview';

  return (
    <div className={classes.wrapper}>
      <StudioLink href='/'>
        <DigdirLogo />
      </StudioLink>

      {showTitle && (
        <StudioParagraph
          data-size='md'
          className={cn(classes.titleText, isPreview && classes.preview)}
        >
          {title}
        </StudioParagraph>
      )}
    </div>
  );
};
