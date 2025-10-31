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

  it.each([
    {
      input: buildBpmnDetailsElement('user-controlled-signatures'),
      output: true,
    },
    {
      input: buildBpmnDetailsElement(''),
      output: false,
    },
    {
      input: buildBpmnDetailsElement('unknown'),
      output: false,
    },
  ])('should return true for user-controlled-signing %o', ({ input, output }) => {
    expect(TaskUtils.isUserControlledSigning(input)).toEqual(output);
  });
});

function buildBpmnDetailsElement(signatureDataType: string): Element {
  return {
    di: {
      bpmnElement: {
        extensionElements: {
          values: [
            {
              signatureConfig: {
                signatureDataType,
              },
            },
          ],
        },
      },
    },
  } as Element;
}
