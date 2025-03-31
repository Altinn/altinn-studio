import React from 'react';
import type { ReactElement } from 'react';
import { DropdownHeading } from '@digdir/designsystemet-react';
import type { DropdownHeadingProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../../types/WithoutAsChild';

export type StudioDropdownHeadingProps = WithoutAsChild<DropdownHeadingProps>;

export function StudioDropdownHeading({ ...rest }: StudioDropdownHeadingProps): ReactElement {
  return <DropdownHeading {...rest} />;
}

StudioDropdownHeading.displayName = 'StudioDropdown.Heading';
