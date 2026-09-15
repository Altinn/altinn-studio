import { TaskUtils } from './taskUtils';
import type { BpmnTaskType } from '../../types/BpmnTaskType';
import type { Element } from 'bpmn-js/lib/model/Types';

type TestCase = {
  input: BpmnTaskType;
  output: boolean;
};

const testCases: Array<TestCase> = [
  {
    input: 'signing',
    output: true,
  },
  {
    input: 'data',
    output: false,
  },
  {
    input: '' as BpmnTaskType,
    output: false,
  },
];

describe('taskUtils', () => {
  it.each(testCases)('should return true for signing-tasks %o', ({ input, output }) => {
    expect(TaskUtils.isSigningTask(input)).toEqual(output);
  });

  describe('isUserControlledSigning', () => {
    it('recognises a hand-authored config with a plainly named signature data type', () => {
      const element = buildElement({
        signatureDataType: 'signature',
        signeeStatesDataTypeId: 'signee-states',
        signeeProviderId: 'myProvider',
      });
      expect(TaskUtils.isUserControlledSigning(element)).toBe(true);
    });

    it('returns false for a plain signing task', () => {
      const element = buildElement({ signatureDataType: 'signatures-1234' });
      expect(TaskUtils.isUserControlledSigning(element)).toBe(false);
    });

    it('returns false for a plain signing task whose data type id merely mentions user control', () => {
      const element = buildElement({ signatureDataType: 'user-controlled-signatures-1234' });
      expect(TaskUtils.isUserControlledSigning(element)).toBe(false);
    });

    it('recognises an incomplete config that only declares a signee provider, so it can be repaired', () => {
      const element = buildElement({
        signatureDataType: 'signature',
        signeeProviderId: 'myProvider',
      });
      expect(TaskUtils.isUserControlledSigning(element)).toBe(true);
    });

    it('returns false when the element has no signature config', () => {
      expect(TaskUtils.isUserControlledSigning({ businessObject: {} } as Element)).toBe(false);
    });
  });
});

type SignatureConfig = {
  signatureDataType: string;
  signeeStatesDataTypeId?: string;
  signeeProviderId?: string;
};

function buildElement(signatureConfig: SignatureConfig): Element {
  return {
    businessObject: {
      extensionElements: {
        values: [{ signatureConfig }],
      },
    },
  } as unknown as Element;
}
