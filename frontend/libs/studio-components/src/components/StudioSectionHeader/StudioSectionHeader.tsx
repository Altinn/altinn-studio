import React, { forwardRef, type HTMLAttributes } from 'react';
import { Heading, type HeadingProps, HelpText } from '@digdir/design-system-react';

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
} & HTMLAttributes<HTMLDivElement>;

const StudioSectionHeader = forwardRef<HTMLDivElement, StudioSectionHeaderProps>(
  (
    { heading, helpText, icon, className: givenClassName, ...rest }: StudioSectionHeaderProps,
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
        {helpText && (
          <HelpText size='medium' title={helpText.title}>
            {helpText.text}
          </HelpText>
        )}
      </div>
    );
  },
);

StudioSectionHeader.displayName = 'StudioSectionHeader';

export { StudioSectionHeader };
