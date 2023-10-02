// This test file is used to test that all icons in the altinn-icons module
import { render, screen } from '@testing-library/react';
import * as AltinnIcons from './index';
import React from 'react';

// Get all icon names from the AltinnIcons module
const altinnIcons = Object.keys(AltinnIcons);

it.each(altinnIcons)('should render %s icon with fill currentColor', (iconName) => {
  const IconComponent = AltinnIcons[iconName];
  render(<IconComponent title={iconName} />);

  const iconElement = screen.getByRole('img');

  expect(iconElement).toHaveAttribute('fill', 'currentColor');
});
