import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { IInternalLayout } from '../../../../../types/global';
import { layoutMock } from '../../../../../testing/layoutMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useBaseAddComponentHandler } from './useBaseAddComponentHandler';
import { waitFor } from '@testing-library/react';
import { usePreviewContext } from 'app-shared/contexts/PreviewContext';
import { useFormItemContext } from '../../../../FormItemContext';

vi.mock('app-shared/contexts/PreviewContext');
vi.mock('../../../../../hooks', () => ({
  useAppContext: () => ({
    selectedFormLayoutSetName: 'testLayoutSet',
    setSelectedItem: vi.fn(),
  }),
}));

vi.mock('../../../../../hooks/mutations/useAddItemToLayoutMutation', () => ({
  useAddItemToLayoutMutation: () => ({
    mutate: (_vars, { onSuccess }) => {
      onSuccess();
    },
  }),
}));

vi.mock('../../../../FormItemContext');

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
    const onDoneMock = vi.fn();

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

  it('does not add a removed component type', () => {
    const handleEditMock = mockFormItemContext();
    const doReloadPreviewMock = mockPreviewContext();
    const onDoneMock = vi.fn();

    const { addItem } = renderUseAddComponentHandler(layoutMock);
    addItem(ComponentType.FileUploadWithTag, BASE_CONTAINER_ID, 0, 'new-id', onDoneMock);

    expect(handleEditMock).not.toHaveBeenCalled();
    expect(doReloadPreviewMock).not.toHaveBeenCalled();
    expect(onDoneMock).not.toHaveBeenCalled();
  });
});

function renderUseAddComponentHandler(layout: IInternalLayout) {
  const { result } = renderHookWithProviders(() => useBaseAddComponentHandler(layout));
  return result.current;
}

function mockFormItemContext() {
  const handleEditMock = vi.fn();

  (useFormItemContext as Mock).mockReturnValue({ handleEdit: handleEditMock });
  return handleEditMock;
}

function mockPreviewContext() {
  const doReloadPreviewMock = vi.fn();

  (usePreviewContext as Mock).mockReturnValue({ doReloadPreview: doReloadPreviewMock });
  return doReloadPreviewMock;
}
