import { renderHook } from '@testing-library/react';
import { useUpdateLayoutSetId } from './useUpdateLayoutSetId';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';
import type { AppVersion } from 'app-shared/types/AppVersion';

const reloadSavedProcess = jest.fn();
jest.mock('./useReloadSavedProcess', () => ({ useReloadSavedProcess: () => reloadSavedProcess }));
jest.mock('../contexts/BpmnContext', () => ({ useBpmnContext: jest.fn() }));
jest.mock('../contexts/BpmnApiContext', () => ({ useBpmnApiContext: jest.fn() }));

const v9AppVersion: AppVersion = { backendVersion: '9.0.0', frontendVersion: '' };
const v8AppVersion: AppVersion = { backendVersion: '8.9.0', frontendVersion: '' };
const oldId = 'Activity_0abc123';
const newId = 'NamedTask';
const mutateLayoutSetId = jest.fn();
const enqueueProcessChange = jest.fn();

describe('useUpdateLayoutSetId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutateLayoutSetId.mockResolvedValue(undefined);
    reloadSavedProcess.mockResolvedValue(undefined);
    (useBpmnApiContext as jest.Mock).mockReturnValue({ mutateLayoutSetId });
  });

  it('renames the layout set only when its turn among the process changes comes', () => {
    setupUpdateLayoutSetId(v9AppVersion)(oldId, newId);

    expect(enqueueProcessChange).toHaveBeenCalledTimes(1);
    expect(mutateLayoutSetId).not.toHaveBeenCalled();
  });

  it('renames the layout set and then reloads the process with the renamed task selected in a v9 app', async () => {
    setupUpdateLayoutSetId(v9AppVersion)(oldId, newId);
    await runEnqueuedChange();

    expect(mutateLayoutSetId).toHaveBeenCalledWith({
      layoutSetIdToUpdate: oldId,
      newLayoutSetId: newId,
    });
    expect(reloadSavedProcess).toHaveBeenCalledWith(newId);
  });

  it('renames the layout set without reloading the process in an app before v9', async () => {
    setupUpdateLayoutSetId(v8AppVersion)(oldId, newId);
    await runEnqueuedChange();

    expect(mutateLayoutSetId).toHaveBeenCalledWith({
      layoutSetIdToUpdate: oldId,
      newLayoutSetId: newId,
    });
    expect(reloadSavedProcess).not.toHaveBeenCalled();
  });

  it('does not reload the process when the rename fails', async () => {
    mutateLayoutSetId.mockRejectedValue(new Error('Conflict'));

    setupUpdateLayoutSetId(v9AppVersion)(oldId, newId);
    await runEnqueuedChange();

    expect(reloadSavedProcess).not.toHaveBeenCalled();
  });

  it('reloads the process after each of two renames in quick succession', async () => {
    const updateLayoutSetId = setupUpdateLayoutSetId(v9AppVersion);
    updateLayoutSetId(oldId, 'FirstName');
    updateLayoutSetId('FirstName', newId);
    for (const [change] of enqueueProcessChange.mock.calls) await change();

    expect(reloadSavedProcess).toHaveBeenNthCalledWith(1, 'FirstName');
    expect(reloadSavedProcess).toHaveBeenNthCalledWith(2, newId);
  });
});

const setupUpdateLayoutSetId = (appVersion: AppVersion) => {
  (useBpmnContext as jest.Mock).mockReturnValue({ appVersion, enqueueProcessChange });
  return renderHook(() => useUpdateLayoutSetId()).result.current;
};

const runEnqueuedChange = async (): Promise<void> => {
  const [change] = enqueueProcessChange.mock.lastCall;
  await change();
};
