import React, { forwardRef } from 'react';
import type { ReactElement, ReactNode, Ref, HTMLAttributes } from 'react';
import classes from './StudioSectionHeader.module.css';
import cn from 'classnames';
import { StudioHeading } from '../StudioHeading';
import type { StudioHeadingProps } from '../StudioHeading';
import { StudioHelpText } from '../StudioHelpText';

export type StudioSectionHeaderProps = {
  icon?: ReactNode;
  heading: {
    text: string;
    level?: StudioHeadingProps['level'];
  };
  helpText?: {
    text: string;
    title: string;
  };
  menu?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

function StudioSectionHeader(
  { heading, helpText, icon, className: givenClassName, menu, ...rest }: StudioSectionHeaderProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  const className = cn(givenClassName, classes.container);
  return (
    <div {...rest} className={className} ref={ref}>
      <div className={classes.iconTitleContainer}>
        {icon ? icon : null}
        <StudioHeading data-size='2xs' level={heading.level ?? 2}>
          {heading.text}
        </StudioHeading>
      </div>
      {helpText && (
        <StudioHelpText aria-label={helpText.title} title={helpText.title}>
          {helpText.text}
        </StudioHelpText>
      )}
      {menu}
    </div>
  );
}

StudioSectionHeader.displayName = 'StudioSectionHeader';

const ForwardedStudioSectionHeader = forwardRef(StudioSectionHeader);

export { ForwardedStudioSectionHeader as StudioSectionHeader };
