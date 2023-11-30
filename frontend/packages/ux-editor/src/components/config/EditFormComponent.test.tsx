import React from 'react';
import { EditFormComponent } from './EditFormComponent';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormComponent } from '../../types/FormComponent';
import { renderHookWithMockStore, renderWithMockStore } from '../../testing/mocks';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useDatamodelMetadataQuery } from '../../hooks/queries/useDatamodelMetadataQuery';

const user = userEvent.setup();

// Test data:
const srcValueLabel = 'Source';
const texts = {
  'general.label': '',
  'general.value': '',
  'ux_editor.modal_header_type_h2': 'H2',
  'ux_editor.modal_header_type_h3': 'H3',
  'ux_editor.modal_header_type_h4': 'H4',
  'ux_editor.modal_properties_image_src_value_label': srcValueLabel,
  'ux_editor.modal_properties_image_placement_label': 'Placement',
  'ux_editor.modal_properties_image_alt_text_label': 'Alt text',
  'ux_editor.modal_properties_image_width_label': 'Width',
};

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));
const buttonSpecificContentId = 'button-specific-content';
jest.mock('./componentSpecificContent/Button/ButtonComponent', () => ({
  ButtonComponent: () => <div data-testid={buttonSpecificContentId} />,
}));
const imageSpecificContentId = 'image-specific-content';
jest.mock('./componentSpecificContent/Image/ImageComponent', () => ({
  ImageComponent: () => <div data-testid={imageSpecificContentId} />,
}));

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

describe('EditFormComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return input specific content when type input', async () => {
    await render({
      componentProps: {
        type: ComponentType.Input,
      },
    });

    const labels = {
      'ux_editor.modal_properties_component_change_id': 'textbox',
      'ux_editor.modal_properties_data_model_helper': 'combobox',
      'ux_editor.modal_configure_read_only': 'checkbox',
    };

    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    await act(() => user.click(linkIcon));

    Object.keys(labels).map(async (label) =>
      expect(await screen.findByRole(labels[label], { name: label })),
    );
    expect(screen.getByRole('combobox'));
    expect(screen.getByLabelText('Autocomplete (WCAG)'));
  });

  test('should return header specific content when type header', async () => {
    await render({
      componentProps: {
        type: ComponentType.Header,
      },
    });

    expect(screen.getByLabelText('ux_editor.modal_properties_component_change_id'));
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'ux_editor.modal_header_type_helper' })),
    );
  });

  test('should return file uploader specific content when type file uploader', async () => {
    await render({
      componentProps: {
        type: ComponentType.FileUpload,
      },
    });

    const labels = [
      'ux_editor.modal_properties_component_change_id',
      'ux_editor.modal_properties_file_upload_simple',
      'ux_editor.modal_properties_file_upload_list',
      'ux_editor.modal_properties_valid_file_endings_all',
      'ux_editor.modal_properties_valid_file_endings_custom',
      'ux_editor.modal_properties_minimum_files',
      'ux_editor.modal_properties_maximum_files',
      'ux_editor.modal_properties_maximum_file_size (ux_editor.modal_properties_maximum_file_size_helper)',
    ];

    labels.map((label) => expect(screen.getByLabelText(label)));
  });

  test('should call handleComponentUpdate with max number of attachments to 1 when clearing max number of attachments', async () => {
    const handleUpdate = jest.fn();
    const { allComponentProps } = await render({
      componentProps: {
        maxNumberOfAttachments: 3,
        type: ComponentType.FileUpload,
      },
      handleComponentUpdate: handleUpdate,
    });

    const maxFilesInput = screen.getByLabelText('ux_editor.modal_properties_maximum_files');

    await act(() => user.clear(maxFilesInput));
    expect(handleUpdate).toHaveBeenCalledWith({
      ...allComponentProps,
      maxNumberOfAttachments: 1,
    });
  });

  test('should call handleComponentUpdate with required: false when min number of attachments is set to 0', async () => {
    const handleUpdate = jest.fn();
    const { allComponentProps } = await render({
      componentProps: {
        required: true,
        minNumberOfAttachments: 1,
        type: ComponentType.FileUpload,
      },
      handleComponentUpdate: handleUpdate,
    });

    const minFilesInput = screen.getByLabelText('ux_editor.modal_properties_minimum_files');

    await act(() => user.clear(minFilesInput));
    expect(handleUpdate).toHaveBeenCalledWith({
      ...allComponentProps,
      required: false,
      minNumberOfAttachments: 0,
    });
  });

  test('should return button specific content when type button', async () => {
    await render({
      componentProps: {
        type: ComponentType.Button,
      },
    });
    expect(await screen.findByTestId(buttonSpecificContentId)).toBeInTheDocument();
  });

  test('should render Image component when component type is Image', async () => {
    await render({
      componentProps: {
        type: ComponentType.Image,
      },
    });
    expect(await screen.findByTestId(imageSpecificContentId)).toBeInTheDocument();
  });

  it('should not render Image component when component type is not Image', async () => {
    await render({
      componentProps: {
        type: ComponentType.Button,
      },
    });
    expect(screen.queryByLabelText(srcValueLabel)).not.toBeInTheDocument();
  });
});

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
  const dataModelMetadataResult = renderHookWithMockStore(
    {},
    { getDatamodelMetadata },
  )(() => useDatamodelMetadataQuery('test-org', 'test-app')).renderHookResult.result;
  await waitFor(() => expect(dataModelMetadataResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async ({
  componentProps = {},
  handleComponentUpdate = jest.fn(),
  isProd = true,
}: {
  componentProps?: Partial<FormComponent>;
  handleComponentUpdate?: (component: FormComponent) => {
    allComponentProps: FormComponent;
  };
  isProd?: boolean;
}) => {
  const allComponentProps: FormComponent = {
    dataModelBindings: {},
    readOnly: false,
    required: false,
    textResourceBindings: {
      title: 'title',
    },
    type: ComponentType.Input,
    id: 'test',
    itemType: 'COMPONENT',
    ...componentProps,
  } as FormComponent;

  await waitForData();

  renderWithMockStore(
    {},
    { getDatamodelMetadata },
  )(
    <EditFormComponent
      editFormId={''}
      component={allComponentProps}
      handleComponentUpdate={handleComponentUpdate}
    />,
  );

  return { allComponentProps };
};
