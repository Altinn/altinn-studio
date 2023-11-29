import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { promiseMock, renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { AppQueries } from 'src/core/contexts/AppQueriesProvider';
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

const render = async ({ component, genericProps, options, ...rest }: Props = {}) => {
  const fetchOptions = promiseMock<AppQueries['fetchOptions']>();
  const utils = await renderGenericComponentTest({
    type: 'Dropdown',
    renderer: (props) => <DropdownComponent {...props} />,
    component: {
      optionsId: 'countries',
      readOnly: false,
      ...component,
    },
    genericProps: {
      handleDataChange: jest.fn(),
      isValid: true,
      ...genericProps,
    },
    queries: {
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
  it('should trigger handleDataChange when option is selected', async () => {
    const handleDataChange = jest.fn();
    await render({
      genericProps: {
        handleDataChange,
      },
      options: countries,
    });

    expect(handleDataChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('Sweden'));
    await waitFor(() => expect(handleDataChange).toHaveBeenCalledWith('sweden', { validate: true }));
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

  it('should trigger handleDataChange when preselectedOptionIndex is set', async () => {
    const handleDataChange = jest.fn();
    await render({
      component: {
        preselectedOptionIndex: 2,
      },
      genericProps: {
        handleDataChange,
      },
      options: countries,
    });

    await waitFor(() => expect(handleDataChange).toHaveBeenCalledWith('denmark', { validate: true }));
    expect(handleDataChange).toHaveBeenCalledTimes(1);
  });

  it('should trigger handleDataChange instantly on blur', async () => {
    const handleDataChange = jest.fn();
    await render({
      component: {
        preselectedOptionIndex: 2,
      },
      genericProps: {
        handleDataChange,
      },
      options: countries,
    });

    await waitFor(() => expect(handleDataChange).toHaveBeenCalledWith('denmark', { validate: true }));
    const select = screen.getByRole('combobox');

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    await userEvent.click(select);

    await userEvent.tab();
    await waitFor(() => expect(handleDataChange).toHaveBeenCalledWith('denmark', { validate: true }));
    expect(handleDataChange).toHaveBeenCalledTimes(1);
  });

  it('should show spinner', async () => {
    const { fetchOptions, originalDispatch } = await render({
      component: {
        optionsId: 'countries',
        mapping: {
          'Some.Path': 'queryArg',
        },
      },
      waitUntilLoaded: false,
    });

    await waitFor(() => expect(fetchOptions.mock).toHaveBeenCalledTimes(1));

    fetchOptions.resolve({
      data: countries,
      headers: {},
    } as AxiosResponse<IOption[], any>);

    await screen.findByText('Denmark');

    // The component always finishes loading the first time, but if we have mapping that affects the options
    // the component renders a spinner for a while when fetching the options again.
    originalDispatch(
      FormDataActions.updateFulfilled({
        componentId: 'someId',
        field: 'Some.Path',
        data: 'newValue',
        skipAutoSave: true,
        skipValidation: true,
      }),
    );

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

  it('should present replaced label if setup with values from repeating group in redux and trigger handleDataChanged with replaced values', async () => {
    const handleDataChange = jest.fn();
    await render({
      component: {
        optionsId: undefined,
        source: {
          group: 'someGroup',
          label: 'option.from.rep.group.label',
          value: 'someGroup[{0}].valueField',
        },
      },
      genericProps: {
        handleDataChange,
      },
    });

    expect(handleDataChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('The value from the group is: Label for first'));
    await waitFor(() => expect(handleDataChange).toHaveBeenCalledWith('Value for first', { validate: true }));

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('The value from the group is: Label for second'));

    await waitFor(() => expect(handleDataChange).toHaveBeenCalledWith('Value for second', { validate: true }));
    expect(handleDataChange).toHaveBeenCalledTimes(2);
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
