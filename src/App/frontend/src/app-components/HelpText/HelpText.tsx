import React, { forwardRef, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { Popover } from '@digdir/designsystemet-react';
import cl from 'clsx';

import classes from 'src/app-components/HelpText/Helptext.module.css';
import { HelpTextIcon } from 'src/app-components/HelpText/HelpTextIcon';

export interface HelpTextProps extends PropsWithChildren {
  id?: string;
  title?: string;
  placement?: 'right' | 'bottom' | 'left' | 'top';
  className?: string;
}

export const HelpText = forwardRef<HTMLButtonElement, HelpTextProps>(function HelpText(
  { id, title, placement = 'right', className, children },
  ref,
) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.TriggerContext>
      <Popover.Trigger
        asChild
        ref={ref}
        aria-label={title}
        id={id}
      >
        <button
          className={cl(classes.helpTextButton, classes.helpTextFocus, className)}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <HelpTextIcon
            filled
            className={cl(classes.helpTextIcon, classes.helpTextIconFilled)}
            openState={open}
          />
          <HelpTextIcon
            className={cl(classes.helpTextIcon)}
            openState={open}
          />
        </button>
      </Popover.Trigger>
      <Popover
        data-testid='helptext'
        className={classes.helpTextContent}
        data-color='info'
        placement={placement}
        data-size='md'
        open={open}
        onClose={() => setOpen(false)}
      >
        {children}
      </Popover>
    </Popover.TriggerContext>
  );
});
