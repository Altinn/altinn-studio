// This test file is used to test that all icons in the altinn-icons module
import { render, screen } from '@testing-library/react';
import * as AltinnIcons from './index';
import React from 'react';

// Get all icon names from the AltinnIcons module
const altinnIcons = Object.keys(AltinnIcons);

it.each(altinnIcons)('should render %s icon with correct attributes', (iconName) => {
  const IconComponent = AltinnIcons[iconName];
  render(<IconComponent role='img' title='icon-title' />);

  const iconElement = screen.getByRole('img');

  const iconTitle = screen.getByTitle('icon-title');

  expect(iconElement).toHaveAttribute('width', '24');
  expect(iconElement).toHaveAttribute('height', '24');
  expect(iconElement).toHaveAttribute('viewBox', '0 0 24 24');
  expect(iconTitle).toBeInTheDocument();
});

it.each(altinnIcons)('should be possible to pass SVGElements props', (iconName) => {
  const IconComponent = AltinnIcons[iconName];
  render(<IconComponent role='img' className='demoClass' />);

  const iconElement = screen.getByRole('img');

  expect(iconElement).toHaveClass('demoClass');
});
