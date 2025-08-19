import React, { forwardRef, type ReactNode, type ReactElement, type Ref } from 'react';
import cn from 'classnames';
import classes from '../common.module.css';
import { StudioButton, type StudioButtonProps } from '../../StudioButton';
import { StudioLinkButton, type StudioLinkButtonProps } from '../../StudioLinkButton';
import type { StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import type { StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';

type HeaderButtonCommonProps = {
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
  className?: string;
  children: ReactNode;
};

type ButtonWithOmittedProps = Omit<StudioButtonProps, 'data-color' | 'variant'>;
export type HeaderButtonAsButtonProps = {
  asLink?: false;
} & ButtonWithOmittedProps &
  HeaderButtonCommonProps;

type LinkWithOmittedProps = Omit<StudioLinkButtonProps, 'data-color' | 'variant'>;
export type HeaderButtonAsLinkProps = {
  asLink: true;
} & LinkWithOmittedProps &
  HeaderButtonCommonProps;

export type StudioPageHeaderHeaderButtonProps = HeaderButtonAsButtonProps | HeaderButtonAsLinkProps;

export const StudioPageHeaderHeaderButton = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  StudioPageHeaderHeaderButtonProps
>(function StudioPageHeaderHeaderButton(
  { color, variant, className: givenClass, asLink, ...rest },
  ref,
): ReactElement {
  if (asLink) {
    const linkProps = rest as LinkWithOmittedProps;

    return (
      <StudioLinkButton
        ref={ref as Ref<HTMLAnchorElement>}
        className={cn(classes.linkOrButton, classes[variant], classes[color], givenClass)}
        {...linkProps}
      />
    );
  }

  const buttonProps = rest as ButtonWithOmittedProps;
  return (
    <StudioButton
      ref={ref as Ref<HTMLButtonElement>}
      className={cn(classes.linkOrButton, classes[variant], classes[color], givenClass)}
      {...buttonProps}
    />
  );
});

StudioPageHeaderHeaderButton.displayName = 'StudioPageHeader.HeaderButton';
