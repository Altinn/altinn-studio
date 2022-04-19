import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, fireEvent } from '@testing-library/react';
import type { PreloadedState } from '@reduxjs/toolkit';

import { renderWithProviders } from '../../../testUtils';

import DropdownComponent from './DropdownComponent';
import type { IComponentProps } from 'src/components';
import type { IDropdownProps } from './DropdownComponent';
import { getInitialStateMock } from '../../../__mocks__/initialStateMock';
import type { RootState } from 'src/store';

const render = (
  props: Partial<IDropdownProps> = {},
  customState: PreloadedState<RootState> = {},
  ) => {
  const allProps: IDropdownProps = {
    id: 'component-id',
    optionsId: 'countries',
    formData: {},
    preselectedOptionIndex: 1,
    handleDataChange: jest.fn(),
    getTextResourceAsString: (value) => value,
    readOnly: false,
    isValid: true,
    ...({} as IComponentProps),
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
    ]
  }

  renderWithProviders(<DropdownComponent {...allProps} />, {
    preloadedState: {
      ...getInitialStateMock(),
      optionState: {
        options: {
          countries,
          loadingOptions: {
            id: 'loadingOptions',
            options: undefined,
            loading: true
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

describe('components/base/DropdownComponent', () => {
  it('should trigger handleDataChange when option is selected', () => {
    const handleDataChange = jest.fn();
    render({
      handleDataChange,
    });

    userEvent.selectOptions(screen.getByRole('combobox'), [
      screen.getByText('Sweden'),
    ]);

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

  it('should trigger handleDataChange on blur', () => {
    const handleDataChange = jest.fn();
    render({
      preselectedOptionIndex: 2,
      handleDataChange,
    });

    expect(handleDataChange).toHaveBeenCalledWith('denmark');
    const select = screen.getByRole('combobox');

    userEvent.click(select);
    fireEvent.blur(select);

    expect(handleDataChange).toHaveBeenCalledWith('denmark');
    expect(handleDataChange).toHaveBeenCalledTimes(2);
  });

  it('should show spinner while waiting for options', () => {
    render({
      optionsId: 'loadingOptions'
    });

    expect(screen.queryByTestId('altinn-spinner')).toBeInTheDocument();
  });

  it('should not show spinner when options are present', () => {
    render({
      optionsId: 'countries'
    });

    expect(screen.queryByTestId('altinn-spinner')).not.toBeInTheDocument();
  });

  it('should present replaced label if setup with values from repeating group in redux and trigger handleDataChanged with replaced values', () => {
    const handleDataChange = jest.fn();
    render({
      handleDataChange,
      source: {
        group: "someGroup",
        label: "option.from.rep.group.label",
        value: "someGroup[{0}].valueField"
      },
    });

    userEvent.selectOptions(screen.getByRole('combobox'), [
      screen.getByText('The value from the group is: Label for first'),
    ]);

    expect(handleDataChange).toHaveBeenCalledWith('Value for first');

    userEvent.selectOptions(screen.getByRole('combobox'), [
      screen.getByText('The value from the group is: Label for second'),
    ]);

    expect(handleDataChange).toHaveBeenCalledWith('Value for second');
  });
});
