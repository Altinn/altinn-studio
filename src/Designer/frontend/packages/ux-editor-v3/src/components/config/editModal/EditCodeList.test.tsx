import React from 'react';
import { EditCodeList } from './EditCodeList';
import { screen, waitFor } from '@testing-library/react';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import {
  renderWithMockStore,
  renderHookWithMockStore,
  optionListIdsMock,
} from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import userEvent from '@testing-library/user-event';

describe('EditCodeList', () => {
  it('should render the component', async () => {
    await render({
      queries: {
        getOptionListIds: jest
          .fn()
          .mockImplementation(() => Promise.resolve<string[]>(optionListIdsMock)),
      },
    });
    expect(await screen.findByText('Bytt til egendefinert kodeliste')).toBeInTheDocument();
  });

  it('should render the component when optionListIds is undefined', async () => {
    await render({
      queries: {
        getOptionListIds: jest
          .fn()
          .mockImplementation(() => Promise.resolve<string[]>(optionListIdsMock)),
      },
    });

    expect(await screen.findByText('Bytt til egendefinert kodeliste')).toBeInTheDocument();
  });

  it('should call onChange when option list changes', async () => {
    const handleComponentChangeMock = jest.fn();
    const user = userEvent.setup();
    await render({ handleComponentChange: handleComponentChangeMock });

    await waitFor(() => screen.findByRole('combobox'));

    await user.selectOptions(screen.getByRole('combobox'), 'test-1');
    await waitFor(() => expect(handleComponentChangeMock).toHaveBeenCalled());
  });

  it('should render the selected option list item upon component initialization', async () => {
    await render({
      componentProps: {
        optionsId: 'test-2',
      },
    });

    expect(screen.getByRole('combobox')).toHaveValue('test-2');
  });
});

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async ({
  handleComponentChange = jest.fn(),
  queries = {},
  componentProps = {},
} = {}) => {
  await waitForData();

  renderWithMockStore(
    {},
    queries,
  )(
    <EditCodeList
      handleComponentChange={handleComponentChange}
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentTypeV3.Dropdown,
        textResourceBindings: {
          title: 'ServiceName',
        },
        itemType: 'COMPONENT',
        dataModelBindings: {},
        optionsId: '',
        ...componentProps,
      }}
    />,
  );
};
