import React, { type ForwardedRef } from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { StudioAlertProps } from './StudioAlert';
import { StudioAlert } from './StudioAlert';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioAlert', () => {
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
  props: Partial<StudioAlertProps> = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult => {
  return render(<StudioAlert {...props} ref={ref} />);
};
