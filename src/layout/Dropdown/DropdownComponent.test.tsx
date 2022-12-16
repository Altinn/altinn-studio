import React from 'react';

import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PreloadedState } from 'redux';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { mockComponentProps, renderWithProviders } from 'src/testUtils';
import type { IDropdownProps } from 'src/layout/Dropdown/DropdownComponent';
import type { RootState } from 'src/store';

const render = (props: Partial<IDropdownProps> = {}, customState: PreloadedState<RootState> = {}) => {
  const allProps: IDropdownProps = {
    ...mockComponentProps,
    optionsId: 'countries',
    readOnly: false,
    handleDataChange: jest.fn(),
    getTextResourceAsString: (value) => value,
    isValid: true,
    ...props,
  };

  const countries = {
    id: 'countries',
    options: [
      {
        label: 'Norway',
        value: 'norway',
      },
      {
        label: 'Sweden',
        value: 'sweden',
      },
      {
        label: 'Denmark',
        value: 'denmark',
      },
    ],
  };

  renderWithProviders(<DropdownComponent {...allProps} />, {
    preloadedState: {
      ...getInitialStateMock(),
      optionState: {
        options: {
          countries,
          loadingOptions: {
            id: 'loadingOptions',
            options: undefined,
            loading: true,
          },
        },
        error: {
          name: '',
          message: '',
        },
      },
    },
    ...customState,
  });
};

describe('DropdownComponent', () => {
  jest.useFakeTimers();
  const user = userEvent.setup({
    advanceTimers: (time) => {
      act(() => {
        jest.advanceTimersByTime(time);
      });
    },
  });

  it('should trigger handleDataChange when option is selected', async () => {
    const handleDataChange = jest.fn();
    render({
      handleDataChange,
    });

    await act(() => user.selectOptions(screen.getByRole('combobox'), [screen.getByText('Sweden')]));

    expect(handleDataChange).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    expect(handleDataChange).toHaveBeenCalledWith('sweden');
  });

  it('should show as disabled when readOnly is true', () => {
    render({
      readOnly: true,
    });

    const select = screen.getByRole('combobox');

    expect(select).toHaveProperty('disabled', true);
  });

  it('should not show as disabled when readOnly is false', () => {
    render({
      readOnly: false,
    });

    const select = screen.getByRole('combobox');

    expect(select).toHaveProperty('disabled', false);
  });

  it('should trigger handleDataChange when preselectedOptionIndex is set', () => {
    const handleDataChange = jest.fn();
    render({
      preselectedOptionIndex: 2,
      handleDataChange,
    });

    expect(handleDataChange).toHaveBeenCalledWith('denmark');
    expect(handleDataChange).toHaveBeenCalledTimes(1);
  });

  it('should trigger handleDataChange instantly on blur', async () => {
    const handleDataChange = jest.fn();
    render({
      preselectedOptionIndex: 2,
      handleDataChange,
    });

    expect(handleDataChange).toHaveBeenCalledWith('denmark');
    const select = screen.getByRole('combobox');

    await act(() => user.click(select));

    expect(handleDataChange).toHaveBeenCalledTimes(1);

    await act(() => fireEvent.blur(select));

    expect(handleDataChange).toHaveBeenCalledWith('denmark');
    expect(handleDataChange).toHaveBeenCalledTimes(2);
  });

  it('should show spinner while waiting for options', () => {
    render({
      optionsId: 'loadingOptions',
    });

    expect(screen.queryByTestId('altinn-spinner')).toBeInTheDocument();
  });

  it('should not show spinner when options are present', () => {
    render({
      optionsId: 'countries',
    });

    expect(screen.queryByTestId('altinn-spinner')).not.toBeInTheDocument();
  });

  it('should present replaced label if setup with values from repeating group in redux and trigger handleDataChanged with replaced values', async () => {
    const handleDataChange = jest.fn();
    render({
      handleDataChange,
      source: {
        group: 'someGroup',
        label: 'option.from.rep.group.label',
        value: 'someGroup[{0}].valueField',
      },
    });

    await act(() =>
      user.selectOptions(screen.getByRole('combobox'), [
        screen.getByText('The value from the group is: Label for first'),
      ]),
    );

    expect(handleDataChange).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    expect(handleDataChange).toHaveBeenCalledWith('Value for first');

    await act(() =>
      user.selectOptions(screen.getByRole('combobox'), [
        screen.getByText('The value from the group is: Label for second'),
      ]),
    );

    expect(handleDataChange).toHaveBeenCalledTimes(1);

    jest.runOnlyPendingTimers();

    expect(handleDataChange).toHaveBeenCalledWith('Value for second');
    expect(handleDataChange).toHaveBeenCalledTimes(2);
  });
});
