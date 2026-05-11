import { renderHookWithProviders } from '../testing/mocks';
import { useCreateSubform } from './useCreateSubform';

const addLayoutSetMock = jest.fn();
const createDataModelMock = jest.fn();

jest.mock('app-development/hooks/mutations/useCreateDataModelMutation', () => ({
  useCreateDataModelMutation: jest.fn(() => ({
    mutate: createDataModelMock,
  })),
}));

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
    const { createSubform } = renderHookWithProviders(() => useCreateSubform()).result.current;
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

  it('should call createDataModel with correct parameters when newDataModel is true', () => {
    const { createSubform } = renderHookWithProviders(() => useCreateSubform()).result.current;
    const subformName = 'underskjema';
    const onSubformCreated = jest.fn();

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
