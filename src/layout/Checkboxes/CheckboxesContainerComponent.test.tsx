import React from 'react';

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';

import { getFormDataMockForRepGroup } from 'src/__mocks__/getFormDataMockForRepGroup';
import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { LayoutStyle } from 'src/layout/common.generated';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { IRawOption } from 'src/layout/common.generated';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const twoOptions: IRawOption[] = [
  {
    label: 'Norway',
    value: 'norway',
  },
  {
    label: 'Sweden',
    value: 'sweden',
  },
];

const threeOptions: IRawOption[] = [
  ...twoOptions,
  {
    label: 'Denmark',
    value: 'denmark',
  },
];

interface Props extends Partial<RenderGenericComponentTestProps<'Checkboxes'>> {
  options?: IRawOption[];
  formData?: string;
  groupData?: object;
}

const render = async ({ component, options, formData, groupData = getFormDataMockForRepGroup() }: Props = {}) =>
  await renderGenericComponentTest({
    type: 'Checkboxes',
    renderer: (props) => <CheckboxContainerComponent {...props} />,
    component: {
      optionsId: 'countries',
      dataModelBindings: {
        simpleBinding: 'selectedValues',
      },
      ...component,
    },
    queries: {
      fetchOptions: () =>
        options
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Promise.resolve({ data: options, headers: {} } as AxiosResponse<IRawOption[], any>)
          : Promise.reject(new Error('No options provided to render()')),
      fetchFormData: async () => (formData ? { selectedValues: formData, ...groupData } : { ...groupData }),
    },
  });

const getCheckbox = ({ name, isChecked = false }) =>
  screen.getByRole('checkbox', {
    name,
    checked: isChecked,
  });

describe('CheckboxesContainerComponent', () => {
  it('should call setLeafValue with value of preselectedOptionIndex', async () => {
    const { formDataMethods } = await render({
      component: {
        preselectedOptionIndex: 1,
      },
      options: threeOptions,
    });

    await waitFor(() => {
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
        path: 'selectedValues',
        newValue: 'sweden',
      });
    });
  });

  it('should not call setLeafValue for preselected item when an item is already set', async () => {
    const { formDataMethods } = await render({
      component: {
        preselectedOptionIndex: 0,
      },
      options: threeOptions,
      formData: 'denmark',
    });

    expect(getCheckbox({ name: 'Norway' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark', isChecked: true })).toBeInTheDocument();
    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
  });

  it('should show several checkboxes as selected based on values in simpleBinding', async () => {
    const { formDataMethods } = await render({
      options: threeOptions,
      formData: 'norway,denmark',
    });

    expect(getCheckbox({ name: 'Norway', isChecked: true })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark', isChecked: true })).toBeInTheDocument();
    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
  });

  it('should not set any as selected when no binding and no preselectedOptionIndex is set', async () => {
    const { formDataMethods } = await render({ options: threeOptions });

    expect(getCheckbox({ name: 'Norway' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();
    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
  });

  it('should call setLeafValue with updated values when selection changes', async () => {
    const { formDataMethods } = await render({
      options: threeOptions,
      formData: 'norway',
    });
    await waitFor(() => {
      expect(getCheckbox({ name: 'Norway', isChecked: true })).toBeInTheDocument();
    });
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
    await userEvent.click(getCheckbox({ name: 'Denmark' }));

    await waitFor(() => {
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
        path: 'selectedValues',
        newValue: 'norway,denmark',
      });
    });
  });

  it('should call setLeafValue with updated values when deselecting item', async () => {
    const { formDataMethods } = await render({
      options: threeOptions,
      formData: 'norway,denmark',
    });
    await waitFor(() => {
      expect(getCheckbox({ name: 'Norway', isChecked: true })).toBeInTheDocument();
    });
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark', isChecked: true })).toBeInTheDocument();

    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
    await userEvent.click(getCheckbox({ name: 'Denmark', isChecked: true }));

    await waitFor(() => {
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'selectedValues', newValue: 'norway' });
    });
  });

  it('should not call setLeafValue on blur when the value is unchanged', async () => {
    const { formDataMethods } = await render({
      options: threeOptions,
    });

    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    fireEvent.focus(getCheckbox({ name: 'Denmark' }));
    fireEvent.blur(getCheckbox({ name: 'Denmark' }));

    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
  });

  it('should call setLeafValue onBlur with no commas in string when starting with empty string formData', async () => {
    const { formDataMethods } = await render({
      options: threeOptions,
      formData: '',
    });

    expect(getCheckbox({ name: 'Norway' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Sweden' })).toBeInTheDocument();
    expect(getCheckbox({ name: 'Denmark' })).toBeInTheDocument();

    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
    await userEvent.click(getCheckbox({ name: 'Denmark' }));

    await waitFor(() => {
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'selectedValues', newValue: 'denmark' });
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

  it('should present replaced label if using data model source and trigger setLeafValue with replaced values', async () => {
    const { formDataMethods } = await render({
      component: {
        optionsId: undefined,
        options: undefined,
        source: {
          group: 'someGroup',
          label: 'option.from.rep.group.label',
          description: 'option.from.rep.group.description',
          helpText: 'option.from.rep.group.helpText',
          value: 'someGroup[{0}].valueField',
        },
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

    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
    await userEvent.click(getCheckbox({ name: /The value from the group is: Label for second/ }));

    await waitFor(() => {
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
        path: 'selectedValues',
        newValue: 'Value for second',
      });
    });
  });
});
