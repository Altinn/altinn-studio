import { TaskUtils } from './taskUtils';

type TestCase = {
  input: string;
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
    input: '',
    output: false,
  },
];

describe('taskUtils', () => {
  it.each(testCases)('should return true for signing-tasks %o', ({ input, output }) => {
    expect(TaskUtils.isSigningTask(input)).toEqual(output);
  });
});
