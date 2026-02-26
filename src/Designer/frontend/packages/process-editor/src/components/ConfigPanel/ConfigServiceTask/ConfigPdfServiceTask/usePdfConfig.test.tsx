import React from 'react';
import { renderHook } from '@testing-library/react';
import { usePdfConfig } from './usePdfConfig';
import { BpmnContext, type BpmnContextProps } from '../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../../types/BpmnDetails';

type RenderHookProps = {
  bpmnContextProps?: Partial<BpmnContextProps>;
};

const createWrapper = (props: RenderHookProps = {}) => {
  const { bpmnContextProps } = props;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
      {children}
    </BpmnContext.Provider>
  );

  return Wrapper;
};

const createBpmnDetailsWithPdfConfig = (pdfConfig: object): BpmnDetails => ({
  ...mockBpmnDetails,
  taskType: 'pdf',
  element: {
    ...mockBpmnDetails.element,
    businessObject: {
      ...mockBpmnDetails.element.businessObject,
      extensionElements: {
        values: [{ pdfConfig }],
      },
    },
  },
});

describe('usePdfConfig', () => {
  it('should extract pdfConfig and storedFilenameTextResourceId from bpmnDetails', () => {
    const expectedPdfConfig = {
      autoPdfTaskIds: {
        taskIds: [{ value: 'task_1' }, { value: 'task_2' }],
      },
      filenameTextResourceKey: {
        value: 'my-filename-key',
      },
    };

    const bpmnDetails = createBpmnDetailsWithPdfConfig(expectedPdfConfig);

    const { result } = renderHook(() => usePdfConfig(), {
      wrapper: createWrapper({
        bpmnContextProps: { bpmnDetails },
      }),
    });

    expect(result.current.pdfConfig).toEqual(expectedPdfConfig);
    expect(result.current.storedFilenameTextResourceId).toBe('my-filename-key');
  });

  it('should return empty object and empty string when pdfConfig is missing', () => {
    const bpmnDetailsWithoutPdfConfig: BpmnDetails = {
      ...mockBpmnDetails,
      taskType: 'pdf',
      element: {
        ...mockBpmnDetails.element,
        businessObject: {
          ...mockBpmnDetails.element.businessObject,
          extensionElements: {
            values: [{}],
          },
        },
      },
    };

    const { result } = renderHook(() => usePdfConfig(), {
      wrapper: createWrapper({
        bpmnContextProps: { bpmnDetails: bpmnDetailsWithoutPdfConfig },
      }),
    });

    expect(result.current.pdfConfig).toEqual({});
    expect(result.current.storedFilenameTextResourceId).toBe('');
  });

  it('should return empty object when extensionElements is undefined', () => {
    const bpmnDetailsWithoutExtension: BpmnDetails = {
      ...mockBpmnDetails,
      taskType: 'pdf',
      element: {
        ...mockBpmnDetails.element,
        businessObject: {
          ...mockBpmnDetails.element.businessObject,
          extensionElements: undefined,
        },
      },
    };

    const { result } = renderHook(() => usePdfConfig(), {
      wrapper: createWrapper({
        bpmnContextProps: { bpmnDetails: bpmnDetailsWithoutExtension },
      }),
    });

    expect(result.current.pdfConfig).toEqual({});
    expect(result.current.storedFilenameTextResourceId).toBe('');
  });
});
