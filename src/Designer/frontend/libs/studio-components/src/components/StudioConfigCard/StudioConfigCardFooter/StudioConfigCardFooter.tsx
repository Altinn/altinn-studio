import React, { type ReactElement } from 'react';
import { StudioFormActions } from '../../StudioFormActions';
import classes from './StudioConfigCardFooter.module.css';

export type StudioConfigCardFooterProps = {
  saveLabel: string;
  cancelLabel: string;
  onSave: () => void;
  onCancel: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
};

export function StudioConfigCardFooter({
  saveLabel,
  cancelLabel,
  onSave,
  onCancel,
  isDisabled,
  isLoading = false,
}: StudioConfigCardFooterProps): ReactElement {
  return (
    <StudioFormActions
      className={classes.cardActions}
      primary={{
        label: saveLabel,
        onClick: onSave,
        disabled: isDisabled,
      }}
      secondary={{
        label: cancelLabel,
        onClick: onCancel,
      }}
      iconOnly={false}
      isLoading={isLoading}
    />
  );
}
