import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { StudioCombobox, type StudioComboboxProps } from './index';
import userEvent from '@testing-library/user-event';

describe('StudioCombobox', () => {
  it('should render the component', async () => {
    renderTestCombobox();
    const studioCombobox = screen.getByRole('combobox');
    expect(studioCombobox).toBeInTheDocument();
  });

  it('should render the empty state', async () => {
    const user = userEvent.setup();
    renderTestCombobox();
    const studioCombobox = screen.getByRole('combobox');
    await user.type(studioCombobox, 'Kinkliane Koff');
    const emptyState = screen.getByText('No results');
    expect(emptyState).toBeInTheDocument();
  });

  it('should be possible to select an option', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    renderTestCombobox({ onValueChange });
    const studioCombobox = screen.getByRole('combobox');

    await user.click(studioCombobox);
    await user.click(screen.getByRole('option', { name: 'Ole' }));
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1));
    expect(onValueChange).toHaveBeenCalledWith(['Ole']);

    await user.click(studioCombobox);
    await user.click(screen.getByRole('option', { name: 'Dole' }));
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2));
    expect(onValueChange).toHaveBeenCalledWith(['Dole']);
  });

  it('should be possible to select multiple options', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    renderTestCombobox({ multiple: true, onValueChange });
    const studioCombobox = screen.getByRole('combobox');
    await user.click(studioCombobox);

    await user.click(screen.getByRole('option', { name: 'Ole' }));
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1));
    expect(onValueChange).toHaveBeenCalledWith(['Ole']);

    await user.click(screen.getByRole('option', { name: 'Dole' }));
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(2));
    expect(onValueChange).toHaveBeenCalledWith(['Ole', 'Dole']);

    await user.click(screen.getByRole('option', { name: 'Doffen' }));
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(3));
    expect(onValueChange).toHaveBeenCalledWith(['Ole', 'Dole', 'Doffen']);
  });
});

const renderTestCombobox = (props?: StudioComboboxProps) => {
  render(
    <StudioCombobox {...props}>
      <StudioCombobox.Empty>No results</StudioCombobox.Empty>
      <StudioCombobox.Option value='Ole'>Ole</StudioCombobox.Option>
      <StudioCombobox.Option value='Dole'>Dole</StudioCombobox.Option>
      <StudioCombobox.Option value='Doffen'>Doffen</StudioCombobox.Option>
    </StudioCombobox>,
  );
};
