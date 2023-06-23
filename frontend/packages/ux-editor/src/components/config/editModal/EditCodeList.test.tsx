import React from 'react';
import { EditCodeList } from './EditCodeList';
import { screen } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { renderWithMockStore } from '../../../testing/mocks';

describe('EditCodeList', () => {
  it('should render the component', async () => {
    render();
    expect(await screen.findByText('Bytt til egendefinert kodeliste')).toBeInTheDocument();
  });

  it('should render the component when optionListIds is undefined', async () => {
    render({
      queries: { getOptionListIds: jest.fn().mockImplementation(() => Promise.resolve(undefined)) },
    });

    expect(await screen.findByText('Bytt til egendefinert kodeliste')).toBeInTheDocument();
  });
});

const render = ({ handleComponentChange = jest.fn(), queries = {} } = {}) => {
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
