import { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Skeleton, type SkeletonProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioSkeletonProps = WithoutAsChild<SkeletonProps>;

function StudioSkeleton(
  { children, ...rest }: StudioSkeletonProps,
  ref: Ref<HTMLSpanElement>,
): ReactElement {
  return (
    <Skeleton ref={ref} {...rest}>
      {children}
    </Skeleton>
  );
}

const ForwardedStudioSkeleton = forwardRef(StudioSkeleton);
ForwardedStudioSkeleton.displayName = 'StudioSkeleton';

export { ForwardedStudioSkeleton as StudioSkeleton };
