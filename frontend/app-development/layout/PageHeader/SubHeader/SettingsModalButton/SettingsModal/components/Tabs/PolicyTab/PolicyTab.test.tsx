import React from 'react';
import { render as rtlRender, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { PolicyTab } from './PolicyTab';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { QueryClient, UseMutationResult } from '@tanstack/react-query';
import type { Policy, PolicyAction, PolicySubject } from '@altinn/policy-editor';
import userEvent from '@testing-library/user-event';
import { useAppPolicyMutation } from 'app-development/hooks/mutations';
import { mockPolicy } from '../../../mocks/policyMock';
import { app, org } from '@studio/testing/testids';
import { MemoryRouter } from 'react-router-dom';

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

jest.mock('app-development/hooks/mutations/useAppPolicyMutation');
const updateAppPolicyMutation = jest.fn();
const mockUpdateAppPolicyMutation = useAppPolicyMutation as jest.MockedFunction<
  typeof useAppPolicyMutation
>;
mockUpdateAppPolicyMutation.mockReturnValue({
  mutate: updateAppPolicyMutation,
} as unknown as UseMutationResult<void, Error, Policy, unknown>);

const getAppPolicy = jest.fn().mockImplementation(() => Promise.resolve({}));
const getPolicyActions = jest.fn().mockImplementation(() => Promise.resolve({}));
const getPolicySubjects = jest.fn().mockImplementation(() => Promise.resolve({}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => {
    return { org, app };
  },
}));

describe('PolicyTab', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    render();

    expect(screen.getByTitle(textMock('settings_modal.loading_content'))).toBeInTheDocument();
  });

  it('fetches policy on mount', () => {
    render();
    expect(getAppPolicy).toHaveBeenCalledTimes(1);
  });

  it('fetches actions on mount', () => {
    render();
    expect(getPolicyActions).toHaveBeenCalledTimes(1);
  });

  it('fetches subjects on mount', () => {
    render();
    expect(getPolicySubjects).toHaveBeenCalledTimes(1);
  });

  it.each(['getAppPolicy', 'getPolicyActions', 'getPolicySubjects'])(
    'shows an error message if an error occured on the %s query',
    async (queryName) => {
      const errorMessage = 'error-message-test';
      render({
        [queryName]: () => Promise.reject({ message: errorMessage }),
      });

      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('settings_modal.loading_content')),
      );

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
    await resolveAndWaitForSpinnerToDisappear(() => Promise.resolve({ ...mockPolicy, rules: [] }));

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

const resolveAndWaitForSpinnerToDisappear = async (mockGetAppPolicy?: () => void) => {
  getAppPolicy.mockImplementation(
    mockGetAppPolicy ? mockGetAppPolicy : () => Promise.resolve(mockPolicy),
  );
  getPolicyActions.mockImplementation(() => Promise.resolve(mockActions));
  getPolicySubjects.mockImplementation(() => Promise.resolve(mockSubjects));

  render();
  await waitForElementToBeRemoved(() =>
    screen.queryByTitle(textMock('settings_modal.loading_content')),
  );
};

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getAppPolicy,
    getPolicyActions,
    getPolicySubjects,
    ...queries,
  };

  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <PolicyTab />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
