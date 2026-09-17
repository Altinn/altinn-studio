import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { usePdfConfig } from './usePdfConfig';
import { BpmnContext, type BpmnContextProps } from '../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../../types/BpmnDetails';

const updateModdleProperties = jest.fn((properties: object, element: object) =>
  Object.assign(element, properties),
);
const createElement = jest.fn((elementType: string, options: object) => ({
  $type: elementType,
  ...options,
}));

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => ({
  StudioModeler: jest.fn().mockImplementation(() => ({
    updateModdleProperties: (...args: unknown[]) =>
      updateModdleProperties(...(args as [object, object])),
    createElement: (...args: unknown[]) => createElement(...(args as [string, object])),
  })),
}));

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
        values: [{ $type: 'altinn:TaskExtension', pdfConfig }],
      },
    },
  },
});

describe('usePdfConfig', () => {
  afterEach(jest.clearAllMocks);

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
            values: [{ $type: 'altinn:TaskExtension' }],
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

  describe('updateFilenameTextResourceKey', () => {
    it('writes the text resource id as a filename element on the pdf config', () => {
      const pdfConfig = {};
      const bpmnDetails = createBpmnDetailsWithPdfConfig(pdfConfig);

      const { result } = renderHook(() => usePdfConfig(), {
        wrapper: createWrapper({ bpmnContextProps: { bpmnDetails } }),
      });
      act(() => result.current.updateFilenameTextResourceKey('my-filename-key'));

      expect(createElement).toHaveBeenCalledWith('altinn:FilenameTextResourceKey', {
        value: 'my-filename-key',
      });
      expect(updateModdleProperties).toHaveBeenCalledWith(
        { filenameTextResourceKey: expect.objectContaining({ value: 'my-filename-key' }) },
        pdfConfig,
      );
    });

    it('removes the filename element rather than writing an empty one', () => {
      const pdfConfig = { filenameTextResourceKey: { value: 'my-filename-key' } };
      const bpmnDetails = createBpmnDetailsWithPdfConfig(pdfConfig);

      const { result } = renderHook(() => usePdfConfig(), {
        wrapper: createWrapper({ bpmnContextProps: { bpmnDetails } }),
      });
      act(() => result.current.updateFilenameTextResourceKey(''));

      expect(updateModdleProperties).toHaveBeenCalledWith(
        { filenameTextResourceKey: undefined },
        pdfConfig,
      );
    });

    it('re-reads the config after a write, so its owner shows the value it just stored', () => {
      const bpmnDetails = createBpmnDetailsWithPdfConfig({});

      const { result } = renderHook(() => usePdfConfig(), {
        wrapper: createWrapper({ bpmnContextProps: { bpmnDetails } }),
      });
      act(() => result.current.updateFilenameTextResourceKey('my-filename-key'));

      expect(result.current.storedFilenameTextResourceId).toBe('my-filename-key');

      act(() => result.current.updateFilenameTextResourceKey(''));

      expect(result.current.storedFilenameTextResourceId).toBe('');
    });

    it('leaves the bpmn alone when the filename did not change', () => {
      const bpmnDetails = createBpmnDetailsWithPdfConfig({
        filenameTextResourceKey: { value: 'my-filename-key' },
      });

      const { result } = renderHook(() => usePdfConfig(), {
        wrapper: createWrapper({ bpmnContextProps: { bpmnDetails } }),
      });
      act(() => result.current.updateFilenameTextResourceKey('my-filename-key'));

      expect(updateModdleProperties).not.toHaveBeenCalled();
    });
  });
});
