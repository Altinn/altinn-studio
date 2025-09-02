import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import type { PolicyEditorPageProps } from './PolicyEditorPage';
import { PolicyEditorPage } from './PolicyEditorPage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { MemoryRouter } from 'react-router-dom';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import type { Policy, PolicyAction, PolicySubject } from '@altinn/policy-editor';
import type { Resource } from 'app-shared/types/ResourceAdm';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const mockResourceId: string = 'r1';
const mockOrg: string = 'test';
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
    id: 'd41d67f2-15b0-4c82-95db-b8d5baaa14a4',
    name: 'Varamedlem',
    description: 'Fysisk- eller juridisk person som er stedfortreder for et styremedlem',
    urn: 'urn:altinn:rolecode:VARA',
    legacyRoleCode: 'VARA',
    legacyUrn: 'urn:altinn:rolecode:VARA',
    provider: {
      id: '0195ea92-2080-758b-89db-7735c4f68320',
      name: 'Altinn 2',
      code: 'sys-altinn2',
    },
  },
  {
    id: '1f8a2518-9494-468a-80a0-7405f0daf9e9',
    name: 'Observatør',
    description: 'Fysisk person som deltar i styremøter i en virksomhet, men uten stemmerett',
    urn: 'urn:altinn:rolecode:OBS',
    legacyRoleCode: 'OBS',
    legacyUrn: 'urn:altinn:rolecode:OBS',
    provider: {
      id: '0195ea92-2080-758b-89db-7735c4f68320',
      name: 'Altinn 2',
      code: 'sys-altinn2',
    },
  },
  {
    id: 'f045ffda-dbdc-41da-b674-b9b276ad5b01',
    name: 'Styremedlem',
    description: 'Fysisk- eller juridisk person som inngår i et styre',
    urn: 'urn:altinn:rolecode:MEDL',
    legacyRoleCode: 'MEDL',
    legacyUrn: 'urn:altinn:rolecode:MEDL',
    provider: {
      id: '0195ea92-2080-758b-89db-7735c4f68320',
      name: 'Altinn 2',
      code: 'sys-altinn2',
    },
  },
];

const getPolicy = jest.fn().mockImplementation(() => Promise.resolve({}));
const getPolicyActions = jest.fn().mockImplementation(() => Promise.resolve([]));
const getPolicySubjects = jest.fn().mockImplementation(() => Promise.resolve([]));
const getResource = jest.fn().mockImplementation(() => Promise.resolve({}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    resourceId: mockResourceId,
    org: mockOrg,
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

  it('displays the page spinner when loading access lists for consent resource', async () => {
    getResource.mockImplementation(() =>
      Promise.resolve<Resource>({
        identifier: 'test-resource',
        title: {
          nb: 'test',
          nn: '',
          en: '',
        },
        resourceType: 'Consent',
      }),
    );

    renderPolicyEditorPage();

    expect(screen.getByTitle(textMock('resourceadm.policy_editor_spinner'))).toBeInTheDocument();

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
    ...queriesMock,
    getPolicy,
    getPolicyActions,
    getPolicySubjects,
    getResource,
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
