import React, { forwardRef, type Ref } from 'react';
import { StudioButton } from '../StudioButton';
import classes from './StudioFormActions.module.css';
import { StudioCancelIcon, StudioSaveIcon } from '@studio/icons';

export type PrimaryProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

export type SecondaryProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

export type StudioFormActionsProps = {
  primary: PrimaryProps;
  secondary: SecondaryProps;
  isLoading: boolean;
  iconOnly?: boolean;
};

function StudioFormActions(
  { primary, secondary, isLoading, iconOnly = false }: StudioFormActionsProps,
  ref: Ref<HTMLDivElement>,
): React.ReactElement {
  const isPrimaryButtonDisabled = primary.disabled || isLoading;
  const isSecondaryButtonDisabled = secondary.disabled || isLoading;
  const shouldDisplayLabel = !iconOnly;

  return (
    <div className={classes.buttonGroup} ref={ref}>
      <StudioButton
        onClick={primary.onClick}
        disabled={isPrimaryButtonDisabled}
        loading={isLoading}
        aria-label={iconOnly ? primary.label : undefined}
      >
        {!isLoading && <StudioSaveIcon aria-hidden />}
        {shouldDisplayLabel && primary.label}
      </StudioButton>
      <StudioButton
        onClick={secondary.onClick}
        disabled={isSecondaryButtonDisabled}
        variant='secondary'
        aria-label={iconOnly ? secondary.label : undefined}
      >
        <StudioCancelIcon aria-hidden />
        {shouldDisplayLabel && secondary.label}
      </StudioButton>
    </div>
  );
}

const ForwardedStudioFormActions = forwardRef(StudioFormActions);

export { ForwardedStudioFormActions as StudioFormActions };
