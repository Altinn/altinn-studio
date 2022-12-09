import React from 'react';

import { getInitialStateMock } from '__mocks__/initialStateMock';
import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockComponentProps, renderWithProviders } from 'testUtils';
import type { PreloadedState } from 'redux';

import { CheckboxContainerComponent } from 'src/components/base/CheckboxesContainerComponent';
import { LayoutStyle } from 'src/types';
import type { ICheckboxContainerProps } from 'src/components/base/CheckboxesContainerComponent';
import type { IOptionsState } from 'src/shared/resources/options';
import type { RootState } from 'src/store';

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

const render = (props: Partial<ICheckboxContainerProps> = {}, customState: PreloadedState<RootState> = {}) => {
  const allProps: ICheckboxContainerProps = {
    ...mockComponentProps,
    options: [],
    optionsId: 'countries',
    preselectedOptionIndex: undefined,
    validationMessages: {},
    legend: () => <span>legend</span>,
    handleDataChange: jest.fn(),
    getTextResource: (value) => value,
    getTextResourceAsString: (value) => value,
    ...props,
  };

  const { container } = renderWithProviders(<CheckboxContainerComponent {...allProps} />, {
    preloadedState: {
      ...getInitialStateMock(),
      optionState: {
        options: {
          countries: {
            id: 'countries',
            options: threeOptions,
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
      ...customState,
    },
  });

  return { container };
};

const getCheckbox = ({ name, isChecked = false }) => {
  return screen.getByRole('checkbox', {
    name: name,
    checked: isChecked,
  });
};

describe('CheckboxContainerComponent', () => {
  jest.useFakeTimers();
  const user = userEvent.setup({
    advanceTimers: (time) => {
      act(() => {
        jest.advanceTimersByTime(time);
      });
    },
  });

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

  it('should call handleDataChange with updated values when selection changes', async () => {
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

    await act(() => user.click(getCheckbox({ name: 'Denmark' })));

    expect(handleChange).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    expect(handleChange).toHaveBeenCalledWith('norway,denmark');
  });

  it('should call handleDataChange with updated values when deselecting item', async () => {
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

    await act(() => user.click(getCheckbox({ name: 'Denmark', isChecked: true })));

    expect(handleChange).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    expect(handleChange).toHaveBeenCalledWith('norway');
  });

  it('should call handleDataChange instantly on blur when the value has changed', async () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
      formData: {
        simpleBinding: 'norway',
      },
    });

    const denmark = getCheckbox({ name: 'Denmark' });

    expect(denmark).toBeInTheDocument();

    await act(() => user.click(denmark));

    expect(handleChange).not.toHaveBeenCalled();

    await act(() => fireEvent.blur(denmark));

    expect(handleChange).toHaveBeenCalledWith('norway,denmark');
  });

  it('should not call handleDataChange on blur when the value is unchanged', async () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
    });

    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    await act(() => {
      fireEvent.focus(getCheckbox({ name: 'Denmark' }));
      fireEvent.blur(getCheckbox({ name: 'Denmark' }));
    });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should call handleDataChange onBlur with no commas in string when starting with empty string formData', async () => {
    const handleChange = jest.fn();
    render({
      handleDataChange: handleChange,
      formData: {
        simpleBinding: '',
      },
    });

    expect(getCheckbox({ name: 'Norway' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    await act(() => user.click(getCheckbox({ name: 'Denmark' })));

    expect(handleChange).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    expect(handleChange).toHaveBeenCalledWith('denmark');
  });

  it('should show spinner while waiting for options', () => {
    render({
      optionsId: 'loadingOptions',
    });

    expect(screen.queryByTestId('altinn-spinner')).toBeInTheDocument();
  });

  it('should show items in a row when layout is "row" and options count is 3', () => {
    const { container } = render({
      optionsId: 'countries',
      layout: LayoutStyle.Row,
    });

    expect(container.querySelectorAll('.MuiFormGroup-root').length).toBe(1);

    expect(container.querySelectorAll('.MuiFormGroup-root.MuiFormGroup-row').length).toBe(1);
  });

  it('should show items in a row when layout is not defined, and options count is 2', () => {
    const { container } = render(
      {
        optionsId: 'countries',
      },
      {
        optionState: {
          options: {
            countries: {
              id: 'countries',
              options: twoOptions,
            },
          },
        } as unknown as IOptionsState,
      },
    );

    expect(container.querySelectorAll('.MuiFormGroup-root').length).toBe(1);

    expect(container.querySelectorAll('.MuiFormGroup-root.MuiFormGroup-row').length).toBe(1);
  });

  it('should show items in a column when layout is "column" and options count is 2 ', () => {
    const { container } = render(
      {
        optionsId: 'countries',
        layout: LayoutStyle.Column,
      },
      {
        optionState: {
          options: {
            countries: {
              id: 'countries',
              options: twoOptions,
            },
          },
        } as unknown as IOptionsState,
      },
    );

    expect(container.querySelectorAll('.MuiFormGroup-root').length).toBe(1);

    expect(container.querySelectorAll('.MuiFormGroup-root.MuiFormGroup-row').length).toBe(0);
  });

  it('should show items in a columns when layout is not defined, and options count is 3', () => {
    const { container } = render({
      optionsId: 'countries',
    });

    expect(container.querySelectorAll('.MuiFormGroup-root').length).toBe(1);

    expect(container.querySelectorAll('.MuiFormGroup-root.MuiFormGroup-row').length).toBe(0);
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

    expect(getCheckbox({ name: 'The value from the group is: Label for first' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'The value from the group is: Label for second' })).toBeInTheDocument();

    await act(() => user.click(getCheckbox({ name: 'The value from the group is: Label for second' })));

    expect(handleDataChange).not.toHaveBeenCalled();

    jest.runOnlyPendingTimers();

    expect(handleDataChange).toHaveBeenCalledWith('Value for second');
  });
});
