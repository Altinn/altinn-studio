import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { IInternalLayout } from '../../../../../types/global';
import { layoutMock } from '../../../../../testing/layoutMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useAddComponentHandlerWithCallback } from './useAddComponentHandlerWithCallback';
import { useBaseAddComponentHandler } from '../useBaseAddComponentHandler/useBaseAddComponentHandler';

jest.mock('../useBaseAddComponentHandler/useBaseAddComponentHandler', () => ({
  useBaseAddComponentHandler: jest.fn(),
}));

const mockedItemToAdd: [ComponentType, string, number, string] = [
  ComponentType.Input,
  BASE_CONTAINER_ID,
  0,
  'new-id',
];

describe('useAddComponentHandlerWithCallback', () => {
  it('should call baseAddItem with correct arguments and callback)', () => {
    const mockBaseAddItem = jest.fn();
    const callbackMock = jest.fn();
    (useBaseAddComponentHandler as jest.Mock).mockReturnValue({ addItem: mockBaseAddItem });

    const { addItem } = renderUseAddComponentHandlerWithCallback(layoutMock, callbackMock);
    addItem(...mockedItemToAdd);

    expect(mockBaseAddItem).toHaveBeenCalledWith(...mockedItemToAdd, callbackMock);
  });
});

function renderUseAddComponentHandlerWithCallback(layout: IInternalLayout, onDone: () => void) {
  const { result } = renderHookWithProviders(() =>
    useAddComponentHandlerWithCallback(layout, onDone),
  );
  return result.current;
}
