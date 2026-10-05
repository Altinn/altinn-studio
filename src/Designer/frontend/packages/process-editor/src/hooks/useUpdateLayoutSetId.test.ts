import { renderHook } from '@testing-library/react';
import { useUpdateLayoutSetId } from './useUpdateLayoutSetId';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';

const reloadSavedProcess = jest.fn();
jest.mock('./useReloadSavedProcess', () => ({ useReloadSavedProcess: () => reloadSavedProcess }));
jest.mock('../contexts/BpmnApiContext', () => ({ useBpmnApiContext: jest.fn() }));

const oldId = 'Activity_0abc123';
const newId = 'NamedTask';
const mutateLayoutSetId = jest.fn();

describe('useUpdateLayoutSetId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBpmnApiContext as jest.Mock).mockReturnValue({ mutateLayoutSetId });
  });

  it('renames the layout set and then reloads the process with the renamed task selected in a v9 app', () => {
    renderUseUpdateLayoutSetId()(oldId, newId);

    expect(mutateLayoutSetId).toHaveBeenCalledWith(
      { layoutSetIdToUpdate: oldId, newLayoutSetId: newId },
      { onSuccess: expect.any(Function) },
    );
    expect(reloadSavedProcess).not.toHaveBeenCalled();
    const [, { onSuccess }] = mutateLayoutSetId.mock.lastCall;
    onSuccess();
    expect(reloadSavedProcess).toHaveBeenCalledWith(newId);
  });
});

const renderUseUpdateLayoutSetId = () => {
  return renderHook(() => useUpdateLayoutSetId()).result.current;
};
