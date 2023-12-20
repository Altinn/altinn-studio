import { renderHookWithMockStore } from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import { useRuleModelQuery } from './useRuleModelQuery';
import ruleHandlerMock, {
  condition1Input1Label,
  condition1Input1Name,
  condition1Name,
  condition2Input1Label,
  condition2Input1Name,
  condition2Name,
  condition3Input1Label,
  condition3Input1Name,
  condition3Name,
  rule1Input1Label,
  rule1Input1Name,
  rule1Input2Label,
  rule1Input2Name,
  rule1Name,
  rule2Input1Label,
  rule2Input1Name,
  rule2Input2Label,
  rule2Input2Name,
  rule2Name,
} from '../../testing/ruleHandlerMock';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

const getRuleModel = jest.fn().mockImplementation(() => Promise.resolve(ruleHandlerMock));

describe('useRuleModelQuery', () => {
  it('Calls getRuleModel with correct parameters', async () => {
    await renderAndWaitForSuccess();
    expect(getRuleModel).toHaveBeenCalledTimes(1);
    expect(getRuleModel).toHaveBeenCalledWith(org, app, selectedLayoutSet);
  });

  it('Parses file correctly and returns an array of rules and conditions', async () => {
    const { result } = await renderAndWaitForSuccess();
    expect(result.current.data).toEqual([
      {
        name: rule1Name,
        inputs: {
          [rule1Input1Name]: rule1Input1Label,
          [rule1Input2Name]: rule1Input2Label,
        },
        type: 'rule',
      },
      {
        name: rule2Name,
        inputs: {
          [rule2Input1Name]: rule2Input1Label,
          [rule2Input2Name]: rule2Input2Label,
        },
        type: 'rule',
      },
      {
        name: condition1Name,
        inputs: { [condition1Input1Name]: condition1Input1Label },
        type: 'condition',
      },
      {
        name: condition2Name,
        inputs: { [condition2Input1Name]: condition2Input1Label },
        type: 'condition',
      },
      {
        name: condition3Name,
        inputs: { [condition3Input1Name]: condition3Input1Label },
        type: 'condition',
      },
    ]);
  });
});

const renderAndWaitForSuccess = async (queries: Partial<ServicesContextProps> = {}) => {
  const { renderHookResult } = renderHookWithMockStore(
    {},
    { getRuleModel },
  )(() => useRuleModelQuery(org, app, selectedLayoutSet));
  await waitFor(() => expect(renderHookResult.result.current.isSuccess).toBe(true));
  return renderHookResult;
};
