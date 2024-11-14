import { useCreateSubform } from './useCreateSubform';
import { renderHook } from '@testing-library/react';

const addLayoutSetMock = jest.fn();

jest.mock('app-development/hooks/mutations/useAddLayoutSetMutation', () => ({
  useAddLayoutSetMutation: jest.fn(() => ({
    mutate: addLayoutSetMock,
  })),
}));

describe('useCreateSubform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call addLayoutSet with correct parameters', () => {
    const { createSubform } = renderHook(() => useCreateSubform()).result.current;
    const subformName = 'underskjema';
    const onSubformCreated = jest.fn();

    createSubform({ layoutSetName: subformName, onSubformCreated, dataType: 'dataModel1' });

    expect(addLayoutSetMock).toHaveBeenCalledWith(
      {
        layoutSetIdToUpdate: subformName,
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
});
