import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { useRuleConfigMutation } from './useRuleConfigMutation';
import type { RuleConfig } from 'app-shared/types/RuleConfig';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;
const newRuleConfig: RuleConfig = {
  data: {
    ruleConnection: {
      ruleConnection1: {
        selectedFunction: 'selectedFunction1',
        inputParams: {},
        outParams: {},
      },
    },
    conditionalRendering: {},
  },
};

describe('useRuleConfigMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls saveRuleConfig with correct arguments and payload', async () => {
    const { result } = await render();
    await result.current.mutateAsync(newRuleConfig);
    expect(queriesMock.saveRuleConfig).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveRuleConfig).toHaveBeenCalledWith(
      org,
      app,
      selectedLayoutSet,
      newRuleConfig,
    );
  });
});

const render = async () =>
  renderHookWithProviders(() => useRuleConfigMutation(org, app, selectedLayoutSet));
