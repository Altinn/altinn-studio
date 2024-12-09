import { isCombobox } from './isCombobox';
import { render, screen } from '@testing-library/react';
import React from 'react';

describe('isCombobox', () => {
  it('Returns true when the element is a combobox', () => {
    render(<input type='text' role='combobox' />);
    const element: HTMLInputElement = screen.getByRole('combobox');
    expect(isCombobox(element)).toBe(true);
  });

  it('Returns false when the element is not a combobox', () => {
    render(<input type='text' />);
    const element: HTMLInputElement = screen.getByRole('textbox');
    expect(isCombobox(element)).toBe(false);
  });
});
