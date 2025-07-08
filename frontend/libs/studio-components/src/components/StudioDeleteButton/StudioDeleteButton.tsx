import { StudioButton } from '../StudioButton';
import type { StudioButtonProps } from '../StudioButton';
import React, { forwardRef } from 'react';
import { TrashIcon } from '@studio/icons';
import type { MouseEvent, ReactElement, Ref } from 'react';

export interface StudioDeleteButtonProps extends StudioButtonProps {
  onDelete: () => void;
  confirmMessage?: string;
}

function StudioDeleteButton(
  { confirmMessage, onClick, onDelete, variant = 'secondary', ...rest }: StudioDeleteButtonProps,
  ref: Ref<HTMLButtonElement>,
): ReactElement {
  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
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
}

const ForwardedStudioDeleteButton = forwardRef(StudioDeleteButton);

export { ForwardedStudioDeleteButton as StudioDeleteButton };
