import type { ListProps } from '@digdir/designsystemet-react';
import { List } from '@digdir/designsystemet-react';
import React, { forwardRef } from 'react';

export type StudioListRootProps = ListProps;

export const StudioListRoot = forwardRef<HTMLDivElement, StudioListRootProps>((props, ref) => {
  return <List.Root size='sm' {...props} ref={ref} />;
});

StudioListRoot.displayName = 'StudioList.Root';
