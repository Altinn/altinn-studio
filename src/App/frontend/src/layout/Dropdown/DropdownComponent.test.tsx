import React from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { IRawOption } from '@app/layout-contract/generated/common.generated';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getFormDataMockForRepGroup } from 'src/__mocks__/getFormDataMockForRepGroup';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { optionsApi } from 'src/core/api-client/app.api';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { apiMock } from 'src/test/apiMocks';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
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
  const { setValue, formData } = useDataModelBindings({
    simpleBinding: { field: 'myInput', dataType: defaultDataTypeMock },
  });

  return (
    <input
      data-testid='my-input'
      value={formData.simpleBinding}
      onChange={(e) => setValue('simpleBinding', e.target.value)}
    />
  );
}

const render = async ({ component, options, ...rest }: Props = {}) => {
  const fetchOptions = apiMock(optionsApi.fetchOptions);
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
      textResourceBindings: {
        title: 'Land',
      },
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'myDropdown' },
      },
      ...component,
    },
    ...rest,
    apis: {
      ...rest.apis,
      formBootstrapApi: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialData = getFormDataMockForRepGroup();
          }),
        ...rest.apis?.formBootstrapApi,
      },
      optionsApi: {
        fetchOptions: (...args) =>
          options === undefined
            ? fetchOptions(...args)
            : Promise.resolve({
                data: options,
                headers: {},
              }),
        ...rest.apis?.optionsApi,
      },
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
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
        reference: { field: 'myDropdown', dataType: defaultDataTypeMock },
        newValue: 'sweden',
      }),
    );
  });

  it('should trigger setLeafValue when preselectedOptionIndex is set', async () => {
    const { formDataMethods } = await render({
      component: {
        preselectedOptionIndex: 2,
      },
      options: countries,
    });

    await waitFor(() =>
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
        reference: { field: 'myDropdown', dataType: defaultDataTypeMock },
        newValue: 'denmark',
      }),
    );
  });

  it('should show spinner', async () => {
    const { fetchOptions } = await render({
      component: {
        optionsId: 'countries',
        queryParameters: {
          queryArg: ['dataModel', 'myInput'],
        },
      },
      waitUntilLoaded: false,
    });

    await waitFor(() => expect(fetchOptions).toHaveBeenCalledTimes(1), { timeout: 15000 });

    fetchOptions.resolve({
      data: countries,
      headers: {},
    });

    await userEvent.click(await screen.findByRole('combobox'));
    await screen.findByRole('option', { name: /denmark/i });

    // The component always finishes loading the first time, but if we have query parameters that affect the options
    // the component renders a spinner for a while when fetching the options again.
    await userEvent.type(screen.getByTestId('my-input'), 'test');

    await waitFor(() => expect(fetchOptions).toHaveBeenCalledTimes(2));
    await screen.findByTestId('altinn-spinner');

    fetchOptions.resolve({
      data: [
        ...countries,
        {
          label: 'Finland',
          value: 'finland',
        },
      ],
      headers: {},
    });

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

    await waitFor(() =>
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
        reference: { field: 'myDropdown', dataType: defaultDataTypeMock },
        newValue: 'Value for first',
      }),
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
    const user = userEvent.setup({ delay: null });
    const { apis } = await render({
      component: {
        optionsId: 'countries',
      },
      options,
      apis: {
        formBootstrapApi: {
          fetchFormBootstrapForInstance: async () =>
            getFormBootstrapMock((obj) => {
              obj.dataModels[defaultDataTypeMock].schema = {
                type: 'object',
                properties: {
                  myDropdown: { anyOf: [{ type: 'boolean' }, { type: 'number' }, { type: 'null' }] },
                },
              };
            }),
        },
      },
    });

    vi.useFakeTimers();
    await user.click(await screen.findByRole('combobox'));
    await user.click(screen.getByText(label));

    expect((await screen.findAllByText(label)).at(0)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));

    await waitFor(() => expect(apis.formDataApi.doPatchMultipleFormData).toHaveBeenCalledTimes(1));
    expect(apis.formDataApi.doPatchMultipleFormData).toHaveBeenCalledWith(
      expect.stringContaining('local.altinn.cloud'),
      expect.objectContaining({
        patches: [expect.objectContaining({ patch: [{ op: 'add', path: '/myDropdown', value }] })],
      }),
    );

    vi.useRealTimers();
  });

  it('required validation should only show for simpleBinding', async () => {
    await render({
      component: {
        showValidations: ['Required'],
        required: true,
        dataModelBindings: {
          simpleBinding: { dataType: defaultDataTypeMock, field: 'value' },
          label: { dataType: defaultDataTypeMock, field: 'label' },
          metadata: { dataType: defaultDataTypeMock, field: 'metadata' },
        },
      },
      options: countries,
      apis: { formDataApi: { fetchFormData: () => Promise.resolve({ simpleBinding: '', label: '', metadata: '' }) } },
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('listitem')).toHaveTextContent('Du må fylle ut land');
  });
});
