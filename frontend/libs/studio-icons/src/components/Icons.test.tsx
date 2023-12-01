// This test file is used to test that all icons in the studio-icons module
import { render, screen } from '@testing-library/react';
import * as StudioIcons from './index';
import React from 'react';

// Get all icon names from the StudioIcons module
const studioIcons = Object.keys(StudioIcons);

describe('StudioIcons', () => {
  it.each(studioIcons)('should render %s icon with correct attributes', (iconName) => {
    const IconComponent = StudioIcons[iconName];
    render(<IconComponent role='img' title='icon-title' />);

    const iconElement = screen.getByRole('img');

    expect(iconElement).toHaveAttribute('width', '1em');
    expect(iconElement).toHaveAttribute('height', '1em');
    expect(iconElement).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it.each(studioIcons)('should render %s icon with title-tag', (iconName) => {
    const IconComponent = StudioIcons[iconName];
    render(<IconComponent title='icon-title' />);
    expect(screen.getByTitle('icon-title')).toBeInTheDocument();
  });

  it.each(studioIcons)('should be possible to pass SVGElements props to icon %s', (iconName) => {
    const IconComponent = StudioIcons[iconName];
    render(<IconComponent role='img' className='demoClass' />);

    const iconElement = screen.getByRole('img');

    expect(iconElement).toHaveClass('demoClass');
  });
});
