import { TaskUtils } from './taskUtils';
import type { BpmnTaskType } from '../../types/BpmnTaskType';

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
    input: 'userControlledSigning',
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
});
