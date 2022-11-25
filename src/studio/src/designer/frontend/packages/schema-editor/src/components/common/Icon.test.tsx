import React from 'react';
import { render } from '@testing-library/react';
import { Icon, IconImage } from './Icon';

test('Renders icon with correct class name', () =>
  Object.values(IconImage).forEach((iconImage) => {
    const { container } = render(<Icon image={iconImage} />);
    expect(container.querySelector(`.icon--${iconImage}`)).toBeDefined();
  }));
