import React from 'react';
import { EditFormComponent } from './EditFormComponent';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormComponent } from '../../types/FormComponent';
import { renderHookWithMockStore, renderWithMockStore } from '../../testing/mocks';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { useDataModelMetadataQuery } from '../../hooks/queries/useDataModelMetadataQuery';
import type { DataModelMetadataResponse } from 'app-shared/types/api';
import { dataModelNameMock, layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  removeFeatureFlagFromLocalStorage,
  FeatureFlag,
} from 'app-shared/utils/featureToggleUtils';

// Test data:
const srcValueLabel = 'Source';

// Mocks:
const buttonSpecificContentId = 'button-specific-content';
jest.mock('./componentSpecificContent/Button/ButtonComponent', () => ({
  ButtonComponent: () => <div data-testid={buttonSpecificContentId} />,
}));
const imageSpecificContentId = 'image-specific-content';
jest.mock('./componentSpecificContent/Image/ImageComponent', () => ({
  ImageComponent: () => <div data-testid={imageSpecificContentId} />,
}));

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

describe('EditFormComponent', () => {
  beforeEach(() => {
    removeFeatureFlagFromLocalStorage(FeatureFlag.ComponentConfigBeta);
    jest.clearAllMocks();
  });

  it('should return input specific content when type input', async () => {
    const user = userEvent.setup();
    await render({
      componentProps: {
        type: ComponentTypeV3.Input,
      },
    });

    const labels = {
      'ux_editor.modal_properties_component_change_id': 'textbox',
      'ux_editor.modal_properties_data_model_helper': 'combobox',
      'ux_editor.modal_configure_read_only': 'checkbox',
    };

    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    await user.click(linkIcon);

    Object.keys(labels).map(async (label) =>
      expect(await screen.findByRole(labels[label], { name: textMock(label) })),
    );
    expect(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.component_properties.autocomplete'),
      }),
    ).toBeInTheDocument();
  });

  it('should return header specific content when type header', async () => {
    await render({
      componentProps: {
        type: ComponentTypeV3.Header,
      },
    });

    expect(screen.getByLabelText(textMock('ux_editor.modal_properties_component_change_id')));
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: textMock('ux_editor.modal_header_type_helper') }),
      ),
    );
  });

  it('should return file uploader specific content when type file uploader', async () => {
    await render({
      componentProps: {
        type: ComponentTypeV3.FileUpload,
      },
    });

    const labels = [
      textMock('ux_editor.modal_properties_component_change_id'),
      textMock('ux_editor.modal_properties_file_upload_simple'),
      textMock('ux_editor.modal_properties_file_upload_list'),
      textMock('ux_editor.modal_properties_valid_file_endings_all'),
      textMock('ux_editor.modal_properties_valid_file_endings_custom'),
      textMock('ux_editor.modal_properties_minimum_files'),
      textMock('ux_editor.modal_properties_maximum_files'),
      `${textMock('ux_editor.modal_properties_maximum_file_size')} (${textMock('ux_editor.modal_properties_maximum_file_size_helper')})`,
    ];

    labels.map((label) => expect(screen.getByLabelText(label)));
  });

  it('should return button specific content when type button', async () => {
    await render({
      componentProps: {
        type: ComponentTypeV3.Button,
      },
    });
    expect(await screen.findByTestId(buttonSpecificContentId)).toBeInTheDocument();
  });

  it('should render Image component when component type is Image', async () => {
    await render({
      componentProps: {
        type: ComponentTypeV3.Image,
      },
    });
    expect(await screen.findByTestId(imageSpecificContentId)).toBeInTheDocument();
  });

  it('should not render Image component when component type is not Image', async () => {
    await render({
      componentProps: {
        type: ComponentTypeV3.Button,
      },
    });
    expect(screen.queryByLabelText(srcValueLabel)).not.toBeInTheDocument();
  });

  it('should notify users when the component is unrecognized and cannot be configured in Studio', async () => {
    await render({
      componentProps: {
        // Cast the type to avoid TypeScript error due to components that does not exists within ComponentTypeV3.
        type: 'UnknownComponent' as unknown as any,
      },
    });
    expect(
      screen.getByText(
        textMock('ux_editor.edit_component.unknown_component', {
          componentName: 'UnknownComponent',
        }),
      ),
    );
  });

  it('should change to beta view when clicking on beta config switch', async () => {
    const user = userEvent.setup();
    await render({
      componentProps: {
        type: ComponentTypeV3.Button,
      },
    });
    await switchToBeta(user);
    const gridHeadingComponentInBetaConfig = screen.getByRole('heading', {
      name: textMock('ux_editor.component_properties.grid'),
    });
    expect(gridHeadingComponentInBetaConfig).toBeInTheDocument();
  });

  it('sets switch to default value in component from schema if defined', async () => {
    const user = userEvent.setup();
    await render({
      componentProps: {
        type: ComponentTypeV3.Datepicker,
      },
    });
    await switchToBeta(user);
    const datePickerTimeStampProp = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.timeStamp'),
    });
    expect(datePickerTimeStampProp).toBeChecked();
  });
});

const switchToBeta = async (user) => {
  const betaConfigSwitch = screen.getByRole('checkbox', {
    name: textMock('ux_editor.edit_component.show_beta_func'),
  });
  await user.click(betaConfigSwitch);
};

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
  const dataModelMetadataResult = renderHookWithMockStore(
    {},
    { getDataModelMetadata },
  )(() => useDataModelMetadataQuery(org, app, layoutSet1NameMock, dataModelNameMock))
    .renderHookResult.result;
  await waitFor(() => expect(dataModelMetadataResult.current.isSuccess).toBe(true));
};

const render = async ({
  componentProps = {},
  handleComponentUpdate = jest.fn(),
}: {
  componentProps?: Partial<FormComponent>;
  handleComponentUpdate?: (component: FormComponent) => {
    allComponentProps: FormComponent;
  };
}) => {
  const allComponentProps: FormComponent = {
    dataModelBindings: {},
    readOnly: false,
    required: false,
    textResourceBindings: {
      title: 'title',
    },
    type: ComponentTypeV3.Input,
    id: 'test',
    itemType: 'COMPONENT',
    ...componentProps,
  } as FormComponent;

  await waitForData();

  renderWithMockStore(
    {},
    { getDataModelMetadata },
  )(
    <EditFormComponent
      editFormId={''}
      component={allComponentProps}
      handleComponentUpdate={handleComponentUpdate}
    />,
  );

  return { allComponentProps };
};
