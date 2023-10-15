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
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
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

  it('should show select when link icon is clicked', async () => {
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    act(() => {
      linkIcon.click();
    });
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('should toggle select on link icon click', async () => {
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
    const dataModelSelectVisible = jest.fn();
    await render({ handleDataModelChange });
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    dataModelSelectVisible(true);
    const select = screen.getByRole('combobox');
    const option = within(select).getByText('');
    act(() => {
      option.click();
    });
    expect(handleDataModelChange).toHaveBeenCalled();
  });

  it('should render save icon', async () => {
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    const saveButton = await screen.findByRole('button', { name: /general.save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('should render delete icon', async () => {
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    const deleteButton = await screen.findByRole('button', { name: /general.delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('show link data model again when clcik on save button and no data model binding is selected', async () => {
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual('');

    const saveButton = await screen.findByRole('button', { name: /general.save/i });
    act(() => {
      saveButton.click();
    });

    expect(screen.getByText(/ux_editor.modal_properties_data_model_link/i)).toBeInTheDocument();
  });
});
