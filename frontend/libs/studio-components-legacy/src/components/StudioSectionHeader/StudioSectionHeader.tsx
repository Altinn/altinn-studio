import React, { forwardRef, type HTMLAttributes } from 'react';
import { Heading, type HeadingProps } from '@digdir/designsystemet-react';
import { StudioHelpText } from '@studio/components';

import classes from './StudioSectionHeader.module.css';
import cn from 'classnames';

export type StudioSectionHeaderProps = {
  icon?: React.ReactNode;
  heading: {
    text: string;
    level?: HeadingProps['level'];
  };
  helpText?: {
    text: string;
    title: string;
  };
  menu?: React.ReactNode;
} & HTMLAttributes<HTMLDivElement>;

const StudioSectionHeader = forwardRef<HTMLDivElement, StudioSectionHeaderProps>(
  (
    { heading, helpText, icon, className: givenClassName, menu, ...rest }: StudioSectionHeaderProps,
    ref,
  ): React.ReactElement => {
    const className = cn(givenClassName, classes.container);
    return (
      <div {...rest} className={className} ref={ref}>
        <div className={classes.iconTitleContainer}>
          {icon ? icon : null}
          <Heading size='xxsmall' level={heading.level ?? 2}>
            {heading.text}
          </Heading>
        </div>
        {helpText && <StudioHelpText aria-label={helpText.title}>{helpText.text}</StudioHelpText>}
        {menu}
      </div>
    );
  },
);

StudioSectionHeader.displayName = 'StudioSectionHeader';

export { StudioSectionHeader };
