import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { StudioCombobox, type StudioComboboxProps } from './index';
import userEvent from '@testing-library/user-event';

const options = {
  ole: 'Ole',
  dole: 'Dole',
  doffen: 'Doffen',
  invalid: 'Kinkliane Koff',
};
const noResults = 'No results';

describe('StudioCombobox', () => {
  const verifyOnValueChange = async (
    onValueChange: jest.Mock,
    expectedCalls: number,
    expectedValue: string[],
  ) => {
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(expectedCalls));
    expect(onValueChange).toHaveBeenCalledWith(expectedValue);
  };

  it('should render the component', () => {
    renderTestCombobox();
    const studioCombobox = screen.getByRole('combobox');
    expect(studioCombobox).toBeInTheDocument();
  });

  it('should render the empty state when no results are found', async () => {
    const user = userEvent.setup();
    renderTestCombobox();
    const studioCombobox = screen.getByRole('combobox');
    await user.type(studioCombobox, options.invalid);
    const emptyState = screen.getByText(noResults);
    expect(emptyState).toBeInTheDocument();
  });

  it('should be possible to select an option', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    renderTestCombobox({ onValueChange });
    const studioCombobox = screen.getByRole('combobox');
    expect(studioCombobox).toHaveValue('');

    await user.click(studioCombobox);
    await user.click(screen.getByRole('option', { name: options.ole }));
    await verifyOnValueChange(onValueChange, 1, [options.ole]);
    expect(studioCombobox).toHaveValue(options.ole);

    const comboboxIsClosed = screen.queryByRole('option', { name: options.ole });
    expect(comboboxIsClosed).toBeNull();

    await user.click(studioCombobox);
    await user.click(screen.getByRole('option', { name: options.dole }));
    await verifyOnValueChange(onValueChange, 2, [options.dole]);
    expect(studioCombobox).toHaveValue(options.dole);
  });

  it('should be possible to select multiple options', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    renderTestCombobox({ multiple: true, onValueChange });
    const studioCombobox = screen.getByRole('combobox');
    await user.click(studioCombobox);

    await user.click(screen.getByRole('option', { name: options.ole }));
    await verifyOnValueChange(onValueChange, 1, [options.ole]);

    await user.click(screen.getByRole('option', { name: options.dole }));
    await verifyOnValueChange(onValueChange, 2, [options.ole, options.dole]);

    await user.click(screen.getByRole('option', { name: options.doffen }));
    await verifyOnValueChange(onValueChange, 3, [options.ole, options.dole, options.doffen]);
  });

  it('should be possible to clear the selected options', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    renderTestCombobox({
      multiple: true,
      onValueChange,
      value: [options.ole, options.dole, options.doffen],
    });

    const clearButton = screen.getByRole('button', { name: 'Fjern alt' });
    await user.click(clearButton);
    await verifyOnValueChange(onValueChange, 1, []);
  });
});

const renderTestCombobox = (props?: StudioComboboxProps) => {
  render(
    <StudioCombobox {...props}>
      <StudioCombobox.Empty>{noResults}</StudioCombobox.Empty>
      <StudioCombobox.Option value={options.ole}>{options.ole}</StudioCombobox.Option>
      <StudioCombobox.Option value={options.dole}>{options.dole}</StudioCombobox.Option>
      <StudioCombobox.Option value={options.doffen}>{options.doffen}</StudioCombobox.Option>
    </StudioCombobox>,
  );
};
