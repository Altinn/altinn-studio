import React from 'react';
import { screen, render } from '@testing-library/react';
import {
  StudioPageImageBackgroundContainer,
  type StudioPageImageBackgroundContainerProps,
} from './index';
import type { RenderResult } from '@testing-library/react';

const customImage1 = 'https://example.com/custom-image1.jpg';
const customImage2 = 'https://example.com/custom-image2.jpg';
const testChildren = <div>Test Child</div>;

describe('StudioPageImageBackgroundContainer', () => {
  it('should render children', () => {
    renderStudioPageImageBackgroundContainer();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should apply the background image correctly', () => {
    renderStudioPageImageBackgroundContainer();
    const childElement = screen.getByText('Test Child');
    const backgroundDiv = getBackgroundElement(childElement);
    expect(backgroundDiv).toHaveStyle(`background-image: url(${customImage1})`);
  });

  it('should apply custom className', () => {
    const customClass = 'my-custom-class';
    const { container } = renderStudioPageImageBackgroundContainer({ className: customClass });
    const wrapperDiv = getWrapperElement(container);
    expect(wrapperDiv).toHaveClass('wrapper');
    expect(wrapperDiv).toHaveClass(customClass);
  });

  it('should handle different image URLs', () => {
    renderStudioPageImageBackgroundContainer({ image: customImage2 });

    const childElement = screen.getByText('Test Child');
    const backgroundDiv = getBackgroundElement(childElement);
    expect(backgroundDiv).toHaveStyle(`background-image: url(${customImage2})`);
  });
});

const getWrapperElement = (container: HTMLElement): HTMLElement => {
  // eslint-disable-next-line testing-library/no-node-access
  return container.querySelector('.wrapper') as HTMLElement;
};

const getBackgroundElement = (childElement: HTMLElement): HTMLElement => {
  // eslint-disable-next-line testing-library/no-node-access
  return childElement.closest('[style*="background-image"]') as HTMLElement;
};

const defaultProps: StudioPageImageBackgroundContainerProps = {
  image: customImage1,
  children: testChildren,
};

const renderStudioPageImageBackgroundContainer = (
  props?: Partial<StudioPageImageBackgroundContainerProps>,
): RenderResult => {
  return render(<StudioPageImageBackgroundContainer {...defaultProps} {...props} />);
};
