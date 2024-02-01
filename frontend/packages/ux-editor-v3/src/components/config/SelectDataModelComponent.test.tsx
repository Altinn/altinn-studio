import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';

import { renderWithMockStore, renderHookWithMockStore } from '../../testing/mocks';
import { appDataMock, textResourcesMock } from '../../testing/stateMocks';
import type { IAppDataState } from '../../features/appData/appDataReducers';
import { SelectDataModelComponent } from './SelectDataModelComponent';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { useDatamodelMetadataQuery } from '../../hooks/queries/useDatamodelMetadataQuery';
import userEvent from '@testing-library/user-event';
import type { DatamodelMetadataResponse } from 'app-shared/types/api';

const getDatamodelMetadata = () =>
  Promise.resolve<DatamodelMetadataResponse>({
    elements: {
      testModel: {
        id: 'testModel',
        type: 'ComplexType',
        dataBindingName: 'testModel',
        displayString: 'testModel',
        isReadOnly: false,
        isTagContent: false,
        jsonSchemaPointer: '#/definitions/testModel',
        maxOccurs: 1,
        minOccurs: 1,
        name: 'testModel',
        parentElement: null,
        restrictions: [],
        texts: [],
        xmlSchemaXPath: '/testModel',
        xPath: '/testModel',
      },
      'testModel.field1': {
        id: 'testModel.field1',
        type: 'SimpleType',
        dataBindingName: 'testModel.field1',
        displayString: 'testModel.field1',
        isReadOnly: false,
        isTagContent: false,
        jsonSchemaPointer: '#/definitions/testModel/properteis/field1',
        maxOccurs: 1,
        minOccurs: 1,
        name: 'testModel/field1',
        parentElement: null,
        restrictions: [],
        texts: [],
        xmlSchemaXPath: '/testModel/field1',
        xPath: '/testModel/field1',
      },
    },
  });

const user = userEvent.setup();

const waitForData = async () => {
  const datamodelMetadatResult = renderHookWithMockStore(
    {},
    {
      getDatamodelMetadata,
    },
  )(() => useDatamodelMetadataQuery('test-org', 'test-app')).renderHookResult.result;
  await waitFor(() => expect(datamodelMetadatResult.current.isSuccess).toBe(true));
};

const render = async ({ dataModelBindings = {}, handleComponentChange = jest.fn() } = {}) => {
  const appData: IAppDataState = {
    ...appDataMock,
    textResources: {
      ...textResourcesMock,
    },
  };

  await waitForData();

  renderWithMockStore(
    { appData },
    { getDatamodelMetadata },
  )(
    <SelectDataModelComponent
      label={textMock('ux_editor.modal_properties_data_model_helper')}
      onDataModelChange={handleComponentChange}
      selectedElement={undefined}
    />,
  );
};

describe('EditDataModelBindings', () => {
  it('should show select with no selected option by default', async () => {
    await render();
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual('');
  });

  it('should show select with provided value', async () => {
    await render({
      dataModelBindings: {
        simpleBinding: 'testModel.field1',
      },
    });
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(await screen.findByText('testModel.field1')).toBeInTheDocument();
  });

  it('should call onChange when a new option is selected', async () => {
    const handleComponentChange = jest.fn();
    await render({
      dataModelBindings: {
        simpleBinding: 'testModel.field1',
      },
      handleComponentChange,
    });
    const selectElement = screen.getByRole('combobox');
    await act(async () => {
      await user.click(selectElement);
      await user.click(screen.getByText('testModel.field1'));
    });
    await waitFor(() => {});
    expect(handleComponentChange).toHaveBeenCalledWith('testModel.field1');
  });
});
