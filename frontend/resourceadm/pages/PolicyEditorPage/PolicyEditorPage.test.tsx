import React from 'react';
import { render as rtlRender, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { PolicyEditorPage } from './PolicyEditorPage';
import { textMock } from '../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { QueryClient } from '@tanstack/react-query';
import { Policy, PolicyAction, PolicySubject } from '@altinn/policy-editor';

const mockResourceId: string = 'r1';
const mockSelectedContext: string = 'test';

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
const getPolicyActions = jest.fn().mockImplementation(() => Promise.resolve({}));
const getPolicySubjects = jest.fn().mockImplementation(() => Promise.resolve({}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    resourceId: mockResourceId,
    selectedContext: mockSelectedContext,
  }),
}));

describe('PolicyEditorPage', () => {
  afterEach(jest.clearAllMocks);

  it('fetches policy on mount', () => {
    render();
    expect(getPolicy).toHaveBeenCalledTimes(1);
  });

  it('fetches actions on mount', () => {
    render();
    expect(getPolicyActions).toHaveBeenCalledTimes(1);
  });

  it('fetches subjects on mount', () => {
    render();
    expect(getPolicySubjects).toHaveBeenCalledTimes(1);
  });

  it('displays the page spinner when loading policy, actions, or subjects', async () => {
    render();

    expect(screen.getByTitle(textMock('resourceadm.policy_editor_spinner'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: textMock('policy_editor.rules'), level: 2 })
    ).not.toBeInTheDocument();

    getPolicy.mockImplementation(() => Promise.resolve(mockPolicy));

    expect(screen.getByTitle(textMock('resourceadm.policy_editor_spinner'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: textMock('policy_editor.rules'), level: 2 })
    ).not.toBeInTheDocument();

    getPolicyActions.mockImplementation(() => Promise.resolve(mockActions));

    expect(screen.getByTitle(textMock('resourceadm.policy_editor_spinner'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: textMock('policy_editor.rules'), level: 2 })
    ).not.toBeInTheDocument();

    getPolicySubjects.mockImplementation(() => Promise.resolve(mockSubjects));

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('resourceadm.policy_editor_spinner'))
    );

    expect(
      screen.getByRole('heading', { name: textMock('policy_editor.rules'), level: 2 })
    ).toBeInTheDocument();
  });
});

const render = (
  showAllErrors: boolean = false,
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock()
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getPolicy,
    getPolicyActions,
    getPolicySubjects,
    ...queries,
  };
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <PolicyEditorPage showAllErrors={showAllErrors} />
      </ServicesContextProvider>
    </MemoryRouter>
  );
};
