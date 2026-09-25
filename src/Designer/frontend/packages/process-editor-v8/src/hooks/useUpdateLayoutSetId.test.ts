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

describe('useUpdateLayoutSetId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBpmnApiContext as jest.Mock).mockReturnValue({ mutateLayoutSetId });
  });

  it('renames the layout set and then reloads the process with the renamed task selected in a v9 app', () => {
    renderUseUpdateLayoutSetId(v9AppVersion)(oldId, newId);

    expect(mutateLayoutSetId).toHaveBeenCalledWith(
      { layoutSetIdToUpdate: oldId, newLayoutSetId: newId },
      { onSuccess: expect.any(Function) },
    );
    expect(reloadSavedProcess).not.toHaveBeenCalled();
    const [, { onSuccess }] = mutateLayoutSetId.mock.lastCall;
    onSuccess();
    expect(reloadSavedProcess).toHaveBeenCalledWith(newId);
  });

  it('renames the layout set without reloading the process in an app before v9', () => {
    renderUseUpdateLayoutSetId(v8AppVersion)(oldId, newId);

    expect(mutateLayoutSetId).toHaveBeenCalledWith(
      { layoutSetIdToUpdate: oldId, newLayoutSetId: newId },
      { onSuccess: undefined },
    );
  });
});

const renderUseUpdateLayoutSetId = (appVersion: AppVersion) => {
  (useBpmnContext as jest.Mock).mockReturnValue({ appVersion });
  return renderHook(() => useUpdateLayoutSetId()).result.current;
};
