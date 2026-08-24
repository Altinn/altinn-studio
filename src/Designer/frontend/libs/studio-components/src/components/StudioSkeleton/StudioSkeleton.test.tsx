import type { ForwardedRef } from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioSkeleton, type StudioSkeletonProps } from './StudioSkeleton';
import { getRootElementFromContainer } from '../../test-utils/selectors';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

describe('StudioSkeleton', () => {
  it('Renders a rectangle by default', () => {
    const skeleton = renderAndGetSkeleton();
    expect(skeleton).toHaveAttribute('data-variant', 'rectangle');
  });

  it.each(['rectangle', 'circle', 'text'] as const)('Renders the %s variant', (variant) => {
    const skeleton = renderAndGetSkeleton({ variant });
    expect(skeleton).toHaveAttribute('data-variant', variant);
  });

  it('Applies the given width and height', () => {
    const skeleton = renderAndGetSkeleton({ width: 40, height: 20 });
    expect(skeleton).toHaveStyle({ width: '40px', height: '20px' });
  });

  it('Hides the skeleton from assistive technology', () => {
    const skeleton = renderAndGetSkeleton();
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioSkeleton({ className }));
  });

  it('Appends custom attributes to the span element', () => {
    testCustomAttributes<HTMLSpanElement, StudioSkeletonProps>(renderStudioSkeleton);
  });

  it('Supports forwarding the ref', () => {
    testRefForwarding<HTMLSpanElement>((ref) => renderStudioSkeleton({}, ref));
  });
});

const renderStudioSkeleton = (
  props: Partial<StudioSkeletonProps> = {},
  ref?: ForwardedRef<HTMLSpanElement>,
): RenderResult => render(<StudioSkeleton {...props} ref={ref} />);

const renderAndGetSkeleton = (props: Partial<StudioSkeletonProps> = {}): HTMLSpanElement =>
  getRootElementFromContainer<HTMLSpanElement>(renderStudioSkeleton(props).container);
