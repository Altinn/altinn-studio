import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { renderWithMockStore, renderHookWithMockStore } from '../../testing/mocks';
import { appDataMock, textResourcesMock } from '../../testing/stateMocks';
import type { IAppDataState } from '../../features/appData/appDataReducers';
import { SelectDataModelComponent } from './SelectDataModelComponent';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useDataModelMetadataQuery } from '../../hooks/queries/useDataModelMetadataQuery';
import { dataModelNameMock, layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import type { DataModelMetadataResponse } from 'app-shared/types/api';
import { app, org } from '@studio/testing/testids';

const getDataModelMetadata = () =>
  Promise.resolve<DataModelMetadataResponse>({
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

const waitForData = async () => {
  const dataModelMetadataResult = renderHookWithMockStore(
    {},
    {
      getDataModelMetadata,
    },
  )(() => useDataModelMetadataQuery(org, app, layoutSet1NameMock, dataModelNameMock))
    .renderHookResult.result;
  await waitFor(() => expect(dataModelMetadataResult.current.isSuccess).toBe(true));
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
    { getDataModelMetadata },
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
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toEqual('');
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
});
