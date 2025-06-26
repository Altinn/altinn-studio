import React from 'react';
import type { ReactElement } from 'react';
import { ToggleGroup } from '@digdir/designsystemet-react';
import type { ToggleGroupProps, ToggleGroupItemProps } from '@digdir/designsystemet-react';

export type StudioToggleGroupProps = ToggleGroupProps;
export type StudioToggleGroupItemProps = ToggleGroupItemProps;

export function StudioToggleGroup({
  children,
  ...rest
}: StudioToggleGroupProps): ReactElement<StudioToggleGroupProps> {
  return <ToggleGroup {...rest}>{children}</ToggleGroup>;
}

export function StudioToggleGroupItem({
  children,
  ...rest
}: StudioToggleGroupItemProps): ReactElement<StudioToggleGroupItemProps> {
  return <ToggleGroup.Item {...rest}>{children}</ToggleGroup.Item>;
}
