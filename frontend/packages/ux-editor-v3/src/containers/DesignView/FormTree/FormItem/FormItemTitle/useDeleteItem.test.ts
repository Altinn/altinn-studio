import { renderHookWithMockStore } from '../../../../../testing/mocks';
import { useDeleteItem } from './useDeleteItem';
import type { FormComponent } from '../../../../../types/FormComponent';
import type { FormContainer } from '../../../../../types/FormContainer';
import { componentMocks } from '../../../../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { container1IdMock, layoutMock } from '../../../../../testing/layoutMock';

// Mocks:
const mockContainerMutation = jest.fn();
const mockComponentMutation = jest.fn();
jest.mock('../../../../../hooks/mutations/useDeleteFormContainerMutation', () => ({
  useDeleteFormContainerMutation: () => ({ mutate: mockContainerMutation }),
}));
jest.mock('../../../../../hooks/mutations/useDeleteFormComponentMutation', () => ({
  useDeleteFormComponentMutation: () => ({ mutate: mockComponentMutation }),
}));

describe('useDeleteItem', () => {
  afterEach(jest.clearAllMocks);

  it('Calls component mutation when formItem is a component', () => {
    const { result } = render(componentMocks[ComponentType.Input]);
    result.current();
    expect(mockComponentMutation).toHaveBeenCalledTimes(1);
    expect(mockContainerMutation).not.toHaveBeenCalled();
  });

  it('Calls container mutation when formItem is a container', () => {
    const { result } = render(layoutMock.containers[container1IdMock]);
    result.current();
    expect(mockContainerMutation).toHaveBeenCalledTimes(1);
    expect(mockComponentMutation).not.toHaveBeenCalled();
  });
});

const render = (formItem: FormComponent | FormContainer) => {
  const { renderHookResult } = renderHookWithMockStore()(() => useDeleteItem(formItem));
  return renderHookResult;
};
