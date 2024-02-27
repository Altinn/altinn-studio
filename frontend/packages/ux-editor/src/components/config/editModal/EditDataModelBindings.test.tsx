import React from 'react';
import { act, screen } from '@testing-library/react';
import { renderWithMockStore } from '../../../testing/mocks';
import { appDataMock, textResourcesMock } from '../../../testing/stateMocks';
import type { IAppDataState } from '../../../features/appData/appDataReducers';
import { EditDataModelBindings } from './EditDataModelBindings';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';
import type { DatamodelMetadataResponse } from 'app-shared/types/api';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { componentMocks } from '../../../testing/componentMocks';
import type { FormItem } from '../../../types/FormItem';

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
      jsonSchemaPointer: '#/definitions/testModel/properties/field1',
      maxOccurs: 1,
      minOccurs: 1,
      name: 'testModel/field1',
      parentElement: null,
      restrictions: [],
      texts: [],
      xmlSchemaXPath: '/testModel/field1',
      xPath: '/testModel/field1',
    },
    datePickerField: {
      id: 'datePickerField',
      type: 'SimpleType',
      dataBindingName: 'datePickerField',
      displayString: 'datePickerField',
      isReadOnly: false,
      isTagContent: false,
      jsonSchemaPointer: '#/definitions/datePickerField',
      maxOccurs: 1,
      minOccurs: 1,
      name: 'datePickerField',
      parentElement: null,
      restrictions: [],
      texts: [],
      xsdValueType: 'DateTime',
      xmlSchemaXPath: 'datePickerField',
      xPath: 'datePickerField',
    },
  },
};

const getDatamodelMetadata = () => Promise.resolve(datamodelMetadata);
const defaultComponent = componentMocks[ComponentType.Input];
const defaultRenderOptions = {
  uniqueKey: 'someComponentId-datamodel-select',
  key: undefined,
  label: undefined,
};

const render = async ({
  component = defaultComponent,
  handleComponentChange = jest.fn(),
  renderOptions = defaultRenderOptions,
}: {
  component?: FormItem;
  handleComponentChange?: () => void;
  renderOptions?: { uniqueKey: string; key: string; label: string };
}) => {
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
      component={component as FormItem}
      renderOptions={renderOptions}
    />,
  );
};

describe('EditDataModelBindings', () => {
  afterEach(jest.clearAllMocks);

  it('should show select with no selected option by default', async () => {
    const user = userEvent.setup();
    await render({
      component: {
        ...defaultComponent,
        dataModelBindings: undefined,
      },
    });
    const linkIcon = screen.getByRole('button', {
      name: textMock('ux_editor.component_title.Input'),
    });
    await act(() => user.click(linkIcon));
    expect(
      await screen.findByText(textMock('ux_editor.component_title.Input')),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual('');
  });

  it('should show select with provided data model binding', async () => {
    const user = userEvent.setup();
    await render({});
    const linkIcon = screen.getByRole('button', {
      name: textMock('ux_editor.component_title.Input'),
    });
    await act(() => user.click(linkIcon));
    expect(
      await screen.findByText(textMock('ux_editor.component_title.Input')),
    ).toBeInTheDocument();
    expect(await screen.findByText('testModel.field1')).toBeInTheDocument();
  });

  it('should render link icon', async () => {
    await render({});
    const linkIcon = screen.getByRole('button', {
      name: textMock('ux_editor.component_title.Input'),
    });
    expect(linkIcon).toBeInTheDocument();
  });

  it('should show select when link icon is clicked', async () => {
    const user = userEvent.setup();
    await render({});
    const linkIcon = screen.getByRole('button', {
      name: textMock('ux_editor.component_title.Input'),
    });
    await act(() => user.click(linkIcon));
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('should toggle select on link icon click', async () => {
    const user = userEvent.setup();
    await render({});
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const linkIcon = screen.getByRole('button', {
      name: textMock('ux_editor.component_title.Input'),
    });
    await act(() => user.click(linkIcon));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('check that handleComponentChange is called', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    await render({ handleComponentChange });
    const linkIcon = screen.getByRole('button', {
      name: textMock('ux_editor.component_title.Input'),
    });
    await act(() => user.click(linkIcon));
    const option = screen.getByText('testModel');
    await act(() => user.click(option));
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataModelBindings: { simpleBinding: 'testModel' },
      maxCount: undefined,
      required: true,
      timeStamp: undefined,
    });
  });

  it('check that handleComponentChange is called with timestamp for DatePicker component', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    await render({
      handleComponentChange,
      component: { ...defaultComponent, type: ComponentType.Datepicker },
    });
    const linkIcon = screen.getByRole('button', {
      name: textMock('ux_editor.component_title.Datepicker'),
    });
    await act(() => user.click(linkIcon));
    const option = screen.getByText('datePickerField');
    await act(() => user.click(option));
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      type: ComponentType.Datepicker,
      dataModelBindings: { simpleBinding: 'datePickerField' },
      maxCount: undefined,
      required: true,
      timeStamp: true,
    });
  });

  it('should render save icon', async () => {
    const user = userEvent.setup();
    await render({});
    const linkIcon = screen.getByRole('button', {
      name: textMock('ux_editor.component_title.Input'),
    });
    await act(() => user.click(linkIcon));
    const saveButton = await screen.findByRole('button', { name: /general.save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('should render delete icon', async () => {
    const user = userEvent.setup();
    await render({});
    const linkIcon = screen.getByRole('button', {
      name: textMock('ux_editor.component_title.Input'),
    });
    await act(() => user.click(linkIcon));
    const deleteButton = await screen.findByRole('button', { name: /general.delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('show link data model again when click on save button and no data model binding is selected', async () => {
    const user = userEvent.setup();
    await render({});
    const linkIcon = screen.getByRole('button', {
      name: textMock('ux_editor.component_title.Input'),
    });
    await act(() => user.click(linkIcon));
    expect(
      await screen.findByText(textMock('ux_editor.component_title.Input')),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual('');

    const saveButton = await screen.findByRole('button', { name: /general.save/i });
    await act(() => user.click(saveButton));

    expect(
      screen.getByRole('button', { name: textMock('ux_editor.component_title.Input') }),
    ).toBeInTheDocument();
  });

  it('deletes existing data model link', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    const dataModelBindingKey = 'testModel.field1';

    await render({
      handleComponentChange,
      component: {
        ...defaultComponent,
        dataModelBindings: {
          simpleBinding: dataModelBindingKey,
        },
      },
    });

    const datamodelText = screen.getByText(dataModelBindingKey);
    expect(datamodelText).toBeInTheDocument();

    await act(() => user.hover(datamodelText));

    const editIcon = screen.getByRole('button', { name: textMock('general.edit') });
    await act(() => user.click(editIcon));

    expect(await screen.findByText(dataModelBindingKey)).toBeInTheDocument();
    const deleteButton = await screen.findByRole('button', { name: /general.delete/i });
    await act(() => user.click(deleteButton));
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataModelBindings: { simpleBinding: '' },
      required: false,
      timeStamp: undefined,
    });
  });

  it('shows edit form', async () => {
    const user = userEvent.setup();
    const dataModelBindingKey = 'testModel.field1';
    await render({
      component: {
        ...defaultComponent,
        dataModelBindings: { simpleBinding: dataModelBindingKey },
      },
    });

    const datamodelText = screen.getByText(dataModelBindingKey);
    expect(datamodelText).toBeInTheDocument();

    await act(() => user.hover(datamodelText));

    const editIcon = screen.getByRole('button', { name: textMock('general.edit') });
    await act(() => user.click(editIcon));

    expect(screen.getByText(textMock('ux_editor.component_title.Input'))).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual(dataModelBindingKey);
  });

  it('should call "handleComponentUpdate" with maxCount when dataModelBinding is clicked for RepeatingGroup', async () => {
    const user = userEvent.setup();
    const mockHandleComponentUpdate = jest.fn();
    const dataBindingNameMock = 'element';
    const maxCountMock = 2;
    queryClientMock.setQueryData(
      [QueryKey.DatamodelMetadata, 'org', 'app'],
      [{ dataBindingName: dataBindingNameMock, maxOccurs: maxCountMock }],
    );
    await render({
      component: componentMocks[ComponentType.RepeatingGroup],
      handleComponentChange: mockHandleComponentUpdate,
      renderOptions: {
        uniqueKey: 'some-key',
        key: 'group',
        label: 'group',
      },
    });

    const dataModelBinding = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_data_model_label.group'),
    });
    await act(() => user.click(dataModelBinding));
    const dataModelBindingSelector = screen.getByRole('combobox', {
      name: textMock(`ux_editor.modal_properties_data_model_label.group`),
    });
    await act(() => user.click(dataModelBindingSelector));
    const dataModelOption = screen.getByRole('option', { name: dataBindingNameMock });
    await act(() => user.click(dataModelOption));

    expect(mockHandleComponentUpdate).toHaveBeenCalled();
    expect(mockHandleComponentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        ...componentMocks[ComponentType.RepeatingGroup],
        maxCount: maxCountMock,
        dataModelBindings: { group: dataBindingNameMock },
      }),
    );
  });

  it('show right data model when switching component', async () => {
    const { renderResult } = await render({
      component: {
        ...defaultComponent,
        dataModelBindings: { simpleBinding: 'testModel.field1' },
      },
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
