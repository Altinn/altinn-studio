import React from 'react';
import { act, screen, within } from '@testing-library/react';
import { renderWithMockStore } from '../../../testing/mocks';
import { appDataMock, textResourcesMock } from '../../../testing/stateMocks';
import { IAppDataState } from '../../../features/appData/appDataReducers';
import { EditDataModelBindings } from './EditDataModelBindings';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';

const getDatamodelMetadata = () =>
  Promise.resolve({
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
        name: 'testModel' || 'checkmark',
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
        name: 'testModel/field1' || 'checkmark',
        parentElement: null,
        restrictions: [],
        texts: [],
        xmlSchemaXPath: '/testModel/field1',
        xPath: '/testModel/field1',
      },
    },
  });

const render = async ({
  dataModelBindings = {},
  handleComponentChange = jest.fn(),
  handleDataModelChange = jest.fn(),
} = {}) => {
  const appData: IAppDataState = {
    ...appDataMock,
    textResources: {
      ...textResourcesMock,
    },
  };

  renderWithMockStore(
    { appData },
    { getDatamodelMetadata },
    handleDataModelChange(),
  )(
    <EditDataModelBindings
      handleComponentChange={handleComponentChange}
      component={{
        id: 'someComponentId',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        dataModelBindings,
        itemType: 'COMPONENT',
      }}
      renderOptions={{
        uniqueKey: 'someComponentId-datamodel-select',
        key: 'simpleBinding',
      }}
    />,
  );
};

describe('EditDataModelBindings', () => {
  it('should show select with no selected option by default', async () => {
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    act(() => {
      linkIcon.click();
    });
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual('');
  });

  it('should show select with provided data model binding', async () => {
    await render({
      dataModelBindings: {
        simpleBinding: 'testModel.field1',
      },
    });
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    act(() => {
      linkIcon.click();
    });
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(await screen.findByText('testModel.field1')).toBeInTheDocument();
  });

  it('should render link icon', async () => {
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    expect(linkIcon).toBeInTheDocument();
  });

  it('should show dropdown when link icon is clicked', async () => {
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    act(() => {
      linkIcon.click();
    });
    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();
  });

  it('should toggle dropdown on link icon click', async () => {
    await render();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('check that handleDataModelChange is called', async () => {
    const handleDataModelChange = jest.fn();
    const dropdownVisible = jest.fn();
    await render({ handleDataModelChange });
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    dropdownVisible(true);
    const dropdown = screen.getByRole('combobox');
    const option = within(dropdown).getByText('');
    act(() => {
      option.click();
    });
    expect(handleDataModelChange).toHaveBeenCalled();
  });
});
