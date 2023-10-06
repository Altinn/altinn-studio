import React from 'react';
import {
  act,
  render as rtlRender,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
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

const getAppPolicy = jest.fn().mockImplementation(() => Promise.resolve({}));

const defaultProps: PolicyTabProps = {
  org: mockOrg,
  app: mockApp,
};

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

  it('shows an error message if an error occured on the getPolicy query', async () => {
    const errorMessage = 'error-message-test';
    render({ getAppPolicy: () => Promise.reject({ message: errorMessage }) });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays the PolicyEditor component with the provided policy and data', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToRemove();

    // Fix to remove act error
    await act(() => user.tab());

    const elementInPolicyEditor = screen.getByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_app') }),
    );
    expect(elementInPolicyEditor).toBeInTheDocument();
  });

  it('should update app policy when "onSave" is called', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToRemove();

    const addButton = screen.getByRole('button', {
      name: textMock('policy_editor.card_button_text'),
    });

    await act(() => user.click(addButton));

    expect(updateAppPolicyMutation).toHaveBeenCalledTimes(1);
  });
});

const resolveAndWaitForSpinnerToRemove = async () => {
  getAppPolicy.mockImplementation(() => Promise.resolve(mockPolicy));
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
    ...queries,
  };

  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <PolicyTab {...defaultProps} />
    </ServicesContextProvider>,
  );
};
