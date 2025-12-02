import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { IInternalLayout } from '../../../../../types/global';
import { layoutMock } from '../../../../../testing/layoutMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useBaseAddComponentHandler } from './useBaseAddComponentHandler';
import { waitFor } from '@testing-library/react';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { useFormItemContext } from '../../../../FormItemContext';
import { dataModelMetadataMock } from '../../../../../testing/dataModelMock';
import { useValidDataModels } from '../../../../../hooks/useValidDataModels';

jest.mock('app-development/contexts/PreviewContext');
jest.mock('../../../../../hooks', () => ({
  useAppContext: () => ({
    selectedFormLayoutSetName: 'testLayoutSet',
    setSelectedItem: jest.fn(),
  }),
}));

jest.mock('../../../../../hooks/mutations/useAddItemToLayoutMutation', () => ({
  useAddItemToLayoutMutation: () => ({
    mutate: (_vars, { onSuccess }) => {
      onSuccess();
    },
  }),
}));

jest.mock('../../../../../hooks/useValidDataModels');

jest.mock('../../../../FormItemContext');

const mockedItemToAdd: [ComponentType, string, number, string] = [
  ComponentType.Input,
  BASE_CONTAINER_ID,
  0,
  'new-id',
];

describe('useAddComponentHandler', () => {
  beforeEach(() => {
    (useValidDataModels as jest.Mock).mockReturnValue({
      dataModelMetadata: undefined,
      selectedDataModel: undefined,
      isLoadingDataModels: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call baseAddItem with correct arguments and an empty callback (silent)', async () => {
    const handleEditMock = mockFormItemContext();
    const doReloadPreviewMock = mockPreviewContext();
    const onDoneMock = jest.fn();

    const { addItem } = renderUseAddComponentHandler(layoutMock);
    addItem(...mockedItemToAdd, onDoneMock);

    expect(handleEditMock).toHaveBeenCalledWith({
      dataModelBindings: { simpleBinding: '' },
      id: 'new-id',
      itemType: 'COMPONENT',
      pageIndex: null,
      type: 'Input',
    });

    await waitFor(() => expect(doReloadPreviewMock).toHaveBeenCalled());
    expect(onDoneMock).toHaveBeenCalled();
  });

  it('should auto-bind data model field when data model is available', async () => {
    const testDataModelName = 'testModel';
    (useValidDataModels as jest.Mock).mockReturnValue({
      dataModelMetadata: dataModelMetadataMock,
      selectedDataModel: testDataModelName,
      isLoadingDataModels: false,
    });
    const handleEditMock = mockFormItemContext();
    const doReloadPreviewMock = mockPreviewContext();
    const onDoneMock = jest.fn();

    const { addItem } = renderUseAddComponentHandler(layoutMock);
    addItem(...mockedItemToAdd, onDoneMock);
    expect(handleEditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-id',
        type: 'Input',
        dataModelBindings: {
          simpleBinding: {
            field: 'field1',
            dataType: testDataModelName,
          },
        },
      }),
    );

    await waitFor(() => expect(doReloadPreviewMock).toHaveBeenCalled());
    expect(onDoneMock).toHaveBeenCalled();
  });
});

function renderUseAddComponentHandler(layout: IInternalLayout) {
  const { result } = renderHookWithProviders(() => useBaseAddComponentHandler(layout));
  return result.current;
}

function mockFormItemContext() {
  const handleEditMock = jest.fn();

  (useFormItemContext as jest.Mock).mockReturnValue({ handleEdit: handleEditMock });
  return handleEditMock;
}

function mockPreviewContext() {
  const doReloadPreviewMock = jest.fn();

  (usePreviewContext as jest.Mock).mockReturnValue({ doReloadPreview: doReloadPreviewMock });
  return doReloadPreviewMock;
}
