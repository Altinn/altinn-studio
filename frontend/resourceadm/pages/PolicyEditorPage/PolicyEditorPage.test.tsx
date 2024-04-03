import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import type { PolicyEditorPageProps } from './PolicyEditorPage';
import { PolicyEditorPage } from './PolicyEditorPage';
import { textMock } from '../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MemoryRouter } from 'react-router-dom';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import type { Policy, PolicyAction, PolicySubject } from '@altinn/policy-editor';

const mockResourceId: string = 'r1';
const mockSelectedContext: string = 'test';
const mockId: string = 'page-content-policy';

const mockPolicy: Policy = {
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
    subjectId: 's3',
    subjectTitle: 'Subject 3',
    subjectSource: 'sub3',
    subjectDescription: 'The third subject',
  },
];

const getPolicy = jest.fn().mockImplementation(() => Promise.resolve({}));
const getPolicyActions = jest.fn().mockImplementation(() => Promise.resolve([]));
const getPolicySubjects = jest.fn().mockImplementation(() => Promise.resolve([]));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    resourceId: mockResourceId,
    selectedContext: mockSelectedContext,
  }),
}));

const defaultProps: PolicyEditorPageProps = {
  id: mockId,
  showAllErrors: false,
};

describe('PolicyEditorPage', () => {
  afterEach(jest.clearAllMocks);

  it('fetches policy on mount', () => {
    renderPolicyEditorPage();
    expect(getPolicy).toHaveBeenCalledTimes(1);
  });

  it('fetches actions on mount', () => {
    renderPolicyEditorPage();
    expect(getPolicyActions).toHaveBeenCalledTimes(1);
  });

  it('fetches subjects on mount', () => {
    renderPolicyEditorPage();
    expect(getPolicySubjects).toHaveBeenCalledTimes(1);
  });

  it('displays the page spinner when loading policy, actions, or subjects', async () => {
    renderPolicyEditorPage();

    expect(screen.getByTitle(textMock('resourceadm.policy_editor_spinner'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: textMock('policy_editor.rules'), level: 2 }),
    ).not.toBeInTheDocument();

    getPolicy.mockImplementation(() => Promise.resolve<Policy>(mockPolicy));

    expect(screen.getByTitle(textMock('resourceadm.policy_editor_spinner'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: textMock('policy_editor.rules'), level: 2 }),
    ).not.toBeInTheDocument();

    getPolicyActions.mockImplementation(() => Promise.resolve<PolicyAction[]>(mockActions));

    expect(screen.getByTitle(textMock('resourceadm.policy_editor_spinner'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: textMock('policy_editor.rules'), level: 2 }),
    ).not.toBeInTheDocument();

    getPolicySubjects.mockImplementation(() => Promise.resolve<PolicySubject[]>(mockSubjects));

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.policy_editor_spinner')),
    );

    expect(screen.getByText(textMock('policy_editor.rules'))).toBeInTheDocument();
  });
});

const renderPolicyEditorPage = (
  props: Partial<PolicyEditorPageProps> = {},
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    getPolicy,
    getPolicyActions,
    getPolicySubjects,
    ...queries,
  };
  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <PolicyEditorPage {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
