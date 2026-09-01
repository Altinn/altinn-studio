import type { ForwardedRef } from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { StudioBadgeProps } from './StudioBadge';
import { StudioBadge } from './StudioBadge';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioBadge', () => {
  it('should support forwarding the ref', () => {
    testRefForwarding<HTMLSpanElement>((ref) => renderTestBadge({}, ref));
  });

  it('should append classname to root', () => {
    testRootClassNameAppending((className) => renderTestBadge({ className }));
  });

  it('should allow custom attributes', () => {
    testCustomAttributes<HTMLSpanElement, StudioBadgeProps>(renderTestBadge);
  });
});

const renderTestBadge = (
  props: Partial<StudioBadgeProps> = {},
  ref?: ForwardedRef<HTMLSpanElement>,
): RenderResult => {
  return render(<StudioBadge {...props} ref={ref} />);
};
