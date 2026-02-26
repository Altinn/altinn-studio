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
import type { LayoutSet } from 'app-shared/types/api/LayoutSetsResponse';

describe('useCurrentLayoutSet', () => {
  it('should return undefined when no layout set matches the current task', () => {
    const { result } = renderUseCurrentLayoutSet([
      { id: 'other-layout-set', tasks: ['other-task-id'] },
    ]);

    expect(result.current.currentLayoutSet).toBeUndefined();
  });

  it('should return undefined when layoutSets is empty', () => {
    const { result } = renderUseCurrentLayoutSet([]);

    expect(result.current.currentLayoutSet).toBeUndefined();
  });

  it('should return the layout set when it matches the current task', () => {
    const matchingLayoutSet = {
      id: 'pdf-layout-set',
      tasks: [mockBpmnDetails.id],
    };

    const { result } = renderUseCurrentLayoutSet([
      matchingLayoutSet,
      { id: 'other-layout-set', tasks: ['other-task-id'] },
    ]);

    expect(result.current.currentLayoutSet).toEqual(matchingLayoutSet);
  });

  it('should only match on first task in the tasks array', () => {
    const { result } = renderUseCurrentLayoutSet([
      { id: 'pdf-layout-set', tasks: ['primary-task', mockBpmnDetails.id] },
    ]);

    expect(result.current.currentLayoutSet).toBeUndefined();
  });
});

const renderUseCurrentLayoutSet = (sets: LayoutSet[]) => {
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, layoutSets: { sets } }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, bpmnDetails: mockBpmnDetails }}>
        {children}
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>
  );

  return renderHook(() => useCurrentLayoutSet(), { wrapper });
};
