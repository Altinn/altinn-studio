import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { PolicyTab } from './PolicyTab';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from 'app-development/test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { useAppPolicyMutation } from 'app-development/hooks/mutations';
import userEvent from '@testing-library/user-event';
import { QueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { Policy, PolicyAction, PolicySubject } from '@altinn/policy-editor';
import { INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE } from '@altinn/policy-editor/constants';
import { org, app } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';

export const mockPolicy: Policy = {
  rules: [{ ruleId: '1', description: '', subject: [], actions: [], resources: [[]] }],
  requiredAuthenticationLevelEndUser: '3',
  requiredAuthenticationLevelOrg: '3',
};

const mockActions: PolicyAction[] = [
  { actionId: 'a1', actionTitle: 'Action 1', actionDescription: 'The first action' },
  { actionId: 'a2', actionTitle: 'Action 2', actionDescription: 'The second action' },
  { actionId: 'a3', actionTitle: 'Action 3', actionDescription: 'The third action' },
];

const mockSubjects: PolicySubject[] = [
  {
    id: 'd41d67f2-15b0-4c82-95db-b8d5baaa14a4',
    name: 'Subject 1',
    description: 'The first subject',
    urn: 'urn:altinn:rolecode:s1',
    legacyRoleCode: 'VARA',
    legacyUrn: 'urn:altinn:rolecode:s1',
    provider: {
      id: '0195ea92-2080-758b-89db-7735c4f68320',
      name: 'Altinn 2',
      code: 'sys-altinn2',
    },
  },
  {
    id: '1f8a2518-9494-468a-80a0-7405f0daf9e9',
    name: 'Subject 2',
    description: 'The second subject',
    urn: 'urn:altinn:rolecode:s2',
    legacyRoleCode: 'OBS',
    legacyUrn: 'urn:altinn:rolecode:s2',
    provider: {
      id: '0195ea92-2080-758b-89db-7735c4f68320',
      name: 'Altinn 2',
      code: 'sys-altinn2',
    },
  },
  {
    id: '[org]',
    name: 'Tjenesteeier',
    description: '[org]',
    legacyRoleCode: '[org]',
    urn: 'urn:altinn:org:[org]',
    legacyUrn: 'urn:altinn:org:[org]',
    provider: {
      code: INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE,
      id: '',
      name: 'Intern',
    },
  },
];

jest.mock('app-development/hooks/mutations/useAppPolicyMutation');
const updateAppPolicyMutation = jest.fn();
const saveVersionedPolicy = jest.fn(async (policy: Policy) => policy);
const mockUpdateAppPolicyMutation = useAppPolicyMutation as jest.MockedFunction<
  typeof useAppPolicyMutation
>;

describe('PolicyTab', () => {
  beforeEach(() => {
    mockUpdateAppPolicyMutation.mockReturnValue({
      mutate: updateAppPolicyMutation,
      mutateAsync: saveVersionedPolicy,
    } as unknown as UseMutationResult<Policy, Error, Policy, unknown>);
  });
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    renderPolicyTab();
    expect(screen.getByText(textMock('app_settings.loading_content'))).toBeInTheDocument();
  });

  it('fetches policy on mount', () => {
    const getAppPolicy = jest.fn().mockImplementation(() => Promise.resolve({}));
    renderPolicyTab({ getAppPolicy });
    expect(getAppPolicy).toHaveBeenCalledTimes(1);
  });

  it('fetches actions on mount', () => {
    const getPolicyActions = jest.fn().mockImplementation(() => Promise.resolve({}));
    renderPolicyTab({ getPolicyActions });
    expect(getPolicyActions).toHaveBeenCalledTimes(1);
  });

  it('fetches subjects on mount', () => {
    const getPolicySubjects = jest.fn().mockImplementation(() => Promise.resolve(null));
    renderPolicyTab({ getPolicySubjects });
    expect(getPolicySubjects).toHaveBeenCalledTimes(1);
  });

  it.each(['getAppPolicy', 'getPolicyActions', 'getPolicySubjects'])(
    'shows an error message if an error occurred on the %s query',
    async (queryName) => {
      const errorMessage = 'error-message-test';
      await resolveAndWaitForSpinnerToDisappear({
        [queryName]: () => Promise.reject({ message: errorMessage }),
      });

      expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
      expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    },
  );

  it('displays the PolicyEditor component with the provided policy and data', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    await user.tab();

    const elementInPolicyEditor = screen.getByText(textMock('policy_editor.rules'));
    expect(elementInPolicyEditor).toBeInTheDocument();
  });

  it('displays the PolicyEditor component with alert if policy rule list is empty', async () => {
    const user = userEvent.setup();
    const getAppPolicy = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...mockPolicy, rules: [] }));
    await resolveAndWaitForSpinnerToDisappear({ getAppPolicy });

    await user.tab();

    const elementInPolicyEditor = screen.getByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_app') }),
    );
    expect(elementInPolicyEditor).toBeInTheDocument();
  });

  it('should update app policy when "onSave" is called', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const rulesTab = screen.getByRole('tab', { name: textMock('policy_editor.rules_edit') });
    await user.click(rulesTab);

    const addButton = screen.getByRole('button', {
      name: textMock('policy_editor.card_button_text'),
    });

    await user.click(addButton);

    expect(updateAppPolicyMutation).toHaveBeenCalledTimes(1);
    expect(saveVersionedPolicy).not.toHaveBeenCalled();
  });

  it('saves a v9 policy with its loaded revision', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear({
      getAppPolicy: jest.fn().mockResolvedValue({ ...mockPolicy, revision: '"loaded-revision"' }),
    });

    await user.click(screen.getByRole('tab', { name: textMock('policy_editor.rules_edit') }));
    await user.click(
      screen.getByRole('button', { name: textMock('policy_editor.card_button_text') }),
    );

    expect(saveVersionedPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ revision: '"loaded-revision"' }),
    );
    expect(updateAppPolicyMutation).not.toHaveBeenCalled();
  });

  it('initializes a v9 policy from the mount refetch', async () => {
    const user = userEvent.setup();
    restoreActualAppPolicyMutation();
    const policyWithRule = (revision: string, description: string): Policy => ({
      ...mockPolicy,
      revision,
      rules: [{ ...mockPolicy.rules[0], description }],
    });
    const cachedPolicy = policyWithRule('"cached-revision"', 'Cached rule');
    const currentPolicy = policyWithRule('"current-revision"', 'Current rule');
    // Production refetches stale data when the tab mounts.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData([QueryKey.AppPolicy, org, app], cachedPolicy);
    queryClient.setQueryData([QueryKey.ResourcePolicyActions, org, app], mockActions);
    queryClient.setQueryData([QueryKey.ResourcePolicySubjects, org, app], mockSubjects);
    queryClient.setQueryData([QueryKey.ResourcePolicyAccessPackages, org], []);
    const updateAppPolicy = jest.fn().mockResolvedValue(currentPolicy);

    renderPolicyTab(
      {
        getAppPolicy: jest.fn().mockResolvedValue(currentPolicy),
        getPolicyActions: jest.fn().mockResolvedValue(mockActions),
        getPolicySubjects: jest.fn().mockResolvedValue(mockSubjects),
        updateAppPolicy,
      },
      queryClient,
    );
    expect(queryPageSpinner()).toBeInTheDocument();
    await waitForElementToBeRemoved(queryPageSpinner);

    const description = await openRuleDescription(user, 'Current rule');
    expect(description).toHaveValue('Current rule');
    await user.type(description, ' edited');
    await user.tab();
    await waitFor(() =>
      expect(updateAppPolicy).toHaveBeenCalledWith(
        org,
        app,
        expect.objectContaining({ revision: '"current-revision"' }),
      ),
    );
  });

  it('preserves a v9 draft through reload failure and saves with the reloaded revision', async () => {
    const user = userEvent.setup();
    restoreActualAppPolicyMutation();
    const initialPolicy: Policy = {
      ...mockPolicy,
      revision: '"initial-revision"',
      rules: [{ ...mockPolicy.rules[0], description: 'Original rule' }],
    };
    const latestPolicy: Policy = {
      ...initialPolicy,
      revision: '"latest-revision"',
      rules: [{ ...initialPolicy.rules[0], description: 'Latest rule' }],
    };
    const getAppPolicy = jest
      .fn()
      .mockResolvedValueOnce(initialPolicy)
      .mockRejectedValueOnce(new Error('Reload failed'))
      .mockResolvedValue(latestPolicy);
    const updateAppPolicy = jest
      .fn()
      .mockRejectedValueOnce({ response: { status: 412 } })
      .mockResolvedValue(latestPolicy);
    await resolveAndWaitForSpinnerToDisappear({ getAppPolicy, updateAppPolicy });
    const description = await openRuleDescription(user, 'Original rule');
    await user.clear(description);
    await user.type(description, 'Local draft');
    await user.tab();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('app_settings.policy_save_conflict'),
    );
    expect(description).toHaveValue('Local draft');
    expect(description).toBeDisabled();
    expect(updateAppPolicy).toHaveBeenCalledWith(
      org,
      app,
      expect.objectContaining({ revision: '"initial-revision"' }),
    );
    const reloadButton = screen.getByRole('button', {
      name: textMock('app_settings.policy_reload'),
    });

    await user.click(reloadButton);
    await waitFor(() => expect(reloadButton).toBeEnabled());
    expect(getAppPolicy).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(description).toHaveValue('Local draft');
    expect(description).toBeDisabled();

    await user.click(reloadButton);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    const currentDescription = await openRuleDescription(user, 'Latest rule');
    expect(currentDescription).toHaveValue('Latest rule');
    expect(currentDescription).toBeEnabled();
    await user.type(currentDescription, ' edited');
    await user.tab();
    await waitFor(() =>
      expect(updateAppPolicy).toHaveBeenLastCalledWith(
        org,
        app,
        expect.objectContaining({
          revision: '"latest-revision"',
          rules: [expect.objectContaining({ description: 'Latest rule edited' })],
        }),
      ),
    );
    expect(updateAppPolicy).toHaveBeenCalledTimes(2);
  });

  it('shows a generic save error for server failures', async () => {
    const user = userEvent.setup();
    restoreActualAppPolicyMutation();
    const updateAppPolicy = jest.fn().mockRejectedValue({ response: { status: 500 } });
    await resolveAndWaitForSpinnerToDisappear({
      getAppPolicy: jest.fn().mockResolvedValue({ ...mockPolicy, revision: '"loaded-revision"' }),
      updateAppPolicy,
    });

    await user.click(screen.getByRole('tab', { name: textMock('policy_editor.rules_edit') }));
    await user.click(
      screen.getByRole('button', { name: textMock('policy_editor.card_button_text') }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('app_settings.policy_save_failed'),
    );
    expect(
      screen.getByRole('button', { name: textMock('app_settings.policy_reload') }),
    ).toBeInTheDocument();
  });
});

function restoreActualAppPolicyMutation(): void {
  mockUpdateAppPolicyMutation.mockImplementation(
    jest.requireActual('app-development/hooks/mutations/useAppPolicyMutation').useAppPolicyMutation,
  );
}

async function openRuleDescription(user: ReturnType<typeof userEvent.setup>, description: string) {
  await user.click(screen.getByRole('tab', { name: textMock('policy_editor.rules_edit') }));
  await user.click(screen.getByRole('button', { name: new RegExp(description) }));
  return screen.getByRole('textbox', {
    name: textMock('policy_editor.rule_card_description_title'),
  });
}

const renderPolicyTab = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(allQueries, queryClient)(<PolicyTab />);
};

const resolveAndWaitForSpinnerToDisappear = async (queries: Partial<ServicesContextProps> = {}) => {
  const getAppPolicy = jest.fn().mockImplementation(() => Promise.resolve(mockPolicy));
  const getPolicyActions = jest.fn().mockImplementation(() => Promise.resolve(mockActions));
  const getPolicySubjects = jest.fn().mockImplementation(() => Promise.resolve(mockSubjects));

  renderPolicyTab({
    getAppPolicy,
    getPolicyActions,
    getPolicySubjects,
    ...queries,
  });
  await waitForElementToBeRemoved(queryPageSpinner);
};

const queryPageSpinner = () => screen.queryByText(textMock('app_settings.loading_content'));
