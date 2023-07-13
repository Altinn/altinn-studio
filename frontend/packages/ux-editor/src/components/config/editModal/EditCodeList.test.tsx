import React from 'react';
import { EditCodeList } from './EditCodeList';
import { screen, waitFor } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { renderWithMockStore, renderHookWithMockStore } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';

describe('EditCodeList', () => {
  it('should render the component', async () => {
    await render();
    expect(await screen.findByText('Bytt til egendefinert kodeliste')).toBeInTheDocument();
  });

  it('should render the component when optionListIds is undefined', async () => {
    await render({
      queries: { getOptionListIds: jest.fn().mockImplementation(() => Promise.resolve(undefined)) },
    });

    expect(await screen.findByText('Bytt til egendefinert kodeliste')).toBeInTheDocument();
  });
});

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery()).renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async ({ handleComponentChange = jest.fn(), queries = {} } = {}) => {
  await waitForData();

  renderWithMockStore(
    {},
    queries
  )(
    <EditCodeList
      handleComponentChange={handleComponentChange}
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentType.Dropdown,
        textResourceBindings: {
          title: 'ServiceName',
        },
        itemType: 'COMPONENT',
        dataModelBindings: {},
        optionsId: '',
      }}
    />
  );
};
