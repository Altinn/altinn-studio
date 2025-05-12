import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataModelBindings } from './DataModelBindings';
import { FormItemContext } from '../../../containers/FormItemContext';
import { formItemContextProviderMock } from '../../../testing/formItemContextMocks';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { componentSchemaMocks } from '../../../testing/componentSchemaMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../types/FormItem';
import { componentMocks } from '../../../testing/componentMocks';
import { component3IdMock, component3Mock, layoutMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';
import type { DataModelMetadataResponse } from 'app-shared/types/api';

const defaultModel = 'testModelField';

const defaultDataModel = 'testModel';
const secondDataModel = 'secondDataModel';
const dataModelMetadata: DataModelMetadataResponse = {
  elements: {
    [defaultDataModel]: {
      id: defaultModel,
      type: 'ComplexType',
      dataBindingName: defaultModel,
      displayString: defaultModel,
      isReadOnly: false,
      isTagContent: false,
      jsonSchemaPointer: '#/definitions/testModel',
      maxOccurs: 1,
      minOccurs: 1,
      name: defaultModel,
      parentElement: null,
      restrictions: [],
      texts: [],
      xmlSchemaXPath: '/testModel',
      xPath: '/testModel',
    },
  },
};

const getDataModelMetadata = () => Promise.resolve(dataModelMetadata);

describe('DataModelBindings', () => {
  afterEach(jest.clearAllMocks);

  it('renders EditDataModelBindings component when schema is present', () => {
    render();

    const dataModelButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_title.Input`),
    });
    expect(dataModelButton).toBeInTheDocument();
  });

  it('does not render EditDataModelBindings component when schema.properties is undefined', () => {
    const unknownComponent: FormItem = {
      id: 'unknownComponentId',
      type: 'unknown' as any,
      itemType: 'COMPONENT',
      propertyPath: 'definitions/unknownComponent',
    };
    render({ props: { formItem: unknownComponent, formItemId: 'unknownComponentId' } });

    const spinner = screen.getByText(textMock('general.loading'));
    expect(spinner).toBeInTheDocument();
  });

  it('should render alert component with information when component does not have any data model bindings to set', () => {
    render({
      props: {
        formItem: componentMocks[ComponentType.Image],
        formItemId: componentMocks[ComponentType.Image].id,
      },
    });

    const noDataModelBindingsAlert = screen.getByText(
      textMock('ux_editor.modal_properties_data_model_binding_not_present'),
    );
    expect(noDataModelBindingsAlert).toBeInTheDocument();
  });

  it('should render alert component with information when attachment component exist inside a repeating group component', () => {
    render({
      props: {
        formItem: component3Mock,
        formItemId: component3IdMock,
      },
    });

    const attachmentComponentInsideRepGroupAlert = screen.getByText(
      textMock('ux_editor.modal_properties_data_model_restrictions_attachment_components'),
    );
    expect(attachmentComponentInsideRepGroupAlert).toBeInTheDocument();
  });

  const { dataModelBindings } = componentSchemaMocks[ComponentType.Address].properties;
  it.each(Object.keys(dataModelBindings?.properties))(
    'should render data model binding with label for prop, %s, on AddressComponent',
    (prop) => {
      render({
        props: {
          formItem: {
            ...componentMocks[ComponentType.Address],
            dataModelBindings: { address: '', zipCode: '', postPlace: '' },
          },
          formItemId: componentMocks[ComponentType.Address].id,
        },
      });

      const dataModelButton = screen.getByRole('button', {
        name: textMock(`ux_editor.modal_properties_data_model_label.${prop}`),
      });
      expect(dataModelButton).toBeInTheDocument();
    },
  );

  it('should render already existing bindings in previewMode with label', async () => {
    render({
      props: {
        formItem: {
          ...componentMocks[ComponentType.Address],
          dataModelBindings: {
            address: 'someAddressDataModelField',
            postPlace: '',
            zipCode: '',
            careOf: 'someCareOfDataModelField',
          },
        },
        formItemId: componentMocks[ComponentType.Address].id,
      },
    });

    await waitForElementToBeRemoved(() =>
      screen.queryAllByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    ['address', 'careOf'].forEach((prop) => {
      const dataModelButton = screen.getByText(
        textMock(`ux_editor.modal_properties_data_model_label.${prop}`),
      );
      expect(dataModelButton).toBeInTheDocument();
    });

    ['zipCode', 'postPlace', 'houseNumber'].forEach((prop) => {
      const dataModelButton = screen.getByRole('button', {
        name: textMock(`ux_editor.modal_properties_data_model_label.${prop}`),
      });
      expect(dataModelButton).toBeInTheDocument();
    });
  });

  it('should render multiple attachment switch when component is FileUpload', () => {
    render({
      props: {
        formItem: componentMocks[ComponentType.FileUpload],
        formItemId: componentMocks[ComponentType.FileUpload].id,
      },
    });

    const switchElement = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_data_model_link_multiple_attachments'),
    });
    expect(switchElement).toBeInTheDocument();
  });

  it('should render multiple attachment switch when component is FileUploadWithTag', () => {
    render({
      props: {
        formItem: componentMocks[ComponentType.FileUploadWithTag],
        formItemId: componentMocks[ComponentType.FileUploadWithTag].id,
      },
    });

    const switchElement = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_data_model_link_multiple_attachments'),
    });
    expect(switchElement).toBeInTheDocument();
  });

  it('should render multiple attachment switch as selected when list dataModelBinding is present', () => {
    render({
      props: {
        formItem: {
          ...componentMocks[ComponentType.FileUpload],
          dataModelBindings: { list: 'someListDataModelField' },
        },
        formItemId: componentMocks[ComponentType.FileUpload].id,
      },
    });

    const switchElement = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_data_model_link_multiple_attachments'),
    });
    expect(switchElement).toBeChecked();
  });

  it('should render multiple attachment switch as not selected when simpleBinding dataModelBinding is present', () => {
    render({
      props: {
        formItem: {
          ...componentMocks[ComponentType.FileUpload],
          dataModelBindings: { simpleBinding: 'someSimpleDataModelField' },
        },
        formItemId: componentMocks[ComponentType.FileUpload].id,
      },
    });

    const switchElement = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_data_model_link_multiple_attachments'),
    });
    expect(switchElement).not.toBeChecked();
  });

  it('should toggle multiple attachment switch when clicked', async () => {
    const user = userEvent.setup();
    render({
      props: {
        formItem: componentMocks[ComponentType.FileUpload],
        formItemId: componentMocks[ComponentType.FileUpload].id,
      },
    });

    const switchElement = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_data_model_link_multiple_attachments'),
    });
    expect(switchElement).not.toBeChecked();
    await user.click(switchElement);
    expect(switchElement).toBeChecked();
  });

  it('toggling ON multiple attachment switch should call handleUpdate with expected values', async () => {
    const user = userEvent.setup();
    const handleUpdate = jest.fn();
    render({
      props: {
        formItem: componentMocks[ComponentType.FileUpload],
        formItemId: componentMocks[ComponentType.FileUpload].id,
        handleUpdate,
      },
    });

    const switchElement = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_data_model_link_multiple_attachments'),
    });
    await user.click(switchElement);
    expect(handleUpdate).toHaveBeenCalledTimes(1);
    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentMocks[ComponentType.FileUpload],
      dataModelBindings: { list: '', simpleBinding: undefined },
    });
  });

  it('toggling OFF multiple attachment switch should call handleUpdate with expected values', async () => {
    const user = userEvent.setup();
    const handleUpdate = jest.fn();
    render({
      props: {
        formItem: {
          ...componentMocks[ComponentType.FileUpload],
          dataModelBindings: { list: 'someListDataModelField' },
        },
        formItemId: componentMocks[ComponentType.FileUpload].id,
        handleUpdate,
      },
    });

    const switchElement = screen.getByRole('checkbox', {
      name: textMock('ux_editor.modal_properties_data_model_link_multiple_attachments'),
    });
    await user.click(switchElement);
    expect(handleUpdate).toHaveBeenCalledTimes(1);
    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentMocks[ComponentType.FileUpload],
      dataModelBindings: { list: undefined, simpleBinding: '' },
    });
  });

  it('checks that handleComponentChange is called', async () => {
    const user = userEvent.setup();

    render();

    const dataModelButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_title.Input`),
    });
    await user.click(dataModelButton);

    const dataModelFieldSelector = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_field_binding'),
    });
    const option = screen.getByRole('option', { name: defaultModel });
    await user.selectOptions(dataModelFieldSelector, option);

    expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalledTimes(1);
    expect(formItemContextProviderMock.debounceSave).toHaveBeenCalledTimes(1);
  });
});

const defaultProps = {
  formItemId: componentMocks[ComponentType.Input].id,
  formItem: componentMocks[ComponentType.Input],
};

const render = async ({
  props = defaultProps,
}: {
  props?: Partial<FormItemContext>;
} = {}) => {
  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSet1NameMock], {
    default: layoutMock,
  });
  queryClientMock.setQueryData(
    [QueryKey.FormComponent, props.formItem.type],
    componentSchemaMocks[props.formItem.type],
  );
  queryClientMock.setQueryData([QueryKey.LayoutSets, org, app], {
    sets: [{ id: layoutSet1NameMock, dataType: defaultDataModel }],
  });
  queryClientMock.setQueryData([QueryKey.AppMetadata, org, app], {
    dataTypes: [
      { id: defaultDataModel, maxCount: 1, appLogic: {} },
      { id: secondDataModel, maxCount: 1, appLogic: {} },
    ],
  });
  return renderWithProviders(
    <FormItemContext.Provider
      value={{
        ...formItemContextProviderMock,
        ...props,
      }}
    >
      <DataModelBindings />
    </FormItemContext.Provider>,
    {
      appContextProps: {
        selectedFormLayoutName: 'default',
      },
      queries: { getDataModelMetadata },
    },
  );
};
