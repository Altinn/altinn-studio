import React from 'react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../../testing/mocks';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { DataModelMainConfig } from './DataModelMainConfig';
import { component1Mock } from '@altinn/ux-editor/testing/layoutMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { dataModelMetadataResponseMock } from '@altinn/ux-editor/testing/dataModelMock';
import { FormItemContext } from '@altinn/ux-editor/containers/FormItemContext';
import { formItemContextProviderMock } from '@altinn/ux-editor/testing/formItemContextMocks';

const mockHandleComponentUpdate = jest.fn();

describe('DataModelMainConfig', () => {
  afterEach(() => jest.clearAllMocks());

  it('return null if the schema of component does not have data model binding prop', () => {
    renderDataModelMainConfig({});
    const wrapper = screen.getByTestId('component-wrapper');
    expect(wrapper).toBeEmptyDOMElement();
  });

  it('renders when dataModelBindings is defined', async () => {
    renderDataModelMainConfig({
      component: component1Mock,
      dataModelBindings: { simpleBinding: 'dataModelBinding' },
    });

    const dataModelButton = await screen.findByRole('button');
    expect(dataModelButton).toBeInTheDocument();
  });

  it('updates data model binding when deleting the binding', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderDataModelMainConfig({
      component: component1Mock,
      dataModelBindings: { simpleBinding: 'dataModelBinding' },
    });

    const dataModelButton = await screen.findByRole('button');
    await user.click(dataModelButton);

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(deleteButton);

    expect(mockHandleComponentUpdate).toHaveBeenCalledWith({
      ...component1Mock,
      dataModelBindings: { simpleBinding: '' },
    });
  });
});

const renderDataModelMainConfig = ({
  component = component1Mock,
  dataModelBindings = undefined,
}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppMetadata, org, app], {
    dataTypes: [dataModelMetadataResponseMock.elements],
  });

  return renderWithProviders(
    <div data-testid='component-wrapper'>
      <FormItemContext.Provider value={formItemContextProviderMock}>
        <DataModelMainConfig
          component={component1Mock}
          dataModelBindings={dataModelBindings}
          handleComponentChange={mockHandleComponentUpdate}
        />
      </FormItemContext.Provider>
    </div>,
    { queryClient },
  );
};
