import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithMockStore } from '../../../testing/mocks';
import { appDataMock, textResourcesMock } from '../../../testing/stateMocks';
import type { IAppDataState } from '../../../features/appData/appDataReducers';
import { EditDataModelBindings } from './EditDataModelBindings';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import userEvent from '@testing-library/user-event';
import type { DataModelMetadataResponse } from 'app-shared/types/api';
import { layoutSet1NameMock } from '../../../testing/layoutSetsMock';

const defaultDataModel = 'testModel';
const dataModelMetadata: DataModelMetadataResponse = {
  elements: {
    [defaultDataModel]: {
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

const getDataModelMetadata = () => Promise.resolve(dataModelMetadata);
const getLayoutSets = () =>
  Promise.resolve({
    sets: [{ id: layoutSet1NameMock, dataType: defaultDataModel }],
  });

const render = async ({ dataModelBindings = {}, handleComponentChange = jest.fn() } = {}) => {
  const appData: IAppDataState = {
    ...appDataMock,
    textResources: {
      ...textResourcesMock,
    },
  };

  return renderWithMockStore(
    { appData },
    { getDataModelMetadata, getLayoutSets },
  )(
    <EditDataModelBindings
      handleComponentChange={handleComponentChange}
      component={{
        id: 'someComponentId',
        type: ComponentTypeV3.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        dataModelBindings,
        itemType: 'COMPONENT',
      }}
      renderOptions={{
        uniqueKey: 'someComponentId-data-model-select',
        key: 'simpleBinding',
      }}
    />,
  );
};

describe('EditDataModelBindings', () => {
  afterEach(jest.clearAllMocks);

  it('should show select with no selected option by default', async () => {
    const user = userEvent.setup();
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    await user.click(linkIcon);
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toEqual('');
  });

  it('should show select with provided data model binding', async () => {
    const user = userEvent.setup();
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    await user.click(linkIcon);
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
    const user = userEvent.setup();
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    await user.click(linkIcon);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('should toggle select on link icon click', async () => {
    const user = userEvent.setup();
    await render();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    await user.click(linkIcon);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('check that handleComponentChange is called', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    await render({ handleComponentChange });
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    await user.click(linkIcon);
    const option = screen.getByText('testModel');
    await user.selectOptions(screen.getByRole('combobox'), option);
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
    const user = userEvent.setup();
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    await user.click(linkIcon);
    const saveButton = await screen.findByRole('button', { name: /general.save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('should render delete icon', async () => {
    const user = userEvent.setup();
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    await user.click(linkIcon);
    const deleteButton = await screen.findByRole('button', { name: /general.delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('show link data model again when click on save button and no data model binding is selected', async () => {
    const user = userEvent.setup();
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    await user.click(linkIcon);
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toEqual('');

    const saveButton = await screen.findByRole('button', { name: /general.save/i });
    await user.click(saveButton);

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_data_model_link')),
    ).toBeInTheDocument();
  });

  it('deletes existing data model link', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    const dataModelBindingKey = 'testModel.field1';

    await render({
      handleComponentChange,
      dataModelBindings: { simpleBinding: dataModelBindingKey },
    });

    const dataModelText = screen.getByText(dataModelBindingKey);
    expect(dataModelText).toBeInTheDocument();

    await user.hover(dataModelText);

    const editIcon = screen.getByRole('button', { name: textMock('general.edit') });
    fireEvent.click(editIcon);

    expect(await screen.findByText(dataModelBindingKey)).toBeInTheDocument();
    const deleteButton = await screen.findByRole('button', { name: /general.delete/i });
    await user.click(deleteButton);
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
    const user = userEvent.setup();
    const dataModelBindingKey = 'testModel.field1';
    await render({
      dataModelBindings: { simpleBinding: dataModelBindingKey },
    });

    const dataModelText = screen.getByText(dataModelBindingKey);
    expect(dataModelText).toBeInTheDocument();

    user.hover(dataModelText);

    const editIcon = await screen.findByRole('button', { name: textMock('general.edit') });
    expect(editIcon).toBeInTheDocument();

    fireEvent.click(editIcon);
    const helperText = screen.queryByText(textMock('ux_editor.modal_properties_data_model_helper'));
    expect(helperText).toBeInTheDocument();

    const combobox = screen.getByRole<HTMLSelectElement>('combobox');
    expect(combobox.value).toEqual(dataModelBindingKey);
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
          type: ComponentTypeV3.Input,
          dataModelBindings: { simpleBinding: 'testModel.field2' },
          itemType: 'COMPONENT',
        }}
      />,
    );

    expect(await screen.findByText('testModel.field2')).toBeInTheDocument();
  });
});
