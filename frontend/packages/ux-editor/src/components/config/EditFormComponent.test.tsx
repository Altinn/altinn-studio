import React from 'react';
import type { IEditFormComponentProps } from './EditFormComponent';
import { EditFormComponent } from './EditFormComponent';
import { screen, waitFor } from '@testing-library/react';
import { renderHookWithProviders, renderWithProviders } from '../../testing/mocks';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useDataModelMetadataQuery } from '../../hooks/queries/useDataModelMetadataQuery';
import type { DataModelMetadataResponse } from 'app-shared/types/api';
import { componentMocks } from '../../testing/componentMocks';
import { dataModelNameMock, layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';

// Test data:
const srcValueLabel = 'Source';

// Mocks:
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
});

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithProviders(() => useLayoutSchemaQuery()).result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
  const dataModelMetadataResult = renderHookWithProviders(
    () =>
      useDataModelMetadataQuery({
        org,
        app,
        layoutSetName: layoutSet1NameMock,
        dataModelName: dataModelNameMock,
      }),
    { queries: { getDataModelMetadata } },
  ).result;
  await waitFor(() => expect(dataModelMetadataResult.current.isSuccess).toBe(true));
};

const defaultProps: IEditFormComponentProps = {
  editFormId: componentMocks[ComponentType.Input].id,
  component: componentMocks[ComponentType.Input],
  handleComponentUpdate: jest.fn(),
};

const render = async (props: Partial<IEditFormComponentProps> = {}) => {
  await waitForData();

  renderWithProviders(<EditFormComponent {...defaultProps} {...props} />, {
    queries: { getDataModelMetadata },
  });
};
