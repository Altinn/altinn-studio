import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';

export type StudioListRootProps = HTMLAttributes<HTMLDivElement>;

export const StudioListRoot = forwardRef<HTMLDivElement, StudioListRootProps>((props, ref) => {
  return <div {...props} ref={ref} />;
});

StudioListRoot.displayName = 'StudioList.Root';
