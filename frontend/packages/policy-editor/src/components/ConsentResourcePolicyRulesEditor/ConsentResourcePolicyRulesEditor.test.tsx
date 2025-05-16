import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockPolicyEditorContextValue } from '../../../test/mocks/policyEditorContextMock';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../contexts/PolicyEditorContext';
import { ConsentResourcePolicyRulesEditor } from './ConsentResourcePolicyRulesEditor';
import { emptyPolicyRule, organizationSubject } from '../../utils';

const resourceId = 'consent-resource';
const requestConsentRule = {
  ...emptyPolicyRule,
  subject: [],
  actions: ['requestconsent'],
  ruleId: '1',
  resources: [[{ id: resourceId, type: 'urn:altinn:resource' }]],
};
const acceptConsentRule = {
  ...emptyPolicyRule,
  subject: [],
  actions: ['consent'],
  ruleId: '2',
  resources: [[{ id: resourceId, type: 'urn:altinn:resource' }]],
};

const accessListSubject = {
  subjectId: 'test-liste',
  subjectSource: 'altinn:accesslist:ttd',
  subjectTitle: 'Testliste',
  subjectDescription: 'Dette er en testliste',
};

describe('ConsentResourcePolicyRulesEditor', () => {
  afterEach(jest.clearAllMocks);

  it('should display rule for consenting', () => {
    renderConsentResourcePolicyRulesEditor();

    expect(
      screen.getByText(textMock('policy_editor.consent_resource_consent_header')),
    ).toBeInTheDocument();
  });

  it('should display error if no subject is set in rule for consenting', () => {
    renderConsentResourcePolicyRulesEditor({ showAllErrors: true });

    expect(
      screen.getByText(
        textMock('policy_editor.policy_rule_missing_1', {
          ruleId: '2',
          missing: textMock('policy_editor.policy_rule_missing_subjects'),
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should display rule for request consent', () => {
    renderConsentResourcePolicyRulesEditor();

    expect(
      screen.getByText(textMock('policy_editor.consent_resource_request_consent_header')),
    ).toBeInTheDocument();
  });

  it('should set all organizations subject in rule for request consent after all organizations checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onSaveFn = jest.fn();
    renderConsentResourcePolicyRulesEditor({ savePolicy: onSaveFn });

    const allOrganizationsRadio = screen.getByRole('checkbox', {
      name: textMock('policy_editor.consent_resource_all_organizations'),
    });
    await user.click(allOrganizationsRadio);

    expect(onSaveFn).toHaveBeenCalledWith([
      { ...requestConsentRule, subject: ['organization'] },
      acceptConsentRule,
    ]);
  });

  it('should set access list subject in rule for request consent after access list checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onSaveFn = jest.fn();
    renderConsentResourcePolicyRulesEditor({ savePolicy: onSaveFn });

    const accessListCheckbox = screen.getByRole('checkbox', {
      name: accessListSubject.subjectTitle,
    });
    await user.click(accessListCheckbox);

    expect(onSaveFn).toHaveBeenCalledWith([
      { ...requestConsentRule, subject: [accessListSubject.subjectId] },
      acceptConsentRule,
    ]);
  });

  it('should display alert if no access lists available', () => {
    renderConsentResourcePolicyRulesEditor({ subjects: [] });

    expect(
      screen.getByText(textMock('policy_editor.consent_resource_no_access_lists')),
    ).toBeInTheDocument();
  });

  it('should display error if no subject is chosen for request consent rule', () => {
    renderConsentResourcePolicyRulesEditor({ subjects: [], showAllErrors: true });

    expect(
      screen.getByText(textMock('policy_editor.consent_resource_request_consent_error')),
    ).toBeInTheDocument();
  });
});

const renderConsentResourcePolicyRulesEditor = (
  policyEditorContextProps: Partial<PolicyEditorContextProps> = {},
) => {
  return render(
    <PolicyEditorContext.Provider
      value={{
        ...mockPolicyEditorContextValue,
        subjects: [accessListSubject, organizationSubject],
        policyRules: [requestConsentRule, acceptConsentRule],
        ...policyEditorContextProps,
      }}
    >
      <ConsentResourcePolicyRulesEditor />
    </PolicyEditorContext.Provider>,
  );
};
