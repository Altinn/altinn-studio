import React from 'react';
import type { IEditFormComponentProps } from './EditFormComponent';
import { EditFormComponent } from './EditFormComponent';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHookWithMockStore, renderWithMockStore } from '../../testing/mocks';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useDatamodelMetadataQuery } from '../../hooks/queries/useDatamodelMetadataQuery';
import type { DatamodelMetadataResponse } from 'app-shared/types/api';
import { componentMocks } from '../../testing/componentMocks';

const user = userEvent.setup();

// Test data:
const srcValueLabel = 'Source';

// Mocks:
const imageSpecificContentId = 'image-specific-content';
jest.mock('./componentSpecificContent/Image/ImageComponent', () => ({
  ImageComponent: () => <div data-testid={imageSpecificContentId} />,
}));

const getDatamodelMetadata = () =>
  Promise.resolve<DatamodelMetadataResponse>({
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
    },
  });

describe('EditFormComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return header specific content when type header', async () => {
    await render({
      component: {
        ...componentMocks[ComponentType.Header],
      },
    });

    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: textMock('ux_editor.modal_header_type_helper') }),
      ),
    );
  });

  test('should render only custom code for repeating group component', async () => {
    await render({
      component: { ...componentMocks[ComponentType.RepeatingGroup] },
    });

    const betaSwitch = screen.queryByRole('combobox', {
      name: textMock('ux_editor.edit_component.show_beta_func'),
    });
    expect(betaSwitch).not.toBeInTheDocument();

    const maxOccursField = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_group_max_occur'),
    });
    expect(maxOccursField).toBeInTheDocument();
  });

  test('should return file uploader specific content when type file uploader', async () => {
    await render({
      component: { ...componentMocks[ComponentType.FileUpload] },
    });

    const labels = [
      'ux_editor.modal_properties_file_upload_simple',
      'ux_editor.modal_properties_file_upload_list',
      'ux_editor.modal_properties_valid_file_endings_all',
      'ux_editor.modal_properties_valid_file_endings_custom',
      'ux_editor.modal_properties_minimum_files',
      'ux_editor.modal_properties_maximum_files',
    ];

    labels.map((label) => expect(screen.getByLabelText(textMock(label))));
    expect(
      screen.getByLabelText(
        `${textMock('ux_editor.modal_properties_maximum_file_size')} (${textMock(
          'ux_editor.modal_properties_maximum_file_size_helper',
        )})`,
      ),
    );
  });

  test('should call handleComponentUpdate with max number of attachments to 1 when clearing max number of attachments', async () => {
    const handleUpdate = jest.fn();
    await render({
      component: {
        ...componentMocks[ComponentType.FileUpload],
        maxNumberOfAttachments: 3,
      },
      handleComponentUpdate: handleUpdate,
    });

    const maxFilesInput = screen.getByLabelText(
      textMock('ux_editor.modal_properties_maximum_files'),
    );

    await act(() => user.clear(maxFilesInput));
    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentMocks[ComponentType.FileUpload],
      maxNumberOfAttachments: 1,
    });
  });

  test('should call handleComponentUpdate with required: false when min number of attachments is set to 0', async () => {
    const handleUpdate = jest.fn();
    await render({
      component: {
        ...componentMocks[ComponentType.FileUpload],
        required: true,
        minNumberOfAttachments: 1,
      },
      handleComponentUpdate: handleUpdate,
    });

    const minFilesInput = screen.getByLabelText(
      textMock('ux_editor.modal_properties_minimum_files'),
    );

    await act(() => user.clear(minFilesInput));
    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentMocks[ComponentType.FileUpload],
      required: false,
      minNumberOfAttachments: 0,
    });
  });

  test('should render Image component when component type is Image', async () => {
    await render({
      component: { ...componentMocks[ComponentType.Image] },
    });
    expect(await screen.findByTestId(imageSpecificContentId)).toBeInTheDocument();
  });

  it('should not render Image component when component type is not Image', async () => {
    await render({
      component: { ...componentMocks[ComponentType.Button] },
    });
    expect(screen.queryByLabelText(srcValueLabel)).not.toBeInTheDocument();
  });

  it('should notify users when the component is unrecognized and cannot be configured in Studio', async () => {
    const componentType = 'UnknownComponent';
    await render({
      // Cast the type to avoid TypeScript error due to components that does not exists within ComponentType.
      component: { ...componentMocks[ComponentType.Input], type: componentType as unknown as any },
    });
    expect(
      screen.getByText(
        textMock('ux_editor.edit_component.unknown_component', {
          componentName: componentType,
        }),
      ),
    );
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
};

const defaultProps: IEditFormComponentProps = {
  editFormId: componentMocks[ComponentType.Input].id,
  component: componentMocks[ComponentType.Input],
  handleComponentUpdate: jest.fn(),
};

const render = async (props: Partial<IEditFormComponentProps> = {}) => {
  await waitForData();

  renderWithMockStore(
    {},
    { getDatamodelMetadata },
  )(<EditFormComponent {...defaultProps} {...props} />);
};
