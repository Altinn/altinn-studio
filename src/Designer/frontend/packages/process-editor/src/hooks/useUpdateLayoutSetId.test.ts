import { renderHook } from '@testing-library/react';
import { useUpdateLayoutSetId } from './useUpdateLayoutSetId';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';

jest.mock('../contexts/BpmnApiContext', () => ({ useBpmnApiContext: jest.fn() }));

const oldId = 'Activity_0abc123';
const newId = 'NamedTask';
const mutateLayoutSetId = jest.fn();

describe('useUpdateLayoutSetId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useBpmnApiContext as jest.Mock).mockReturnValue({ mutateLayoutSetId });
  });

  it('queues one layout set rename', () => {
    setupUpdateLayoutSetId()(oldId, newId);

    expect(mutateLayoutSetId).toHaveBeenCalledTimes(1);
    expect(mutateLayoutSetId).toHaveBeenCalledWith({
      layoutSetIdToUpdate: oldId,
      newLayoutSetId: newId,
    });
  });

  it('forwards successive renames in order', () => {
    const updateLayoutSetId = setupUpdateLayoutSetId();
    updateLayoutSetId(oldId, 'FirstName');
    updateLayoutSetId('FirstName', newId);

    expect(mutateLayoutSetId).toHaveBeenNthCalledWith(1, {
      layoutSetIdToUpdate: oldId,
      newLayoutSetId: 'FirstName',
    });
    expect(mutateLayoutSetId).toHaveBeenNthCalledWith(2, {
      layoutSetIdToUpdate: 'FirstName',
      newLayoutSetId: newId,
    });
  });
});

const setupUpdateLayoutSetId = () => renderHook(() => useUpdateLayoutSetId()).result.current;
