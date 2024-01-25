import { StudioButton } from '../StudioButton';
import type { StudioButtonProps } from '../StudioButton';
import type { OverridableComponent } from '../../types/OverridableComponent';
import { forwardRef } from 'react';
import { TrashIcon } from '@studio/icons';
import type { MouseEvent } from 'react';
import React from 'react';

export interface StudioDeleteButtonProps extends StudioButtonProps {
  onDelete: () => void;
  confirmMessage: string;
}

const StudioDeleteButton: OverridableComponent<StudioDeleteButtonProps, HTMLButtonElement> =
  forwardRef<HTMLButtonElement, StudioDeleteButtonProps>(
    ({ confirmMessage, onClick, onDelete, ...rest }, ref) => {
      const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (confirm(confirmMessage)) onDelete();
      };

      return (
        <StudioButton
          color='danger'
          icon={<TrashIcon />}
          onClick={handleClick}
          variant='secondary'
          {...rest}
          ref={ref}
        />
      );
    },
  );

StudioDeleteButton.displayName = 'StudioDeleteButton';

export { StudioDeleteButton };
