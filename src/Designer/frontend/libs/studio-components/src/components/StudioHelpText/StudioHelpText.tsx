import type { ButtonHTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './StudioHelpText.module.css';
import { Popover } from '@digdir/designsystemet-react';

export type StudioHelpTextProps = {
  /**
   * Required descriptive label for screen readers.
   **/
  'aria-label': string;
  /**
   * Placement of the Popover.
   * @default 'right'
   */
  placement?: 'right' | 'bottom' | 'left' | 'top';
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>;

export const StudioHelpText = forwardRef<HTMLButtonElement, StudioHelpTextProps>(function HelpText(
  { placement = 'right', children, className, ...rest },
  ref,
) {
  return (
    <Popover.TriggerContext>
      <Popover.Trigger
        className={cn(classes.helpText, className)}
        ref={ref}
        variant='tertiary'
        data-color='info'
        {...rest}
      />
      <Popover placement={placement} data-color='info' variant='tinted'>
        {children}
      </Popover>
    </Popover.TriggerContext>
  );
});
