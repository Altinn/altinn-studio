import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { PolicyTab, PolicyTabProps } from './PolicyTab';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { QueryClient } from '@tanstack/react-query';
import { Policy } from '@altinn/policy-editor';
import userEvent from '@testing-library/user-event';

const mockApp: string = 'app';
const mockOrg: string = 'org';

const mockPolicy: Policy = {
  rules: [{ ruleId: '1', description: '', subject: [], actions: [], resources: [[]] }],
  requiredAuthenticationLevelEndUser: '3',
  requiredAuthenticationLevelOrg: '3',
};

describe('PolicyTab', () => {
  afterEach(jest.clearAllMocks);

  const defaultProps: PolicyTabProps = {
    policy: mockPolicy,
    org: mockOrg,
    app: mockApp,
  };

  it('displays the PolicyEditor component with the provided policy and data', async () => {
    const user = userEvent.setup();
    render({}, createQueryClientMock(), defaultProps);

    // Fix to remove act error
    await act(() => user.tab());

    const elementInPolicyEditor = screen.getByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_app') })
    );
    expect(elementInPolicyEditor).toBeInTheDocument();
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
  props: PolicyTabProps
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <PolicyTab {...props} />
    </ServicesContextProvider>
  );
};
