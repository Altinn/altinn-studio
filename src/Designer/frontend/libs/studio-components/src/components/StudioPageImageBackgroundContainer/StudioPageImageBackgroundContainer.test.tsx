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
});

const defaultProps: StudioPageImageBackgroundContainerProps = {
  image: testImage,
  children: testChildren,
};

const renderStudioPageImageBackgroundContainer = (
  props?: Partial<StudioPageImageBackgroundContainerProps>,
): RenderResult => render(<StudioPageImageBackgroundContainer {...defaultProps} {...props} />);
