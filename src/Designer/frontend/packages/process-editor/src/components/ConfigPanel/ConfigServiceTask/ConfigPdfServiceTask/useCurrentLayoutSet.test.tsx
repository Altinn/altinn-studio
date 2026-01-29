import React from 'react';
import { renderHook } from '@testing-library/react';
import { useCurrentLayoutSet } from './useCurrentLayoutSet';
import { BpmnContext, type BpmnContextProps } from '../../../../contexts/BpmnContext';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import {
  mockBpmnContextValue,
  mockBpmnApiContextValue,
} from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';

type RenderHookProps = {
  bpmnContextProps?: Partial<BpmnContextProps>;
  bpmnApiContextProps?: Partial<BpmnApiContextProps>;
};

const createWrapper = (props: RenderHookProps = {}) => {
  const { bpmnContextProps, bpmnApiContextProps } = props;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
        {children}
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>
  );

  return Wrapper;
};

describe('useCurrentLayoutSet', () => {
  it('should return undefined when no layout set matches the current task', () => {
    const { result } = renderHook(() => useCurrentLayoutSet(), {
      wrapper: createWrapper({
        bpmnContextProps: { bpmnDetails: mockBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: {
            sets: [
              {
                id: 'other-layout-set',
                tasks: ['other-task-id'],
              },
            ],
          },
        },
      }),
    });

    expect(result.current.currentLayoutSet).toBeUndefined();
  });

  it('should return undefined when layoutSets is empty', () => {
    const { result } = renderHook(() => useCurrentLayoutSet(), {
      wrapper: createWrapper({
        bpmnContextProps: { bpmnDetails: mockBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
        },
      }),
    });

    expect(result.current.currentLayoutSet).toBeUndefined();
  });

  it('should return the layout set when it matches the current task', () => {
    const matchingLayoutSet = {
      id: 'pdf-layout-set',
      tasks: [mockBpmnDetails.id],
    };

    const { result } = renderHook(() => useCurrentLayoutSet(), {
      wrapper: createWrapper({
        bpmnContextProps: { bpmnDetails: mockBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: {
            sets: [
              matchingLayoutSet,
              {
                id: 'other-layout-set',
                tasks: ['other-task-id'],
              },
            ],
          },
        },
      }),
    });

    expect(result.current.currentLayoutSet).toEqual(matchingLayoutSet);
  });

  it('should only match on first task in the tasks array', () => {
    const layoutSetWithTaskInSecondPosition = {
      id: 'pdf-layout-set',
      tasks: ['primary-task', mockBpmnDetails.id],
    };

    const { result } = renderHook(() => useCurrentLayoutSet(), {
      wrapper: createWrapper({
        bpmnContextProps: { bpmnDetails: mockBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: {
            sets: [layoutSetWithTaskInSecondPosition],
          },
        },
      }),
    });

    expect(result.current.currentLayoutSet).toBeUndefined();
  });
});
