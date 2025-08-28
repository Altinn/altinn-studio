import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyEditorAlert } from './PolicyEditorAlert';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../contexts/PolicyEditorContext';
import { mockPolicyEditorContextValue } from '../../../test/mocks/policyEditorContextMock';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('PolicyEditorAlert', () => {
  afterEach(jest.clearAllMocks);

  it('only displays the alert title when the policy has no rules', async () => {
    renderPolicyEditorAlert({ policyRules: [] });
    const alertTextApp = screen.getByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_app') }),
    );

    expect(alertTextApp).toBeInTheDocument();
  });

  it('displays the alert title for app when usagetype is app', async () => {
    const user = userEvent.setup();
    renderPolicyEditorAlert({ policyRules: [] });

    const alertTextApp = screen.getByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_app') }),
    );
    const alertTextResource = screen.queryByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_resource') }),
    );

    await user.tab();

    expect(alertTextApp).toBeInTheDocument();
    expect(alertTextResource).not.toBeInTheDocument();
  });

  it('displays the alert title for resource when usagetype is not app', async () => {
    const user = userEvent.setup();
    renderPolicyEditorAlert({ policyRules: [], usageType: 'resource' });

    const alertTextApp = screen.queryByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_app') }),
    );
    const alertTextResource = screen.getByText(
      textMock('policy_editor.alert', { usageType: textMock('policy_editor.alert_resource') }),
    );

    await user.tab();

    expect(alertTextApp).not.toBeInTheDocument();
    expect(alertTextResource).toBeInTheDocument();
  });
});

const renderPolicyEditorAlert = (
  policyEditorContextProps: Partial<PolicyEditorContextProps> = {},
) => {
  return render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      <PolicyEditorAlert />
    </PolicyEditorContext.Provider>,
  );
};
