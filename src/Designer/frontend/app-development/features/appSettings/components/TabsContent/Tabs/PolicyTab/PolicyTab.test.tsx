import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { PolicyTab } from './PolicyTab';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from '../../../../../../test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { useAppPolicyMutation } from '../../../../../../hooks/mutations';
import userEvent from '@testing-library/user-event';
import type { UseMutationResult } from '@tanstack/react-query';
import type { Policy, PolicyAction, PolicySubject } from 'packages/policy-editor';

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
    subjectId: 's1',
    subjectTitle: 'Subject 1',
    subjectSource: 'sub1',
    subjectDescription: 'The first subject',
  },
  {
    subjectId: 's2',
    subjectTitle: 'Subject 2',
    subjectSource: 'sub2',
    subjectDescription: 'The second subject',
  },
  {
    subjectId: '[org]',
    subjectSource: '[org]',
    subjectTitle: '[org]',
    subjectDescription: '[org]',
  },
];

jest.mock('../../../../../../hooks/mutations/useAppPolicyMutation');
const updateAppPolicyMutation = jest.fn();
const mockUpdateAppPolicyMutation = useAppPolicyMutation as jest.MockedFunction<
  typeof useAppPolicyMutation
>;
mockUpdateAppPolicyMutation.mockReturnValue({
  mutate: updateAppPolicyMutation,
} as unknown as UseMutationResult<void, Error, Policy, unknown>);

describe('PolicyTab', () => {
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
    const getPolicySubjects = jest.fn().mockImplementation(() => Promise.resolve({}));
    renderPolicyTab({ getPolicySubjects });
    expect(getPolicySubjects).toHaveBeenCalledTimes(1);
  });

  it.each(['getAppPolicy', 'getPolicyActions', 'getPolicySubjects'])(
    'shows an error message if an error occured on the %s query',
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
  });
});

const renderPolicyTab = (queries: Partial<ServicesContextProps> = {}) => {
  const queryClient = createQueryClientMock();
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
