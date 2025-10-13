import React, { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Dropdown } from '@digdir/designsystemet-react';
import type { DropdownProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import { StudioDropdownContextProvider } from './context/StudioDropdownContext';
import type { IconPlacement } from '../../types/IconPlacement';
import { TextWithIcon } from '../TextWithIcon';
import type { StudioButtonProps } from '../StudioButton';

export type StudioDropdownProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
  triggerButtonText?: string;
  triggerButtonVariant?: StudioButtonProps['variant'];
  triggerButtonClassName?: string;
} & Omit<WithoutAsChild<DropdownProps>, 'anchorEl' | 'open' | 'onClose'>;

export function StudioDropdown({
  icon,
  iconPlacement = 'left',
  triggerButtonText,
  triggerButtonVariant,
  triggerButtonClassName,
  children,
  ...rest
}: StudioDropdownProps): ReactElement {
  const [open, setOpen] = useState<boolean>(false);

  const handleClick = (): void => {
    setOpen((oldValue: boolean) => !oldValue);
  };

  return (
    <Dropdown.TriggerContext>
      <Dropdown.Trigger
        variant={triggerButtonVariant}
        onClick={handleClick}
        icon={!triggerButtonText}
        aria-expanded={open}
        className={triggerButtonClassName}
      >
        <TextWithIcon icon={icon} iconPlacement={iconPlacement}>
          {triggerButtonText}
        </TextWithIcon>
      </Dropdown.Trigger>
      <Dropdown onClose={() => setOpen(false)} open={open} {...rest}>
        <StudioDropdownContextProvider setOpen={setOpen}>{children}</StudioDropdownContextProvider>
      </Dropdown>
    </Dropdown.TriggerContext>
  );
}
