import type { ComponentProps, MouseEvent } from 'react';
import React, { forwardRef, useCallback } from 'react';
import { StudioButton } from '@studio/components';
import type { LinkProps } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

export type ButtonRouterLinkProps = ComponentProps<typeof StudioButton> & Pick<LinkProps, 'to'>;

export const ButtonRouterLink = forwardRef<HTMLButtonElement, ButtonRouterLinkProps>(
  ({ to, onClick, ...rest }, ref) => {
    const navigate = useNavigate();

    const handleClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        navigate(to);
        onClick?.(event);
      },
      [navigate, to, onClick],
    );

    return <StudioButton onClick={handleClick} {...rest} ref={ref} />;
  },
);

ButtonRouterLink.displayName = 'ButtonRouterLink';
