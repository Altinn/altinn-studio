import React from 'react';
import { render, type RenderResult, screen } from '@testing-library/react';
import { StudioConfigCard, type StudioConfigCardProps } from './StudioConfigCard';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

describe('StudioConfigCard', () => {
  it('should render the component', () => {
    renderStudioConfigCard();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    testRootClassNameAppending((className) => renderStudioConfigCard({ className }));
  });
});

const renderStudioConfigCard = (props: Partial<StudioConfigCardProps> = {}): RenderResult => {
  const defaultProps: StudioConfigCardProps = {
    children: <div>Test Content</div>,
  };
  return render(<StudioConfigCard {...defaultProps} {...props} />);
};
