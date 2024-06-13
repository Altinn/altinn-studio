import React from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';

import { getFormDataMockForRepGroup } from 'src/__mocks__/getFormDataMockForRepGroup';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { queryPromiseMock, renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { IRawOption } from 'src/layout/common.generated';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const countries: IRawOption[] = [
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

interface Props extends Partial<Omit<RenderGenericComponentTestProps<'Dropdown'>, 'renderer' | 'type'>> {
  options?: IRawOption[];
}

function MySuperSimpleInput() {
  const { setValue, formData } = useDataModelBindings({ simpleBinding: 'myInput' });

  return (
    <input
      data-testid='my-input'
      value={formData.simpleBinding}
      onChange={(e) => setValue('simpleBinding', e.target.value)}
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
    ...rest,
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
            } as AxiosResponse<IRawOption[], any>),
      ...rest.queries,
    },
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
    await userEvent.click(screen.getByRole('option', { name: /sweden/i }));

    await waitFor(() =>
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'myDropdown', newValue: 'sweden' }),
    );
  });

  it('should show as readonly when readOnly is true', async () => {
    await render({
      component: {
        readOnly: true,
      },
      options: countries,
    });

    const select = await screen.findByRole('combobox');
    expect(select).toHaveAttribute('readonly');
  });

  it('should not show as readonly when readOnly is false', async () => {
    await render({
      component: {
        readOnly: false,
      },
      options: countries,
    });

    const select = await screen.findByRole('combobox');
    expect(select).not.toHaveAttribute('readonly');
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
    } as AxiosResponse<IRawOption[], any>);

    await userEvent.click(await screen.findByRole('combobox'));
    await screen.findByRole('option', { name: /denmark/i });

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
    } as AxiosResponse<IRawOption[], any>);

    await waitFor(() => expect(screen.queryByTestId('altinn-spinner')).not.toBeInTheDocument());
    await userEvent.click(await screen.findByRole('combobox'));
    expect(screen.getByRole('option', { name: /finland/i })).toBeInTheDocument();
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

    await waitFor(() => expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'myDropdown', newValue: 'Value for first' }),
    );

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('The value from the group is: Label for second'));

    await waitFor(() => expect(formDataMethods.setLeafValue).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'myDropdown', newValue: 'Value for second' }),
    );
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

    expect(options[0]).toHaveTextContent('Norway');
    expect(options[1]).toHaveTextContent('Sweden');
    expect(options[2]).toHaveTextContent('Denmark');
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

    expect(options[0]).toHaveTextContent('Denmark');
    expect(options[1]).toHaveTextContent('Norway');
    expect(options[2]).toHaveTextContent('Sweden');
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

    expect(options[0]).toHaveTextContent('Sweden');
    expect(options[1]).toHaveTextContent('Norway');
    expect(options[2]).toHaveTextContent('Denmark');
  });

  it.each([
    ['truthy', true],
    ['falsy', false],
    ['numeric', 123],
    ['nullable', null],
  ])('should be possible to use a %s option value', async (label, value) => {
    const options: IRawOption[] = [{ label, value }];
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    const { mutations } = await render({
      component: {
        optionsId: 'countries',
      },
      options,
      queries: {
        fetchDataModelSchema: async () => ({
          type: 'object',
          properties: {
            myDropdown: { anyOf: [{ type: 'boolean' }, { type: 'number' }, { type: 'null' }] },
          },
        }),
      },
    });

    await user.click(await screen.findByRole('combobox'));
    await user.click(screen.getByText(label));

    expect(await screen.findByText(label)).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1000));

    await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(1));
    expect(mutations.doPatchFormData.mock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        patch: [{ op: 'add', path: '/myDropdown', value }],
      }),
    );

    jest.useRealTimers();
  });
});
