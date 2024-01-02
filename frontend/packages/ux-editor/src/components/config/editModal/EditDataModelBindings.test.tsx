import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithMockStore } from '../../../testing/mocks';
import { appDataMock, textResourcesMock } from '../../../testing/stateMocks';
import { IAppDataState } from '../../../features/appData/appDataReducers';
import { EditDataModelBindings } from './EditDataModelBindings';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';
import { DatamodelMetadataResponse } from 'app-shared/types/api';

const datamodelMetadata: DatamodelMetadataResponse = {
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
};

const getDatamodelMetadata = () => Promise.resolve(datamodelMetadata);

const render = async ({ dataModelBindings = {}, handleComponentChange = jest.fn() } = {}) => {
  const appData: IAppDataState = {
    ...appDataMock,
    textResources: {
      ...textResourcesMock,
    },
  };

  return renderWithMockStore(
    { appData },
    { getDatamodelMetadata },
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
    await waitFor(async () => {
      await userEvent.click(linkIcon);
    });
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual('');
  });

  it('should show select with provided data model binding', async () => {
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    await waitFor(async () => {
      await userEvent.click(linkIcon);
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
    await waitFor(async () => {
      await userEvent.click(linkIcon);
    });
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('should toggle select on link icon click', async () => {
    await render();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    await waitFor(async () => {
      await userEvent.click(linkIcon);
    });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('check that handleDataModelChange is called', async () => {
    const handleComponentChange = jest.fn();
    await render({ handleComponentChange });
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    await waitFor(async () => {
      await userEvent.click(linkIcon);
    });
    const select = screen.getByRole('combobox');
    await waitFor(async () => await userEvent.click(select));
    await waitFor(async () => {
      await userEvent.click(
        screen.getByRole('option', {
          name: datamodelMetadata.elements.testModel.dataBindingName,
        }),
      );
    });
    expect(handleComponentChange).toHaveBeenCalledWith({
      dataModelBindings: { simpleBinding: 'testModel' },
      id: 'someComponentId',
      itemType: 'COMPONENT',
      required: true,
      textResourceBindings: { title: 'ServiceName' },
      timeStamp: undefined,
      type: 'Input',
    });
  });

  it('should render save icon', async () => {
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    await waitFor(async () => {
      await userEvent.click(linkIcon);
    });
    const saveButton = await screen.findByRole('button', { name: /general.save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('should render delete icon', async () => {
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    await waitFor(async () => {
      await userEvent.click(linkIcon);
    });
    const deleteButton = await screen.findByRole('button', { name: /general.delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('show link data model again when click on save button and no data model binding is selected', async () => {
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    await waitFor(async () => {
      await userEvent.click(linkIcon);
    });
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual('');

    const saveButton = await screen.findByRole('button', { name: /general.save/i });
    await waitFor(async () => {
      await userEvent.click(saveButton);
    });

    expect(screen.getByText(/ux_editor.modal_properties_data_model_link/i)).toBeInTheDocument();
  });

  it('deletes existing data model link', async () => {
    const handleComponentChange = jest.fn();
    const dataModelBindingKey = 'testModel.field1';

    await render({
      handleComponentChange,
      dataModelBindings: { simpleBinding: dataModelBindingKey },
    });

    const datamodelText = screen.getByText(dataModelBindingKey);
    expect(datamodelText).toBeInTheDocument();

    await waitFor(async () => {
      await userEvent.hover(datamodelText);
    });

    const editIcon = screen.getByRole('button', { name: textMock('general.edit') });
    await waitFor(async () => {
      await userEvent.click(editIcon);
    });

    expect(await screen.findByText(dataModelBindingKey)).toBeInTheDocument();
    const deleteButton = await screen.findByRole('button', { name: /general.delete/i });
    await waitFor(async () => {
      await userEvent.click(deleteButton);
    });
    expect(handleComponentChange).toHaveBeenCalledWith({
      dataModelBindings: { simpleBinding: '' },
      id: 'someComponentId',
      itemType: 'COMPONENT',
      required: false,
      textResourceBindings: { title: 'ServiceName' },
      timeStamp: undefined,
      type: 'Input',
    });
  });

  it('shows edit form', async () => {
    const dataModelBindingKey = 'testModel.field1';
    await render({
      dataModelBindings: { simpleBinding: dataModelBindingKey },
    });

    const datamodelText = screen.getByText(dataModelBindingKey);
    expect(datamodelText).toBeInTheDocument();

    await waitFor(async () => {
      await userEvent.hover(datamodelText);
    });

    const editIcon = screen.getByRole('button', { name: textMock('general.edit') });
    await waitFor(async () => {
      await userEvent.click(editIcon);
    });

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual(dataModelBindingKey);
  });

  it('show right data model when switching component', async () => {
    const { renderResult } = await render({
      dataModelBindings: { simpleBinding: 'testModel.field1' },
    });
    expect(await screen.findByText('testModel.field1')).toBeInTheDocument();
    renderResult.rerender(
      <EditDataModelBindings
        handleComponentChange={jest.fn()}
        component={{
          id: 'someComponentId',
          type: ComponentType.Input,
          dataModelBindings: { simpleBinding: 'testModel.field2' },
          itemType: 'COMPONENT',
        }}
      />,
    );
    expect(await screen.findByText('testModel.field2')).toBeInTheDocument();
  });
});
