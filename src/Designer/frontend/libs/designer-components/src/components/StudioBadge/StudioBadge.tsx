import { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Badge } from '@digdir/designsystemet-react';
import type { BadgeProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioBadgeProps = WithoutAsChild<BadgeProps>;

function StudioBadge(
  { children, ...rest }: StudioBadgeProps,
  ref: Ref<HTMLSpanElement>,
): ReactElement {
  return (
    <Badge {...rest} ref={ref}>
      {children}
    </Badge>
  );
}

const ForwardedStudioBadge = forwardRef(StudioBadge);

export { ForwardedStudioBadge as StudioBadge };
