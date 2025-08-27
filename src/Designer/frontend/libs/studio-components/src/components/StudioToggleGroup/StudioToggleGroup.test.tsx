import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioToggleGroup } from './index';
import type { StudioToggleGroupProps } from './index';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

const mockItemText: string = 'Hello';

describe('StudioToggleGroup', () => {
  it('renders children correctly', () => {
    renderStudioToggleGroup({});
    expect(screen.getByText(mockItemText)).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioToggleGroup({ className }));
  });
});

const renderStudioToggleGroup = (props: StudioToggleGroupProps): RenderResult => {
  return render(
    <StudioToggleGroup {...props}>
      <StudioToggleGroup.Item>{mockItemText}</StudioToggleGroup.Item>
    </StudioToggleGroup>,
  );
};
