import React, { forwardRef, useState } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { Popover } from '@digdir/designsystemet-react';
import cl from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import type { PopoverProps } from '@digdir/designsystemet-react';

import classes from 'src/app-components/HelpText/Helptext.module.css';
import { HelpTextIcon } from 'src/app-components/HelpText/HelpTextIcon';

export type HelpTextProps = {
  id?: string;
  title?: string;
  size?: PopoverProps['data-size'];
  placement?: 'right' | 'bottom' | 'left' | 'top';
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function getSize(size: string) {
  switch (size) {
    case 'xxxsmall':
      return '3xs';
    case 'xxsmall':
      return '2xs';
    case 'xsmall':
      return 'xs';
    case 'small':
      return 'sm';
    case 'medium':
      return 'md';
    case 'large':
      return 'lg';
    case 'xlarge':
      return 'xl';
    case 'xxlarge':
      return '2xl';
    case 'xxxlarge':
      return '3xl';
    case 'xxxxlarge':
      return '4xl';
    default:
      return size;
  }
}

export const HelpText = forwardRef<HTMLButtonElement, HelpTextProps>(function HelpText(
  { id, title, placement = 'right', className, children, ...rest },
  ref,
) {
  const uuid = uuidv4();
  const [open, setOpen] = useState(false);

  const size = getSize(rest.size || 'md') as PopoverProps['data-size'];

  const helpTextSize = size ? classes[`helpText-${size}`] : '';
  return (
    <Popover.TriggerContext>
      <Popover.Trigger
        asChild
        ref={ref}
        aria-label={title}
        id={id ?? uuid}
      >
        <button
          className={cl(helpTextSize, classes.helpTextButton, classes.helpTextFocus, className)}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <HelpTextIcon
            filled
            className={cl(classes['helpText-icon'], classes['helpText-iconFilled'])}
            openState={open}
          />
          <HelpTextIcon
            className={cl(classes['helpText-icon'])}
            openState={open}
          />
        </button>
      </Popover.Trigger>
      <Popover
        data-testid='helptext'
        className={classes.helpTextContent}
        data-color='info'
        placement={placement}
        data-size={size}
        open={open}
        onClose={() => setOpen(false)}
      >
        {children}
      </Popover>
    </Popover.TriggerContext>
  );
});
