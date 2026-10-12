import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUpdateLayoutSetId } from './useUpdateLayoutSetId';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';

const reloadSavedProcess = vi.fn();
vi.mock('./useReloadSavedProcess', () => ({ useReloadSavedProcess: () => reloadSavedProcess }));
vi.mock('../contexts/BpmnApiContext', () => ({ useBpmnApiContext: vi.fn() }));

const oldId = 'Activity_0abc123';
const newId = 'NamedTask';
const mutateLayoutSetId = vi.fn();

describe('useUpdateLayoutSetId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useBpmnApiContext as Mock).mockReturnValue({ mutateLayoutSetId });
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
