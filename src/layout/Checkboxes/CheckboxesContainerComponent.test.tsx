import React from 'react';

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';

import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { LayoutStyle } from 'src/layout/common.generated';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { IOption } from 'src/layout/common.generated';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const twoOptions: IOption[] = [
  {
    label: 'Norway',
    value: 'norway',
  },
  {
    label: 'Sweden',
    value: 'sweden',
  },
];

const threeOptions: IOption[] = [
  ...twoOptions,
  {
    label: 'Denmark',
    value: 'denmark',
  },
];

interface Props extends Partial<RenderGenericComponentTestProps<'Checkboxes'>> {
  options?: IOption[];
}

const render = async ({ component, genericProps, options }: Props = {}) =>
  await renderGenericComponentTest({
    type: 'Checkboxes',
    renderer: (props) => <CheckboxContainerComponent {...props} />,
    component: {
      optionsId: 'countries',
      ...component,
    },
    genericProps: {
      legend: () => <span>legend</span>,
      handleDataChange: jest.fn(),
      ...genericProps,
    },
    queries: {
      fetchOptions: () =>
        options
          ? Promise.resolve({ data: options, headers: {} } as AxiosResponse<IOption[], any>)
          : Promise.reject(new Error('No options provided to render()')),
    },
  });

const getCheckbox = ({ name, isChecked = false }) =>
  screen.getByRole('checkbox', {
    name,
    checked: isChecked,
  });

describe('CheckboxesContainerComponent', () => {
  it('should call handleDataChange with value of preselectedOptionIndex when simpleBinding is not set', async () => {
    const handleChange = jest.fn();
    await render({
      component: {
        preselectedOptionIndex: 1,
      },
      genericProps: {
        handleDataChange: handleChange,
        formData: {
          simpleBinding: undefined,
        },
      },
      options: threeOptions,
    });

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith('sweden', { validate: true });
    });
  });

  it('should not call handleDataChange when simpleBinding is set and preselectedOptionIndex', async () => {
    const handleChange = jest.fn();
    await render({
      component: {
        preselectedOptionIndex: 0,
      },
      genericProps: {
        handleDataChange: handleChange,
        formData: {
          simpleBinding: 'denmark',
        },
      },
      options: threeOptions,
    });

    expect(getCheckbox({ name: 'Norway' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark', isChecked: true })).toBeInTheDocument();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should show several checkboxes as selected based on values in simpleBinding', async () => {
    const handleChange = jest.fn();
    await render({
      genericProps: {
        handleDataChange: handleChange,
        formData: {
          simpleBinding: 'norway,denmark',
        },
      },
      options: threeOptions,
    });

    expect(getCheckbox({ name: 'Norway', isChecked: true })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark', isChecked: true })).toBeInTheDocument();
    expect(handleChange).not.toHaveBeenCalledWith();
  });

  it('should not set any as selected when no binding and no preselectedOptionIndex is set', async () => {
    const handleChange = jest.fn();
    await render({ genericProps: { handleDataChange: handleChange }, options: threeOptions });

    expect(getCheckbox({ name: 'Norway' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should call handleDataChange with updated values when selection changes', async () => {
    const handleChange = jest.fn();
    await render({
      genericProps: {
        handleDataChange: handleChange,
        formData: {
          simpleBinding: 'norway',
        },
      },
      options: threeOptions,
    });
    await waitFor(() => {
      expect(getCheckbox({ name: 'Norway', isChecked: true })).toBeInTheDocument();
    });
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    expect(handleChange).not.toHaveBeenCalled();
    await userEvent.click(getCheckbox({ name: 'Denmark' }));

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith('norway,denmark', { validate: true });
    });
  });

  it('should call handleDataChange with updated values when deselecting item', async () => {
    const handleChange = jest.fn();
    await render({
      genericProps: {
        handleDataChange: handleChange,
        formData: {
          simpleBinding: 'norway,denmark',
        },
      },
      options: threeOptions,
    });
    await waitFor(() => {
      expect(getCheckbox({ name: 'Norway', isChecked: true })).toBeInTheDocument();
    });
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark', isChecked: true })).toBeInTheDocument();

    expect(handleChange).not.toHaveBeenCalled();
    await userEvent.click(getCheckbox({ name: 'Denmark', isChecked: true }));

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith('norway', { validate: true });
    });
  });

  it('should call handleDataChange instantly on blur when the value has changed', async () => {
    const handleChange = jest.fn();
    await render({
      genericProps: {
        handleDataChange: handleChange,
        formData: {
          simpleBinding: 'norway',
        },
      },
      options: threeOptions,
    });

    const denmark = getCheckbox({ name: 'Denmark' });
    expect(denmark).toBeInTheDocument();

    expect(handleChange).not.toHaveBeenCalled();
    await userEvent.click(denmark);
    fireEvent.blur(denmark);

    expect(handleChange).toHaveBeenCalledWith('norway,denmark', { validate: true });
  });

  it('should not call handleDataChange on blur when the value is unchanged', async () => {
    const handleChange = jest.fn();
    await render({
      genericProps: {
        handleDataChange: handleChange,
      },
      options: threeOptions,
    });

    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    fireEvent.focus(getCheckbox({ name: 'Denmark' }));
    fireEvent.blur(getCheckbox({ name: 'Denmark' }));

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should call handleDataChange onBlur with no commas in string when starting with empty string formData', async () => {
    const handleChange = jest.fn();
    await render({
      genericProps: {
        handleDataChange: handleChange,
        formData: {
          simpleBinding: '',
        },
      },
      options: threeOptions,
    });

    expect(getCheckbox({ name: 'Norway' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    expect(handleChange).not.toHaveBeenCalled();
    await userEvent.click(getCheckbox({ name: 'Denmark' }));

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith('denmark', { validate: true });
    });
  });

  it('should show items in a row when layout is "row" and options count is 3', async () => {
    await render({
      component: {
        optionsId: 'countries',
        layout: LayoutStyle.Row,
      },
      options: threeOptions,
    });

    expect(screen.queryByTestId('checkboxes-fieldset')).toHaveClass('horizontal');
  });

  it('should show items in a row when layout is not defined, and options count is 2', async () => {
    await render({
      component: {
        // We have to provide a different optionsId here. If we re-used the optionsId from above and provided
        // the options using a query, the query cache might give us options from another test run.
        optionsId: 'twoOptions',
      },
      options: twoOptions,
    });

    expect(screen.queryByTestId('checkboxes-fieldset')).toHaveClass('horizontal');
  });

  it('should show items in a column when layout is "column" and options count is 2 ', async () => {
    await render({
      component: {
        optionsId: 'countries',
        layout: LayoutStyle.Column,
      },

      options: twoOptions,
    });

    expect(screen.queryByTestId('checkboxes-fieldset')).not.toHaveClass('horizontal');
  });

  it('should show items in a columns when layout is not defined, and options count is 3', async () => {
    await render({
      component: {
        optionsId: 'countries',
      },
      options: threeOptions,
    });

    expect(screen.queryByTestId('checkboxes-fieldset')).not.toHaveClass('horizontal');
  });

  it('should present replaced label if setup with values from repeating group in redux and trigger handleDataChanged with replaced values', async () => {
    const handleDataChange = jest.fn();

    await render({
      genericProps: { handleDataChange },
      component: {
        optionsId: undefined,
        source: {
          group: 'someGroup',
          label: 'option.from.rep.group.label',
          description: 'option.from.rep.group.description',
          helpText: 'option.from.rep.group.helpText',
          value: 'someGroup[{0}].valueField',
        },
        options: undefined,
      },
    });

    expect(getCheckbox({ name: /The value from the group is: Label for first/ })).toBeInTheDocument();
    expect(getCheckbox({ name: /The value from the group is: Label for second/ })).toBeInTheDocument();
    expect(screen.getByText(/Description: The value from the group is: Label for first/)).toBeInTheDocument();
    expect(screen.getByText(/Description: The value from the group is: Label for second/)).toBeInTheDocument();

    expect(screen.getByText(/Help Text: The value from the group is: Label for first/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /Help Text: The value from the group is: Label for first/ }),
    );
    expect(screen.getAllByText(/Help Text: The value from the group is: Label for first/)).toHaveLength(2);

    expect(screen.getByText(/Help Text: The value from the group is: Label for second/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /Help Text: The value from the group is: Label for second/ }),
    );
    expect(screen.getAllByText(/Help Text: The value from the group is: Label for second/)).toHaveLength(2);

    expect(handleDataChange).not.toHaveBeenCalled();
    await userEvent.click(getCheckbox({ name: /The value from the group is: Label for second/ }));

    await waitFor(() => {
      expect(handleDataChange).toHaveBeenCalledWith('Value for second', { validate: true });
    });
  });
});
