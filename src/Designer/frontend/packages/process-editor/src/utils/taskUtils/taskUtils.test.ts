import { TaskUtils } from './taskUtils';
import type { BpmnTaskType } from '../../types/BpmnTaskType';
import { getMockBpmnElementForSigningTask } from '../../../test/mocks/bpmnDetailsMock';

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
      input: getMockBpmnElementForSigningTask({
        signatureDataType: 'user-controlled-signatures',
        signeeStatesDataTypeId: 'some-data-type',
      }),
      output: true,
    },
    {
      input: getMockBpmnElementForSigningTask({ signatureDataType: 'user-controlled-signatures' }),
      output: false,
    },
    {
      input: getMockBpmnElementForSigningTask({ signatureDataType: '' }),
      output: false,
    },
    {
      input: getMockBpmnElementForSigningTask({ signatureDataType: 'unknown' }),
      output: false,
    },
  ])('should return true for user-controlled-signing %o', ({ input, output }) => {
    expect(TaskUtils.isUserControlledSigning(input)).toEqual(output);
  });
});
