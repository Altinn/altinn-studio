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
    testRefForwarding<HTMLDivElement>((ref) => renderTestAlert({}, ref));
  });

  it('should append classname to root', () => {
    testRootClassNameAppending((className) => renderTestAlert({ className }));
  });

  it('should allow custom attributes', () => {
    testCustomAttributes((customAttributes) => renderTestAlert({ ...customAttributes }));
  });
});

const renderTestAlert = (
  props: Partial<StudioBadgeProps> = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult => {
  return render(<StudioBadge {...props} ref={ref} />);
};
