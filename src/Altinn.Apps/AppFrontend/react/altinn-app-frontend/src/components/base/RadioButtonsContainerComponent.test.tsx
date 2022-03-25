import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '../../../testUtils';

import { RadioButtonContainerComponent } from './RadioButtonsContainerComponent';
import type { IComponentProps } from 'src/components';
import type { IRadioButtonsContainerProps } from './RadioButtonsContainerComponent';
import { LayoutStyle } from 'src/types';

const threeOptions = [
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

const twoOptions = threeOptions.slice(1);

const render = (
  props: Partial<IRadioButtonsContainerProps> = {},
  options = undefined,
) => {
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

  const { container } = renderWithProviders(
    <RadioButtonContainerComponent {...allProps} />,
    {
      preloadedState: {
        optionState: {
          options: {
            countries: {
              id: 'countries',
              options: options || threeOptions,
            },
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
    },
  );

  return { container };
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

  it('should show items in a row when layout is "row" and options count is 3', () => {
    const { container } = render(
      {
        optionsId: 'countries',
        layout: LayoutStyle.Row,
      },
      threeOptions,
    );

    expect(container.querySelectorAll('.MuiFormGroup-root').length).toBe(1);

    expect(
      container.querySelectorAll('.MuiFormGroup-root.MuiFormGroup-row').length,
    ).toBe(1);
  });

  it('should show items in a row when layout is not defined, and options count is 2', () => {
    const { container } = render(
      {
        optionsId: 'countries',
      },
      twoOptions,
    );

    expect(container.querySelectorAll('.MuiFormGroup-root').length).toBe(1);

    expect(
      container.querySelectorAll('.MuiFormGroup-root.MuiFormGroup-row').length,
    ).toBe(1);
  });

  it('should show items in a column when layout is "column" and options count is 2 ', () => {
    const { container } = render(
      {
        optionsId: 'countries',
        layout: LayoutStyle.Column,
      },
      twoOptions,
    );

    expect(container.querySelectorAll('.MuiFormGroup-root').length).toBe(1);

    expect(
      container.querySelectorAll('.MuiFormGroup-root.MuiFormGroup-row').length,
    ).toBe(0);
  });

  it('should show items in a columns when layout is not defined, and options count is 3', () => {
    const { container } = render(
      {
        optionsId: 'countries',
      },
      threeOptions,
    );

    expect(container.querySelectorAll('.MuiFormGroup-root').length).toBe(1);

    expect(
      container.querySelectorAll('.MuiFormGroup-root.MuiFormGroup-row').length,
    ).toBe(0);
  });
});
