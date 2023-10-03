import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { PolicyTab, PolicyTabProps } from './PolicyTab';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { Policy } from '@altinn/policy-editor';
import userEvent from '@testing-library/user-event';
import { useAppPolicyMutation } from 'app-development/hooks/mutations';
import { mockPolicy } from '../../../mocks/policyMock';

const mockApp: string = 'app';
const mockOrg: string = 'org';

jest.mock('../../../../../../hooks/mutations/useAppPolicyMutation');
const updateAppPolicyMutation = jest.fn();
const mockUpdateAppPolicyMutation = useAppPolicyMutation as jest.MockedFunction<
  typeof useAppPolicyMutation
>;
mockUpdateAppPolicyMutation.mockReturnValue({
  mutate: updateAppPolicyMutation,
} as unknown as UseMutationResult<void, unknown, Policy, unknown>);

describe('PolicyTab', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  const defaultProps: PolicyTabProps = {
    policy: mockPolicy,
    org: mockOrg,
    app: mockApp,
  };

  it('displays the PolicyEditor component with the provided policy and data', async () => {
    render({}, createQueryClientMock(), defaultProps);

    // Fix to remove act error
    await act(() => user.tab());

    const elementInPolicyEditor = screen.getByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_app') })
    );
    expect(elementInPolicyEditor).toBeInTheDocument();
  });

  it('should update app policy when "onSave" is called', async () => {
    render({}, createQueryClientMock(), defaultProps);

    const addButton = screen.getByRole('button', {
      name: textMock('policy_editor.card_button_text'),
    });

    await act(() => user.click(addButton));

    expect(updateAppPolicyMutation).toHaveBeenCalledTimes(1);
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
