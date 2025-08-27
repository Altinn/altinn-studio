import React from 'react';
import type { ReactElement } from 'react';
import { DropdownItem } from '@digdir/designsystemet-react';
import type { DropdownItemProps } from '@digdir/designsystemet-react';

export type StudioDropdownItemProps = DropdownItemProps;

export function StudioDropdownItem({ ...rest }: StudioDropdownItemProps): ReactElement {
  return <DropdownItem {...rest} />;
}

StudioDropdownItem.displayName = 'StudioDropdown.Item';
