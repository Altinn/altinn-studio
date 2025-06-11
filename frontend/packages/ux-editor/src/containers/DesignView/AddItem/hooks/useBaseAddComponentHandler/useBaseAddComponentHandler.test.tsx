import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { IInternalLayout } from '../../../../../types/global';
import { layoutMock } from '../../../../../testing/layoutMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useBaseAddComponentHandler } from './useBaseAddComponentHandler';
import { waitFor } from '@testing-library/react';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { useFormItemContext } from '../../../../FormItemContext';

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

jest.mock('../../../../FormItemContext');

const mockedItemToAdd: [ComponentType, string, number, string] = [
  ComponentType.Input,
  BASE_CONTAINER_ID,
  0,
  'new-id',
];

describe('useAddComponentHandler', () => {
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
