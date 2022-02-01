import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '../../../testUtils';

import DropdownComponent from './DropdownComponent';
import type { IComponentProps } from 'src/components';
import type { IDropdownProps } from './DropdownComponent';

const render = (props: Partial<IDropdownProps> = {}) => {
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

  const countries = [
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
  ];

  renderWithProviders(<DropdownComponent {...allProps} />, {
    preloadedState: {
      optionState: {
        options: {
          countries,
        },
        error: {
          name: '',
          message: '',
        },
      },
    },
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
});
