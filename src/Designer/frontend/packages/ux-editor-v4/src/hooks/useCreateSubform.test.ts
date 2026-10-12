import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '../testing/mocks';
import { useCreateSubform } from './useCreateSubform';

const addLayoutSetMock = vi.fn();
const createDataModelMock = vi.fn();

vi.mock('app-development/hooks/mutations/useCreateDataModelMutation', () => ({
  useCreateDataModelMutation: vi.fn(() => ({
    mutate: createDataModelMock,
  })),
}));

vi.mock('app-development/hooks/mutations/useAddLayoutSetMutation', () => ({
  useAddLayoutSetMutation: vi.fn(() => ({
    mutate: addLayoutSetMock,
  })),
}));

describe('useCreateSubform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call addLayoutSet with correct parameters', () => {
    const { createSubform } = renderHookWithProviders(() => useCreateSubform()).result.current;
    const subformName = 'underskjema';
    const onSubformCreated = vi.fn();

    createSubform({ layoutSetName: subformName, onSubformCreated, dataType: 'dataModel1' });

    expect(addLayoutSetMock).toHaveBeenCalledWith(
      {
        layoutSetConfig: {
          id: subformName,
          type: 'subform',
          dataType: 'dataModel1',
        },
      },
      {
        onSuccess: expect.any(Function),
      },
    );
  });

  it('should call createDataModel with correct parameters when newDataModel is true', () => {
    const { createSubform } = renderHookWithProviders(() => useCreateSubform()).result.current;
    const subformName = 'underskjema';
    const onSubformCreated = vi.fn();

    createSubform({
      layoutSetName: subformName,
      onSubformCreated,
      dataType: 'dataModel1',
      newDataModel: true,
    });

    expect(createDataModelMock).toHaveBeenCalledWith(
      {
        name: 'dataModel1',
        relativePath: '',
      },
      {
        onSuccess: expect.any(Function),
      },
    );
  });
});
