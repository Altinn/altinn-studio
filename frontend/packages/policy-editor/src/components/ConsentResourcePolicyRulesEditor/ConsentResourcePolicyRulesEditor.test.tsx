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
import { emptyPolicyRule } from '../../utils';

const resourceId = 'consent-resource';
const defaultRules = [
  {
    ...emptyPolicyRule,
    actions: ['consent'],
    ruleId: '1',
    resources: [[{ id: resourceId, type: 'urn:altinn:resource' }]],
  },
  {
    ...emptyPolicyRule,
    subject: ['organization'],
    actions: ['requestconsent'],
    ruleId: '2',
    resources: [[{ id: resourceId, type: 'urn:altinn:resource' }]],
  },
];
const accessListSubjects = [
  {
    subjectId: 'test-liste',
    subjectSource: 'altinn:accesslist:ttd',
    subjectTitle: 'Testliste',
    subjectDescription: 'Dette er en testliste',
  },
];

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
          ruleId: '1',
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

  it('should set all organizations subject in rule for request consent after all organizations radio is clicked', async () => {
    const user = userEvent.setup();
    const rules = [defaultRules[0], { ...defaultRules[1], subject: [] }];
    const onSaveFn = jest.fn();
    renderConsentResourcePolicyRulesEditor({ policyRules: rules, savePolicy: onSaveFn });

    const allOrganizationsRadio = screen.getByRole('radio', {
      name: textMock('policy_editor.consent_resource_all_organizations'),
    });
    await user.click(allOrganizationsRadio);

    expect(onSaveFn).toHaveBeenCalledWith([
      defaultRules[0],
      { ...defaultRules[1], subject: ['organization'] },
    ]);
  });

  it('should set all subjects in rule for request consent to empty array after chosen organizations radio is clicked', async () => {
    const user = userEvent.setup();
    const rules = [defaultRules[0], { ...defaultRules[1], subject: ['organization'] }];
    const onSaveFn = jest.fn();
    renderConsentResourcePolicyRulesEditor({ policyRules: rules, savePolicy: onSaveFn });

    const chosenOrganizationsRadio = screen.getByRole('radio', {
      name: textMock('policy_editor.consent_resource_access_list_organizations'),
    });
    await user.click(chosenOrganizationsRadio);

    expect(onSaveFn).toHaveBeenCalledWith([defaultRules[0], { ...defaultRules[1], subject: [] }]);
  });

  it('should set access list subject in rule for request consent after access list checkbox is clicked', async () => {
    const user = userEvent.setup();
    const rules = [defaultRules[0], { ...defaultRules[1], subject: [] }];
    const onSaveFn = jest.fn();
    renderConsentResourcePolicyRulesEditor({ policyRules: rules, savePolicy: onSaveFn });

    const accessListCheckbox = screen.getByRole('checkbox', {
      name: accessListSubjects[0].subjectTitle,
    });
    await user.click(accessListCheckbox);

    expect(onSaveFn).toHaveBeenCalledWith([
      defaultRules[0],
      { ...defaultRules[1], subject: [accessListSubjects[0].subjectId] },
    ]);
  });

  it('should display alert if no access lists available', () => {
    const rules = [defaultRules[0], { ...defaultRules[1], subject: [] }];
    renderConsentResourcePolicyRulesEditor({ policyRules: rules, subjects: [] });

    expect(
      screen.getByText(textMock('policy_editor.consent_resource_no_access_lists')),
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
        subjects: accessListSubjects,
        policyRules: defaultRules,
        ...policyEditorContextProps,
      }}
    >
      <ConsentResourcePolicyRulesEditor />
    </PolicyEditorContext.Provider>,
  );
};
