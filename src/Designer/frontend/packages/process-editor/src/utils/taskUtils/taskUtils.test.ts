import { TaskUtils } from './taskUtils';
import type { BpmnTaskType } from '../../types/BpmnTaskType';
import { BpmnDetails } from '@altinn/process-editor/types/BpmnDetails';

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
      input: buildBpmnDetails('user-controlled-signatures'),
      output: true,
    },
    {
      input: buildBpmnDetails(''),
      output: false,
    },
    {
      input: buildBpmnDetails('unknown'),
      output: false,
    },
  ])('should return true for user-controlled-signing %o', ({ input, output }) => {
    expect(TaskUtils.isUserControlledSigning(input)).toEqual(output);
  });
});

function buildBpmnDetails(signatureDataType: string): BpmnDetails {
  return {
    element: {
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
    },
  } as BpmnDetails;
}
