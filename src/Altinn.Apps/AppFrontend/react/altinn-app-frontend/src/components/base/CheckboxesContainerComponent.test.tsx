import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '../../../testUtils';

import { CheckboxContainerComponent } from './CheckboxesContainerComponent';
import type { IComponentProps } from 'src/components';
import type { ICheckboxContainerProps } from './CheckboxesContainerComponent';

const render = (props: Partial<ICheckboxContainerProps> = {}) => {
  const allProps: ICheckboxContainerProps = {
    options: [],
    optionsId: 'countries',
    preselectedOptionIndex: undefined,
    validationMessages: {},
    legend: 'legend',
    handleDataChange: jest.fn(),
    handleFocusUpdate: jest.fn(),
    getTextResource: (value) => value,
    getTextResourceAsString: (value) => value,
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

  renderWithProviders(<CheckboxContainerComponent {...allProps} />, {
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

const getCheckbox = ({ name, isChecked = false }) => {
  return screen.getByRole('checkbox', {
    name: name,
    checked: isChecked,
  });
};

describe('CheckboxContainerComponent', () => {
  it('should call handleDataChange with value of preselectedOptionIndex when simpleBinding is not set', () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
      preselectedOptionIndex: 1,
      formData: {
        simpleBinding: undefined,
      },
    });

    expect(handleChange).toHaveBeenCalledWith('sweden');
  });

  it('should not call handleDataChange when simpleBinding is set and preselectedOptionIndex', () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
      preselectedOptionIndex: 0,
      formData: {
        simpleBinding: 'denmark',
      },
    });

    expect(getCheckbox({ name: 'Norway' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark', isChecked: true })).toBeInTheDocument();

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should show several checkboxes as selected based on values in simpleBinding', () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
      formData: {
        simpleBinding: 'norway,denmark',
      },
    });

    expect(getCheckbox({ name: 'Norway', isChecked: true })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark', isChecked: true })).toBeInTheDocument();

    expect(handleChange).not.toHaveBeenCalledWith();
  });

  it('should not set any as selected when no binding and no preselectedOptionIndex is set', () => {
    const handleChange = jest.fn();
    render({ handleDataChange: handleChange });

    expect(getCheckbox({ name: 'Norway' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should call handleDataChange with updated values when selection changes', () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
      formData: {
        simpleBinding: 'norway',
      },
    });

    expect(getCheckbox({ name: 'Norway', isChecked: true })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    userEvent.click(getCheckbox({ name: 'Denmark' }));

    expect(handleChange).toHaveBeenCalledWith('norway,denmark');
  });

  it('should call handleDataChange with updated values when deselecting item', () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
      formData: {
        simpleBinding: 'norway,denmark',
      },
    });

    expect(getCheckbox({ name: 'Norway', isChecked: true })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark', isChecked: true })).toBeInTheDocument();

    userEvent.click(getCheckbox({ name: 'Denmark', isChecked: true }));

    expect(handleChange).toHaveBeenCalledWith('norway');
  });

  it('should call handleDataChange on blur with already selected value', () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
      formData: {
        simpleBinding: 'norway',
      },
    });

    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    fireEvent.focus(getCheckbox({ name: 'Denmark' }));
    fireEvent.blur(getCheckbox({ name: 'Denmark' }));

    expect(handleChange).toHaveBeenCalledWith('norway');
  });

  it('should call handleDataChange on blur with empty value when no item is selected', () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
    });

    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    fireEvent.focus(getCheckbox({ name: 'Denmark' }));
    fireEvent.blur(getCheckbox({ name: 'Denmark' }));

    expect(handleChange).toHaveBeenCalledWith('');
  });
});
