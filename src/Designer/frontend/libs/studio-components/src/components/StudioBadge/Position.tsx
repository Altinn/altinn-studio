import React, { forwardRef } from 'react';
import type { BadgePositionProps } from '@digdir/designsystemet-react';
import { Badge } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type PositionProps = WithoutAsChild<BadgePositionProps>;

export const Position = forwardRef<HTMLDivElement, BadgePositionProps>((props, ref) => {
  return <Badge.Position {...props} ref={ref} />;
});

Position.displayName = 'StudioBadge.Position';
