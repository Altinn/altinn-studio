import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import type { SelectActionProps } from './SelectAction';
import { SelectAction } from './SelectAction';

describe('SelectAction', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should show combobox with all predefined actions as options', async () => {
    const user = userEvent.setup();
    renderSelectAction();
    const combobox = screen.getByRole(`combobox`);
    await user.click(combobox);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    mockAvailablePredefinedActions.forEach((action) =>
      expect(screen.getByRole('option', { name: action })).toBeInTheDocument(),
    );
  });

  it('should call onSetCurrentActionName when writing a custom action and bluring combobox', async () => {
    const user = userEvent.setup();
    const myCustomActionName = 'MyCustomAction';
    const onSetCurrentActionNameMock = jest.fn();
    renderSelectAction({ onSetCurrentActionName: onSetCurrentActionNameMock });
    const combobox = screen.getByTitle(`combobox_${mockActionNameWrite}`);
    await user.click(combobox);
    await user.clear(combobox);
    await user.type(combobox, myCustomActionName);
    await user.tab();
    expect(onSetCurrentActionNameMock).toHaveBeenCalledTimes(1);
    expect(onSetCurrentActionNameMock).toHaveBeenCalledWith(myCustomActionName);
  });

  it('should change displayValue when selecting an option', async () => {
    const user = userEvent.setup();
    const rejectActionName = 'reject';
    const onSetCurrentActionNameMock = jest.fn();
    renderSelectAction({ onSetCurrentActionName: onSetCurrentActionNameMock });
    const combobox = screen.getByTitle(`combobox_${mockActionNameWrite}`);
    expect(combobox).toHaveDisplayValue(mockActionNameWrite);
    await user.click(combobox);
    const rejectOption = screen.getByRole('option', { name: rejectActionName });
    await user.click(rejectOption);
    await waitFor(() => expect(combobox).toHaveDisplayValue(rejectActionName));
  });
});

const mockActionNameWrite = 'write';
const mockAvailablePredefinedActions = ['reject', 'confirm'];
const defaultSelectActionProps: SelectActionProps = {
  actionName: mockActionNameWrite,
  availablePredefinedActions: mockAvailablePredefinedActions,
  comboboxLabel: '',
  currentActionName: mockActionNameWrite,
  onSetCurrentActionName: jest.fn(),
};

const renderSelectAction = (selectActionProps?: Partial<SelectActionProps>) => {
  return render(<SelectAction {...defaultSelectActionProps} {...selectActionProps} />);
};
