import React from 'react';
import { dataModelMetadataResponseMock } from '@altinn/ux-editor/testing/dataModelMock';
import { EditBinding, type EditBindingProps } from './EditBinding';
import { renderWithProviders } from '../../../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { layoutSet1NameMock } from '../../../../../testing/layoutSetsMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { ExplicitDataModelBinding } from '@altinn/ux-editor/types/global';
import { convertDataBindingToInternalFormat } from '@altinn/ux-editor/utils/dataModelUtils';

const defaultLabel = 'label';
const defaultBindingKey = 'simpleBinding';
const defaultDataModelField = 'field1';
const secondDataModelField = 'field2';
const defaultDataModel = 'defaultModel';
const secondDataModel = 'secondModel';

const defaultEditBinding: EditBindingProps = {
  bindingKey: defaultBindingKey,
  component: componentMocks[ComponentType.Input],
  label: defaultLabel,
  handleComponentChange: jest.fn(),
  onSetDataModelSelectVisible: jest.fn(),
  internalBindingFormat: {
    field: defaultDataModelField,
    dataType: defaultDataModel,
  },
};

type MockedParentComponentProps = EditBindingProps;

const MockedParentComponent = (props: MockedParentComponentProps) => {
  const [newInternalBindingFormat, setNewInternalBindingFormat] =
    React.useState<ExplicitDataModelBinding>(props.internalBindingFormat);

  return (
    <EditBinding
      {...props}
      handleComponentChange={(formItem) => {
        const { field } = convertDataBindingToInternalFormat(
          props.component.dataModelBindings[props.bindingKey],
        );
        setNewInternalBindingFormat((prev) => ({
          ...prev,
          field,
        }));
      }}
      internalBindingFormat={newInternalBindingFormat}
    />
  );
};

type RenderEditBinding = {
  editBindingProps?: EditBindingProps;
  queryClient?: ReturnType<typeof createQueryClientMock>;
  queries?: Partial<ServicesContextProps>;
  shouldRenderWithMockedParent?: boolean;
};

const renderEditBinding = ({
  editBindingProps = defaultEditBinding,
  queryClient = createQueryClientMock(),
  queries,
  shouldRenderWithMockedParent = false,
}: RenderEditBinding) => {
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], {
    sets: [{ id: layoutSet1NameMock, dataType: defaultDataModel }],
  });
  queryClient.setQueryData([QueryKey.AppMetadata, org, app], {
    dataTypes: [
      { id: defaultDataModel, maxCount: 1, appLogic: {} },
      { id: secondDataModel, maxCount: 1, appLogic: {} },
    ],
  });
  return {
    ...renderWithProviders(
      shouldRenderWithMockedParent ? (
        <MockedParentComponent {...editBindingProps} />
      ) : (
        <EditBinding {...editBindingProps} />
      ),
      {
        queries: { ...queries },
        queryClient,
      },
    ),
  };
};

const getAppMetadataModelIdsMock = jest
  .fn()
  .mockImplementation(() => Promise.resolve([defaultDataModel, secondDataModel]));
const getDataModelMetadataMock = jest
  .fn()
  .mockImplementation(() => Promise.resolve(dataModelMetadataResponseMock));

describe('EditBinding', () => {
  it('should render loading spinner', async () => {
    renderEditBinding({});

    const loadingSpinnerTitle = textMock('ux_editor.modal_properties_loading');

    const loadingSpinner = screen.getByTitle(loadingSpinnerTitle);
    expect(loadingSpinner).toBeInTheDocument();

    await waitForElementToBeRemoved(() => screen.queryByTitle(loadingSpinnerTitle));
  });

  it('should render field set', async () => {
    renderEditBinding({});

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const fieldSet = screen.getByRole('group', { name: defaultEditBinding.label });
    expect(fieldSet).toBeInTheDocument();
  });

  it('should display two selectors: data model and a data model field', async () => {
    renderEditBinding({
      queries: {
        getAppMetadataModelIds: getAppMetadataModelIdsMock,
        getDataModelMetadata: getDataModelMetadataMock,
      },
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const dataModelSelector = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_binding'),
    });
    expect(dataModelSelector).toBeInTheDocument();

    const dataModelFieldSelector = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_field_binding'),
    });
    expect(dataModelFieldSelector).toBeInTheDocument();
  });

  it('should display default data model and "choose datafield" when no bindings', async () => {
    renderEditBinding({
      editBindingProps: {
        ...defaultEditBinding,
        internalBindingFormat: {
          field: '',
          dataType: undefined,
        },
      },
      queries: {
        getAppMetadataModelIds: getAppMetadataModelIdsMock,
        getDataModelMetadata: getDataModelMetadataMock,
      },
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const dataModelSelector = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_binding'),
    });
    expect(dataModelSelector).toHaveValue(defaultDataModel);

    const chooseDataFieldOption: HTMLOptionElement = screen.getByRole('option', {
      name: textMock('ux_editor.modal_properties_data_model_field_choose'),
    });

    expect(chooseDataFieldOption).toHaveValue('');
    expect(chooseDataFieldOption.selected).toBe(true);
  });

  it('should render error message when data model is not valid', async () => {
    renderEditBinding({
      editBindingProps: {
        ...defaultEditBinding,
        internalBindingFormat: {
          field: defaultDataModelField,
          dataType: 'nonExistingModelName',
        },
      },
      queries: {
        getAppMetadataModelIds: getAppMetadataModelIdsMock,
        getDataModelMetadata: getDataModelMetadataMock,
      },
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const errorMessage = screen.getByText(
      textMock('ux_editor.modal_properties_data_model_field_update'),
    );
    expect(errorMessage).toBeInTheDocument();
  });

  it('should toggle error message when data model field is not valid', async () => {
    const user = userEvent.setup();
    renderEditBinding({
      editBindingProps: {
        ...defaultEditBinding,
        internalBindingFormat: {
          field: 'invalidField',
          dataType: defaultDataModel,
        },
      },
      queries: {
        getAppMetadataModelIds: getAppMetadataModelIdsMock,
        getDataModelMetadata: getDataModelMetadataMock,
      },
      shouldRenderWithMockedParent: true,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const errorMessage = screen.getByText(
      textMock('ux_editor.modal_properties_data_model_field_update'),
    );
    expect(errorMessage).toBeInTheDocument();

    const dataModelFieldSelector = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_field_binding'),
    });
    const option2 = screen.getByRole('option', { name: secondDataModelField });
    await user.selectOptions(dataModelFieldSelector, option2);
    expect(errorMessage).not.toBeInTheDocument();
  });

  it('should call handleComponentChange with new binding format when data model field is changed', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    renderEditBinding({
      editBindingProps: {
        ...defaultEditBinding,
        handleComponentChange,
      },
      queries: {
        getAppMetadataModelIds: getAppMetadataModelIdsMock,
        getDataModelMetadata: getDataModelMetadataMock,
      },
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const dataModelFieldSelector = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_field_binding'),
    });
    const option2 = screen.getByRole('option', { name: 'field2' });
    await user.selectOptions(dataModelFieldSelector, option2);

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(
      {
        ...componentMocks[ComponentType.Input],
        dataModelBindings: {
          [defaultEditBinding.bindingKey]: {
            field: 'field2',
            dataType: defaultDataModel,
          },
        },
        maxCount: undefined,
        required: true,
        timeStamp: undefined,
      },
      {
        onSuccess: expect.any(Function),
      },
    );
  });

  it('should call handleComponentChange with new binding format when data model is changed', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    renderEditBinding({
      editBindingProps: {
        ...defaultEditBinding,
        handleComponentChange,
      },
      queries: {
        getAppMetadataModelIds: getAppMetadataModelIdsMock,
        getDataModelMetadata: getDataModelMetadataMock,
      },
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const dataModelSelector = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_binding'),
    });
    const option2 = screen.getByRole('option', { name: secondDataModel });
    await user.selectOptions(dataModelSelector, option2);

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(
      {
        ...componentMocks[ComponentType.Input],
        dataModelBindings: {
          [defaultEditBinding.bindingKey]: {
            field: '',
            dataType: secondDataModel,
          },
        },
        maxCount: undefined,
        required: undefined,
        timeStamp: undefined,
      },
      {
        onSuccess: expect.any(Function),
      },
    );
  });

  it('should call handleComponentChange when click on delete button', async () => {
    window.confirm = jest.fn(() => true);
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    renderEditBinding({
      editBindingProps: {
        ...defaultEditBinding,
        handleComponentChange,
      },
      queries: {
        getAppMetadataModelIds: getAppMetadataModelIdsMock,
        getDataModelMetadata: getDataModelMetadataMock,
      },
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const deleteButton = screen.getByRole('button', {
      name: textMock('right_menu.data_model_bindings_delete_button'),
    });
    await user.click(deleteButton);

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(
      {
        ...componentMocks[ComponentType.Input],
        dataModelBindings: {
          simpleBinding: '',
        },
        maxCount: undefined,
        required: undefined,
        timeStamp: undefined,
      },
      {
        onSuccess: expect.any(Function),
      },
    );
  });
});
