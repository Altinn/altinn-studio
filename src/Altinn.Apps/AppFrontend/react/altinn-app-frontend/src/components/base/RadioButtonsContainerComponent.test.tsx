import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '../../../testUtils';

import { RadioButtonContainerComponent } from './RadioButtonsContainerComponent';
import type { IComponentProps } from 'src/components';
import type { IRadioButtonsContainerProps } from './RadioButtonsContainerComponent';

const render = (props: Partial<IRadioButtonsContainerProps> = {}) => {
  const allProps: IRadioButtonsContainerProps = {
    options: [],
    optionsId: 'countries',
    preselectedOptionIndex: undefined,
    title: 'title',
    legend: 'legend',
    handleDataChange: jest.fn(),
    handleFocusUpdate: jest.fn(),
    getTextResource: (value) => value,
    ...({} as IComponentProps),
    ...props,
  };

  const countriesOptions = [
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

  renderWithProviders(<RadioButtonContainerComponent {...allProps} />, {
    preloadedState: {
      optionState: {
        options: {
          countries: {
            id: 'countries',
            options: countriesOptions,
          },
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
  });
};

const getRadio = ({ name, isChecked = false }) => {
  return screen.getByRole('radio', {
    name: name,
    checked: isChecked,
  });
};

describe('RadioButtonsContainerComponent', () => {
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

    expect(getRadio({ name: 'Norway' })).toBeInTheDocument();
    expect(getRadio({ name: 'Sweden' })).toBeInTheDocument();
    expect(getRadio({ name: 'Denmark', isChecked: true })).toBeInTheDocument();

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should not set any as selected when no binding and no preselectedOptionIndex is set', () => {
    const handleChange = jest.fn();
    render({ handleDataChange: handleChange });

    expect(getRadio({ name: 'Norway' })).toBeInTheDocument();
    expect(getRadio({ name: 'Sweden' })).toBeInTheDocument();
    expect(getRadio({ name: 'Denmark' })).toBeInTheDocument();

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should call handleDataChange with updated value when selection changes', () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
      formData: {
        simpleBinding: 'norway',
      },
    });

    expect(getRadio({ name: 'Norway', isChecked: true })).toBeInTheDocument();
    expect(getRadio({ name: 'Sweden' })).toBeInTheDocument();
    expect(getRadio({ name: 'Denmark' })).toBeInTheDocument();

    userEvent.click(getRadio({ name: 'Denmark' }));

    expect(handleChange).toHaveBeenCalledWith('denmark');
  });

  it('should call handleDataChange on blur with already selected value', () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
      formData: {
        simpleBinding: 'norway',
      },
    });

    expect(getRadio({ name: 'Denmark' })).toBeInTheDocument();

    fireEvent.focus(getRadio({ name: 'Denmark' }));
    fireEvent.blur(getRadio({ name: 'Denmark' }));

    expect(handleChange).toHaveBeenCalledWith('norway');
  });

  it('should call handleDataChange on blur with empty value when no item is selected', () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
    });

    expect(getRadio({ name: 'Denmark' })).toBeInTheDocument();

    fireEvent.focus(getRadio({ name: 'Denmark' }));
    fireEvent.blur(getRadio({ name: 'Denmark' }));

    expect(handleChange).toHaveBeenCalledWith('');
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
});
