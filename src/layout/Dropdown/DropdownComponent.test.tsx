import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { IOption } from 'src/layout/common.generated';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const countries = {
  id: 'countries',
  options: [
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
  ] as IOption[],
};

interface Props extends Partial<RenderGenericComponentTestProps<'Dropdown'>> {
  options?: IOption[];
}

const render = ({ component, genericProps, options }: Props = {}) => {
  renderGenericComponentTest({
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
    mockedQueries: {
      fetchOptions: () =>
        options ? Promise.resolve(options) : Promise.reject(new Error('No options provided to render()')),
    },
  });
};

describe('DropdownComponent', () => {
  it('should trigger handleDataChange when option is selected', async () => {
    const handleDataChange = jest.fn();
    render({
      genericProps: {
        handleDataChange,
      },
      options: countries.options,
    });

    await waitFor(() => expect(screen.queryByTestId('altinn-spinner')).not.toBeInTheDocument());

    expect(handleDataChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('Sweden'));
    await waitFor(() => expect(handleDataChange).toHaveBeenCalledWith('sweden', { validate: true }));
  });

  it('should show as disabled when readOnly is true', async () => {
    render({
      component: {
        readOnly: true,
      },
      options: countries.options,
    });

    const select = await screen.findByRole('combobox');
    expect(select).toHaveProperty('disabled', true);
  });

  it('should not show as disabled when readOnly is false', async () => {
    render({
      component: {
        readOnly: false,
      },
      options: countries.options,
    });

    const select = await screen.findByRole('combobox');
    expect(select).toHaveProperty('disabled', false);
  });

  it('should trigger handleDataChange when preselectedOptionIndex is set', async () => {
    const handleDataChange = jest.fn();
    render({
      component: {
        preselectedOptionIndex: 2,
      },
      genericProps: {
        handleDataChange,
      },
      options: countries.options,
    });

    await waitFor(() => expect(handleDataChange).toHaveBeenCalledWith('denmark', { validate: true }));
    expect(handleDataChange).toHaveBeenCalledTimes(1);
  });

  it('should trigger handleDataChange instantly on blur', async () => {
    const handleDataChange = jest.fn();
    render({
      component: {
        preselectedOptionIndex: 2,
      },
      genericProps: {
        handleDataChange,
      },
      options: countries.options,
    });

    await waitFor(() => expect(handleDataChange).toHaveBeenCalledWith('denmark', { validate: true }));
    const select = screen.getByRole('combobox');

    expect(handleDataChange).toHaveBeenCalledTimes(1);
    await userEvent.click(select);

    await userEvent.tab();
    await waitFor(() => expect(handleDataChange).toHaveBeenCalledWith('denmark', { validate: true }));
    expect(handleDataChange).toHaveBeenCalledTimes(2);
  });

  it('should show spinner', async () => {
    render({
      component: {
        optionsId: 'countries',
      },
      options: countries.options,
    });
    expect(screen.getByTestId('altinn-spinner')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('altinn-spinner')).not.toBeInTheDocument());
  });

  it('should present replaced label if setup with values from repeating group in redux and trigger handleDataChanged with replaced values', async () => {
    const handleDataChange = jest.fn();
    render({
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
      options: undefined,
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
    render({
      component: {
        optionsId: 'countries',
      },
      options: countries.options,
    });

    await userEvent.click(await screen.findByRole('combobox'));
    const options = await screen.findAllByRole('option');

    expect(options[0]).toHaveValue('norway');
    expect(options[1]).toHaveValue('sweden');
    expect(options[2]).toHaveValue('denmark');
  });

  it('should present the provided options list sorted alphabetically in ascending order when providing sortOrder "asc"', async () => {
    render({
      component: {
        optionsId: 'countries',
        sortOrder: 'asc',
      },
      options: countries.options,
    });

    await userEvent.click(await screen.findByRole('combobox'));
    const options = await screen.findAllByRole('option');

    expect(options[0]).toHaveValue('denmark');
    expect(options[1]).toHaveValue('norway');
    expect(options[2]).toHaveValue('sweden');
  });

  it('should present the provided options list sorted alphabetically in descending order when providing sortOrder "desc"', async () => {
    render({
      component: {
        optionsId: 'countries',
        sortOrder: 'desc',
      },
      options: countries.options,
    });

    await userEvent.click(await screen.findByRole('combobox'));
    const options = await screen.findAllByRole('option');

    expect(options[0]).toHaveValue('sweden');
    expect(options[1]).toHaveValue('norway');
    expect(options[2]).toHaveValue('denmark');
  });
});
