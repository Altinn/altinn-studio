import { useAddComponentHandlerSilent } from './useAddComponentHandlerSilent';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { IInternalLayout } from '../../../../../types/global';
import { layoutMock } from '../../../../../testing/layoutMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
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

describe('useAddComponentHandlerSilent', () => {
  it('should call baseAddItem with correct arguments and an empty callback (silent)', () => {
    const mockBaseAddItem = jest.fn();
    (useBaseAddComponentHandler as jest.Mock).mockReturnValue({ addItem: mockBaseAddItem });

    const { addItem } = renderUseAddComponentHandlerSilent(layoutMock);
    addItem(...mockedItemToAdd);

    expect(mockBaseAddItem).toHaveBeenCalledWith(...mockedItemToAdd, expect.any(Function));
  });
});

function renderUseAddComponentHandlerSilent(layout: IInternalLayout) {
  const { result } = renderHookWithProviders(() => useAddComponentHandlerSilent(layout));
  return result.current;
}
