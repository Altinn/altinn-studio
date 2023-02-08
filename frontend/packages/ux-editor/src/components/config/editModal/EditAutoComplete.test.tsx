import React from 'react';
import { EditAutoComplete, getAutocompleteOptions } from './EditAutoComplete';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormComponentType } from '../../../types/global';

test('should give options', () => {
  const options = getAutocompleteOptions('nam');
  expect(options).toHaveLength(6);
});

test('should give no options when hitting exact match', () => {
  const options = getAutocompleteOptions('name');
  expect(options).toHaveLength(0);
});

test('should give no options when hitting nothing', () => {
  const options = getAutocompleteOptions('dsafasdf');
  expect(options).toHaveLength(0);
});

test('that is renders', async () => {
  window.ResizeObserver =
    window.ResizeObserver ||
    jest.fn().mockImplementation(() => ({
      disconnect: jest.fn(),
      observe: jest.fn(),
      unobserve: jest.fn(),
    }));
  const handleComponentChange = jest.fn();
  const component = {} as FormComponentType;
  userEvent.setup();
  render(<EditAutoComplete handleComponentChange={handleComponentChange} component={component} />);
  const textbox = screen.getByRole('textbox');
  expect(textbox).toBeInTheDocument();
  await userEvent.type(textbox, 'hello');
  await userEvent.tab();
  expect(textbox).toHaveValue('hello');
  expect(handleComponentChange).toHaveBeenCalled();
});
