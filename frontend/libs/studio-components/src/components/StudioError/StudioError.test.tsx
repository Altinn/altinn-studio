import React from 'react';
import type { Ref } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioError } from './StudioError';
import type { StudioErrorProps } from './StudioError';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

const message: string = 'message';

describe('StudioError', () => {
  it('Should render component correctly', () => {
    renderStudioError();

    const paragraph = screen.getByText(message);
    expect(paragraph).toBeInTheDocument();
  });

  it('should support forwarding the ref', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderStudioError({}, ref));
  });

  it('should append classname to root', () => {
    testRootClassNameAppending((className) => renderStudioError({ className }));
  });

  it('should allow custom attributes', () => {
    testCustomAttributes((customAttributes) => renderStudioError({ ...customAttributes }));
  });
});

function renderStudioError(
  props: Partial<StudioErrorProps> = {},
  ref?: Ref<HTMLDivElement>,
): RenderResult {
  return render(
    <StudioError {...props} ref={ref}>
      {message}
    </StudioError>,
  );
}
