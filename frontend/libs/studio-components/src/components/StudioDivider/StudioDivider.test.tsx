import React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioDivider, type StudioDividerProps } from './StudioDivider';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

const mockDivider: string = 'Test Divider';

describe('StudioDivider', () => {
  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioDivider({ className }));
  });

  it('Appends custom attributes to the divider element', () => {
    testCustomAttributes(renderStudioDivider);
  });
});

const renderStudioDivider = (props: Partial<StudioDividerProps> = {}): RenderResult => {
  return render(<StudioDivider {...props}>{mockDivider}</StudioDivider>);
};
