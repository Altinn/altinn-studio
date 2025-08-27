import { StudioButton } from '../StudioButton';
import type { StudioButtonProps } from '../StudioButton';
import type { OverridableComponent } from '../../types/OverridableComponent';
import React, { forwardRef } from 'react';
import { TrashIcon } from '../../../../studio-icons';
import type { MouseEvent } from 'react';

export interface StudioDeleteButtonProps extends StudioButtonProps {
  onDelete: () => void;
  confirmMessage?: string;
}

/**
 * @deprecated use `StudioDeleteButton` from `@studio/components` instead.
 */
const StudioDeleteButton: OverridableComponent<StudioDeleteButtonProps, HTMLButtonElement> =
  forwardRef<HTMLButtonElement, StudioDeleteButtonProps>(
    ({ confirmMessage, onClick, onDelete, variant = 'secondary', ...rest }, ref) => {
      const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!confirmMessage || confirm(confirmMessage)) onDelete();
      };

      return (
        <StudioButton
          color='danger'
          icon={<TrashIcon />}
          onClick={handleClick}
          variant={variant}
          {...rest}
          ref={ref}
        />
      );
    },
  );

StudioDeleteButton.displayName = 'StudioDeleteButton';

export { StudioDeleteButton };
