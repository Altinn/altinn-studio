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
import {
  ACCESS_LIST_SUBJECT_SOURCE,
  CONSENT_ACTION,
  REQUEST_CONSENT_ACTION,
} from '@altinn/policy-editor/constants';

const accessListSubject = {
  id: 'test-liste',
  description: 'Dette er en testliste',
  legacyUrn: `${ACCESS_LIST_SUBJECT_SOURCE}:ttd:test-liste`,
  urn: `${ACCESS_LIST_SUBJECT_SOURCE}:ttd:test-liste`,
  name: 'Testliste',
  legacyRoleCode: 'test-liste',
  provider: {
    id: '',
    code: 'sys-accesslist',
    name: '',
  },
};

const accessListSubject2 = {
  id: 'test-liste2',
  description: 'Dette er en testliste2',
  legacyUrn: `${ACCESS_LIST_SUBJECT_SOURCE}:ttd:test-liste2`,
  urn: `${ACCESS_LIST_SUBJECT_SOURCE}:ttd:test-liste2`,
  name: 'Testliste2',
  legacyRoleCode: 'test-liste2',
  provider: {
    id: '',
    code: 'sys-accesslist',
    name: '',
  },
};

const resourceId = 'consent-resource';
const requestConsentRule = {
  ...emptyPolicyRule,
  subject: [],
  actions: [REQUEST_CONSENT_ACTION],
  ruleId: '1',
  resources: [[{ id: resourceId, type: 'urn:altinn:resource' }]],
};
const acceptConsentRule = {
  ...emptyPolicyRule,
  subject: [],
  actions: [CONSENT_ACTION],
  ruleId: '2',
  resources: [[{ id: resourceId, type: 'urn:altinn:resource' }]],
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

  it('should deselect all access lists after no access list restriction checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onSaveFn = jest.fn();
    renderConsentResourcePolicyRulesEditor({ savePolicy: onSaveFn });

    const accessListCheckbox = screen.getByRole('checkbox', {
      name: accessListSubject.name,
    });
    await user.click(accessListCheckbox);

    const allOrganizationsCheckbox = screen.getByRole('checkbox', {
      name: textMock('policy_editor.consent_resource_all_organizations'),
    });
    await user.click(allOrganizationsCheckbox);

    expect(onSaveFn).toHaveBeenCalledWith([
      { ...requestConsentRule, subject: [organizationSubject.urn] },
      acceptConsentRule,
    ]);
  });

  it('should set access list subjects in rule for request consent after access list checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onSaveFn = jest.fn();
    renderConsentResourcePolicyRulesEditor({ savePolicy: onSaveFn });

    const accessListCheckbox = screen.getByRole('checkbox', {
      name: accessListSubject.name,
    });
    await user.click(accessListCheckbox);

    const accessListCheckbox2 = screen.getByRole('checkbox', {
      name: accessListSubject2.name,
    });
    await user.click(accessListCheckbox2);

    expect(onSaveFn).toHaveBeenCalledWith([
      {
        ...requestConsentRule,
        subject: [accessListSubject.urn, accessListSubject2.urn],
      },
      acceptConsentRule,
    ]);
  });

  it('should deselect no access list restriction checkbox in rule for request consent after access list checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onSaveFn = jest.fn();
    renderConsentResourcePolicyRulesEditor({ savePolicy: onSaveFn });

    const allOrganizationsCheckbox = screen.getByRole('checkbox', {
      name: textMock('policy_editor.consent_resource_all_organizations'),
    });
    await user.click(allOrganizationsCheckbox);

    const accessListCheckbox = screen.getByRole('checkbox', {
      name: accessListSubject.name,
    });
    await user.click(accessListCheckbox);

    expect(onSaveFn).toHaveBeenCalledWith([
      { ...requestConsentRule, subject: [accessListSubject.urn] },
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
        subjects: [accessListSubject, accessListSubject2, organizationSubject],
        policyRules: [requestConsentRule, acceptConsentRule],
        ...policyEditorContextProps,
      }}
    >
      <ConsentResourcePolicyRulesEditor />
    </PolicyEditorContext.Provider>,
  );
};
