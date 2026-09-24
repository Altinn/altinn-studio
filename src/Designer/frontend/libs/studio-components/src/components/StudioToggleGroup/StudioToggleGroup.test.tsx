import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioToggleGroup } from './';
import type { StudioToggleGroupProps } from './';
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

type RenderProps = Omit<
  StudioToggleGroupProps,
  'aria-label' | 'aria-labelledby' | 'data-toggle-group'
>;

const renderStudioToggleGroup = (props: RenderProps): RenderResult => {
  return render(
    <StudioToggleGroup aria-label='Name' {...props}>
      <StudioToggleGroup.Item>{mockItemText}</StudioToggleGroup.Item>
    </StudioToggleGroup>,
  );
};
