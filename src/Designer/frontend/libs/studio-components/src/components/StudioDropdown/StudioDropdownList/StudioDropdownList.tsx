import React from 'react';
import type { ReactElement } from 'react';
import { DropdownList } from '@digdir/designsystemet-react';
import type { DropdownListProps } from '@digdir/designsystemet-react';

export type StudioDropdownListProps = DropdownListProps;

export function StudioDropdownList({ ...rest }: StudioDropdownListProps): ReactElement {
  return <DropdownList {...rest} />;
}

StudioDropdownList.displayName = 'StudioDropdown.List';
