import { useState } from 'react';
import type { PropsWithChildren, Ref } from 'react';

import { Popover } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from './HelpText.module.css';
import { HelpTextIcon } from './HelpTextIcon';

export interface HelpTextProps extends PropsWithChildren {
  id?: string;
  title?: string;
  titlePrefix?: string;
  placement?: 'right' | 'bottom' | 'left' | 'top';
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function HelpText({
  id,
  title,
  titlePrefix,
  placement = 'right',
  className,
  children,
  ref,
}: HelpTextProps) {
  const [open, setOpen] = useState(false);

  const ariaLabel = title ? [titlePrefix, title].filter(Boolean).join(' ') : undefined;

  return (
    <Popover.TriggerContext>
      <Popover.Trigger asChild ref={ref} aria-label={ariaLabel} id={id}>
        <button
          className={cn(classes.helpTextButton, classes.helpTextFocus, className)}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <HelpTextIcon
            filled
            className={cn(classes.helpTextIcon, classes.helpTextIconFilled)}
            openState={open}
          />
          <HelpTextIcon className={cn(classes.helpTextIcon)} openState={open} />
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
}
