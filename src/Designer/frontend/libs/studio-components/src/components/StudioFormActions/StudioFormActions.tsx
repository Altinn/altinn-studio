import React, { forwardRef, type Ref } from 'react';
import { StudioButton } from '../StudioButton';
import classes from './StudioFormActions.module.css';
import {
  PrimaryActionMode,
  primaryConfig,
  SecondaryActionMode,
  secondaryConfig,
} from './StudioFormActionsUtils';
import { StudioSpinner } from '../StudioSpinner';

export type StudioFormActionsProps = {
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  primaryText?: string;
  secondaryText?: string;
  isLoading?: boolean;
  spinnerAriaLabel?: string;
  disabled?: boolean;
  primaryMode?: PrimaryActionMode;
  secondaryMode?: SecondaryActionMode;
};

function StudioFormActions(
  {
    onPrimaryAction,
    onSecondaryAction,
    primaryText,
    secondaryText,
    isLoading,
    spinnerAriaLabel,
    disabled,
    primaryMode = PrimaryActionMode.Save,
    secondaryMode = SecondaryActionMode.Cancel,
  }: StudioFormActionsProps,
  ref: Ref<HTMLDivElement>,
): React.ReactElement {
  const primary = primaryConfig[primaryMode];
  const secondary = secondaryConfig[secondaryMode];
  const primaryIcon = isLoading ? <StudioSpinner aria-label={spinnerAriaLabel} /> : primary.icon;

  return (
    <div className={classes.buttonGroup} ref={ref}>
      <StudioButton
        onClick={onPrimaryAction}
        disabled={disabled || isLoading}
        icon={primaryIcon}
        variant={primary.variant}
      >
        {primaryText}
      </StudioButton>
      <StudioButton
        onClick={onSecondaryAction}
        disabled={isLoading}
        variant={secondary.variant}
        data-color={secondary.color}
        icon={secondary.icon}
      >
        {secondaryText}
      </StudioButton>
    </div>
  );
}

const ForwardedStudioFormActions = forwardRef(StudioFormActions);

export { ForwardedStudioFormActions as StudioFormActions };
