import React from 'react';
import { screen, render } from '@testing-library/react';
import {
  StudioPageImageBackgroundContainer,
  type StudioPageImageBackgroundContainerProps,
} from './StudioPageImageBackgroundContainer';
import type { RenderResult } from '@testing-library/react';

const testImage = 'test-image-url';
const testChildren = <div>Test Child</div>;

describe('StudioPageImageBackgroundContainer', () => {
  it('should render children', () => {
    renderStudioPageImageBackgroundContainer();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should apply the background image correctly', () => {
    renderStudioPageImageBackgroundContainer();
    const childElement = screen.getByText('Test Child');
    // eslint-disable-next-line testing-library/no-node-access
    const backgroundDiv = childElement.closest('[style*="background-image"]');
    expect(backgroundDiv).toHaveStyle(`background-image: url(${testImage})`);
  });
});

const defaultProps: StudioPageImageBackgroundContainerProps = {
  image: testImage,
  children: testChildren,
};

const renderStudioPageImageBackgroundContainer = (
  props?: Partial<StudioPageImageBackgroundContainerProps>,
): RenderResult => {
  return render(<StudioPageImageBackgroundContainer {...defaultProps} {...props} />);
};
