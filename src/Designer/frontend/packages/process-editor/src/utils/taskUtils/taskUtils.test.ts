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
    it('recognizes delegated signing with a custom signature data type ID', () => {
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

    it('does not infer delegated signing from the data type ID', () => {
      const element = buildElement({ signatureDataType: 'user-controlled-signatures-1234' });
      expect(TaskUtils.isUserControlledSigning(element)).toBe(false);
    });

    it('recognizes delegated signing when only a signee provider is configured', () => {
      const element = buildElement({
        signatureDataType: 'signature',
        signeeProviderId: 'myProvider',
      });
      expect(TaskUtils.isUserControlledSigning(element)).toBe(true);
    });

    it('returns false when the element has no signature config', () => {
      expect(TaskUtils.isUserControlledSigning({ businessObject: {} } as Element)).toBe(false);
    });

    it('finds signing configuration after an unrelated extension', () => {
      const element = {
        businessObject: {
          extensionElements: {
            values: [
              { $type: 'camunda:Properties' },
              {
                $type: 'altinn:TaskExtension',
                signatureConfig: { signeeProviderId: 'myProvider' },
              },
            ],
          },
        },
      } as unknown as Element;

      expect(TaskUtils.isUserControlledSigning(element)).toBe(true);
    });
  });

  describe('getTaskExtension', () => {
    it('finds the altinn task extension among other extension elements', () => {
      const taskExtension = { $type: 'altinn:TaskExtension', taskType: 'signing' };
      const element = {
        businessObject: {
          extensionElements: { values: [{ $type: 'camunda:Properties' }, taskExtension] },
        },
      } as unknown as Element;

      expect(TaskUtils.getTaskExtension(element)).toBe(taskExtension);
    });

    it('returns undefined when the task extension is missing', () => {
      expect(TaskUtils.getTaskExtension({ businessObject: {} } as Element)).toBeUndefined();
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
        values: [{ $type: 'altinn:TaskExtension', signatureConfig }],
      },
    },
  } as unknown as Element;
}
