import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';

import { getFormDataMockForRepGroup } from 'src/__mocks__/getFormDataMockForRepGroup';
import { FD } from 'src/features/formData/FormDataWrite';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { queryPromiseMock, renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { IOption } from 'src/layout/common.generated';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const countries: IOption[] = [
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

interface Props extends Partial<Omit<RenderGenericComponentTestProps<'Dropdown'>, 'renderer' | 'type' | 'queries'>> {
  options?: IOption[];
}

function MySuperSimpleInput() {
  const setValue = FD.useSetForBinding('myInput');
  const value = FD.usePickFreshString('myInput');

  return (
    <input
      data-testid='my-input'
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

const render = async ({ component, genericProps, options, ...rest }: Props = {}) => {
  const fetchOptions = queryPromiseMock('fetchOptions');
  const utils = await renderGenericComponentTest({
    type: 'Dropdown',
    renderer: (props) => (
      <>
        <DropdownComponent {...props} />
        <MySuperSimpleInput />
      </>
    ),
    component: {
      optionsId: 'countries',
      readOnly: false,
      dataModelBindings: {
        simpleBinding: 'myDropdown',
      },
      ...component,
    },
    genericProps: {
      isValid: true,
      ...genericProps,
    },
    queries: {
      fetchFormData: async () => ({
        ...getFormDataMockForRepGroup(),
      }),
      fetchOptions: (...args) =>
        options === undefined
          ? fetchOptions.mock(...args)
          : Promise.resolve({
              data: options,
              headers: {},
            } as AxiosResponse<IOption[], any>),
    },
    ...rest,
  });

  return { ...utils, fetchOptions };
};

describe('DropdownComponent', () => {
  it('should trigger setLeafValue when option is selected', async () => {
    const { formDataMethods } = await render({
      options: countries,
    });

    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('Sweden'));

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'myDropdown', newValue: 'sweden' });
  });

  it('should show as disabled when readOnly is true', async () => {
    await render({
      component: {
        readOnly: true,
      },
      options: countries,
    });

    const select = await screen.findByRole('combobox');
    expect(select).toHaveProperty('disabled', true);
  });

  it('should not show as disabled when readOnly is false', async () => {
    await render({
      component: {
        readOnly: false,
      },
      options: countries,
    });

    const select = await screen.findByRole('combobox');
    expect(select).toHaveProperty('disabled', false);
  });

  it('should trigger setLeafValue when preselectedOptionIndex is set', async () => {
    const { formDataMethods } = await render({
      component: {
        preselectedOptionIndex: 2,
      },
      options: countries,
    });

    await waitFor(() =>
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'myDropdown', newValue: 'denmark' }),
    );
    expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(1);
  });

  it('should show spinner', async () => {
    const { fetchOptions } = await render({
      component: {
        optionsId: 'countries',
        mapping: {
          myInput: 'queryArg',
        },
      },
      waitUntilLoaded: false,
    });

    await waitFor(() => expect(fetchOptions.mock).toHaveBeenCalledTimes(1), { timeout: 15000 });

    fetchOptions.resolve({
      data: countries,
      headers: {},
    } as AxiosResponse<IOption[], any>);

    await screen.findByText('Denmark');

    // The component always finishes loading the first time, but if we have mapping that affects the options
    // the component renders a spinner for a while when fetching the options again.
    await userEvent.type(screen.getByTestId('my-input'), 'test');

    await waitFor(() => expect(fetchOptions.mock).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('altinn-spinner')).toBeInTheDocument();

    fetchOptions.resolve({
      data: [
        ...countries,
        {
          label: 'Finland',
          value: 'finland',
        },
      ],
      headers: {},
    } as AxiosResponse<IOption[], any>);

    await waitFor(() => expect(screen.queryByTestId('altinn-spinner')).not.toBeInTheDocument());
    expect(screen.getByText('Finland')).toBeInTheDocument();
  });

  it('should present replaced label if setup with values from repeating group in redux and trigger setLeafValue with replaced values', async () => {
    const { formDataMethods } = await render({
      component: {
        optionsId: undefined,
        source: {
          group: 'someGroup',
          label: 'option.from.rep.group.label',
          value: 'someGroup[{0}].valueField',
        },
      },
    });

    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('The value from the group is: Label for first'));

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'myDropdown', newValue: 'Value for first' });
    expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('The value from the group is: Label for second'));

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'myDropdown', newValue: 'Value for second' });
    expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(2);
  });

  it('should present the options list in the order it is provided when sortOrder is not specified', async () => {
    await render({
      component: {
        optionsId: 'countries',
      },
      options: countries,
    });

    await userEvent.click(await screen.findByRole('combobox'));
    const options = await screen.findAllByRole('option');

    expect(options[0]).toHaveValue('norway');
    expect(options[1]).toHaveValue('sweden');
    expect(options[2]).toHaveValue('denmark');
  });

  it('should present the provided options list sorted alphabetically in ascending order when providing sortOrder "asc"', async () => {
    await render({
      component: {
        optionsId: 'countries',
        sortOrder: 'asc',
      },
      options: countries,
    });

    await userEvent.click(await screen.findByRole('combobox'));
    const options = await screen.findAllByRole('option');

    expect(options[0]).toHaveValue('denmark');
    expect(options[1]).toHaveValue('norway');
    expect(options[2]).toHaveValue('sweden');
  });

  it('should present the provided options list sorted alphabetically in descending order when providing sortOrder "desc"', async () => {
    await render({
      component: {
        optionsId: 'countries',
        sortOrder: 'desc',
      },
      options: countries,
    });

    await userEvent.click(await screen.findByRole('combobox'));
    const options = await screen.findAllByRole('option');

    expect(options[0]).toHaveValue('sweden');
    expect(options[1]).toHaveValue('norway');
    expect(options[2]).toHaveValue('denmark');
  });
});
