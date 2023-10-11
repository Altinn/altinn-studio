// This test file is used to test that all icons in the altinn-icons module
import { render, screen } from '@testing-library/react';
import * as AltinnIcons from './index';
import React from 'react';

// Get all icon names from the AltinnIcons module
const altinnIcons = Object.keys(AltinnIcons);

describe('AltinnIcons', () => {
  it.each(altinnIcons)('should render %s icon with correct attributes', (iconName) => {
    const IconComponent = AltinnIcons[iconName];
    render(<IconComponent role='img' title='icon-title' />);

    const iconElement = screen.getByRole('img');

    expect(iconElement).toHaveAttribute('width', '24');
    expect(iconElement).toHaveAttribute('height', '24');
    expect(iconElement).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it.each(altinnIcons)('should render %s icon with title-tag', (iconName) => {
    const IconComponent = AltinnIcons[iconName];
    render(<IconComponent title='icon-title' />);
    expect(screen.getByTitle('icon-title')).toBeInTheDocument();
  });

  it.each(altinnIcons)('should be possible to pass SVGElements props to icon %s', (iconName) => {
    const IconComponent = AltinnIcons[iconName];
    render(<IconComponent role='img' className='demoClass' />);

    const iconElement = screen.getByRole('img');

    expect(iconElement).toHaveClass('demoClass');
  });
});
