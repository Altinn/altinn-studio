import React, { type ElementType, forwardRef, type ReactElement } from 'react';
import { StudioButton, type StudioButtonProps } from '../../StudioButton';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';
import type { OverridableComponent } from '../../../types/OverridableComponent';
import type { OverridableComponentProps } from '../../../types/OverridableComponentProps';
import type { OverridableComponentRef } from '../../../types/OverridableComponentRef';

export type StudioPageHeaderHeaderButtonProps = {
  variant: StudioPageHeaderVariant;
} & Omit<StudioButtonProps, 'color' | 'variant'>;

function StudioPageHeaderHeaderButtonComponent<As extends ElementType = 'button'>(
  {
    variant = 'tertiary',
    className: givenClass,
    'data-color': dataColor = 'neutral',
    ...rest
  }: OverridableComponentProps<StudioPageHeaderHeaderButtonProps, As>,
  ref: OverridableComponentRef<As>,
): ReactElement {
  return <StudioButton ref={ref} data-color={dataColor} variant={variant} {...rest} />;
}

const ForwardedStudioPageHeaderHeaderButton: OverridableComponent<
  StudioPageHeaderHeaderButtonProps,
  HTMLButtonElement
> = forwardRef<HTMLButtonElement, StudioPageHeaderHeaderButtonProps>(
  StudioPageHeaderHeaderButtonComponent,
);

ForwardedStudioPageHeaderHeaderButton.displayName = 'StudioPageHeader.HeaderButton';

export { ForwardedStudioPageHeaderHeaderButton as StudioPageHeaderHeaderButton };
