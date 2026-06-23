import React from 'react';
import { renderHook } from '@testing-library/react';
import { useCurrentLayoutSet } from './useCurrentLayoutSet';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import { BpmnApiContext } from '../../../../contexts/BpmnApiContext';
import {
  mockBpmnContextValue,
  mockBpmnApiContextValue,
} from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import type { LayoutSetResponse } from 'app-shared/utils/layoutSetsUtils';

describe('useCurrentLayoutSet', () => {
  it('should return undefined when no layout set matches the current task', () => {
    const { result } = renderUseCurrentLayoutSet([
      { id: 'other-layout-set', dataType: '', type: '', task: { id: 'other-task-id', type: '' } },
    ]);

    expect(result.current.currentLayoutSet).toBeUndefined();
  });

  it('should return undefined when layoutSets is empty', () => {
    const { result } = renderUseCurrentLayoutSet([]);

    expect(result.current.currentLayoutSet).toBeUndefined();
  });

  it('should return the layout set when it matches the current task', () => {
    const matchingLayoutSet: LayoutSetResponse = {
      id: 'pdf-layout-set',
      dataType: '',
      type: '',
      task: { id: mockBpmnDetails.id, type: '' },
    };

    const { result } = renderUseCurrentLayoutSet([
      matchingLayoutSet,
      { id: 'other-layout-set', dataType: '', type: '', task: { id: 'other-task-id', type: '' } },
    ]);

    expect(result.current.currentLayoutSet).toEqual(matchingLayoutSet);
  });
});

const renderUseCurrentLayoutSet = (sets: LayoutSetResponse[]) => {
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, layoutSets: sets }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, bpmnDetails: mockBpmnDetails }}>
        {children}
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>
  );

  return renderHook(() => useCurrentLayoutSet(), { wrapper });
};
