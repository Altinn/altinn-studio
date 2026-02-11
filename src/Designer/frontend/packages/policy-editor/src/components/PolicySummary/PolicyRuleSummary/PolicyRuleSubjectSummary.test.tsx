import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  PolicyRuleSubjectSummary,
  type PolicyRuleSubjectSummaryProps,
} from './PolicyRuleSubjectSummary';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../../contexts/PolicyEditorContext';
import { mockAction1, mockAction2 } from '../../../../test/mocks/policyActionMocks';
import type { PolicySubject } from '../../../types';
import { INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE } from '@altinn/policy-editor/constants';

const mockSubjects: PolicySubject[] = [
  {
    id: 'd41d67f2-15b0-4c82-95db-b8d5baaa14a4',
    name: 'Subject 1',
    description: 'The first subject',
    urn: 'urn:altinn:rolecode:s1',
    legacyRoleCode: 'VARA',
    legacyUrn: 'urn:altinn:rolecode:s1',
    provider: {
      id: '0195ea92-2080-758b-89db-7735c4f68320',
      name: 'Altinn 2',
      code: 'sys-altinn2',
    },
  },
  {
    id: '[org]',
    name: 'Tjenesteeier',
    description: '[org]',
    legacyRoleCode: '[org]',
    urn: 'urn:altinn:org:[org]',
    legacyUrn: 'urn:altinn:org:[org]',
    provider: {
      code: INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE,
      id: '277ebf42-f5b6-4724-a753-15cd24f1703b',
      name: 'Intern',
    },
  },
];
const mockPolicyEditorContextValue: PolicyEditorContextProps = {
  policyRules: [
    {
      ruleId: 'r1',
      description: '',
      subject: [mockSubjects[0].urn],
      actions: [mockAction1.actionId, mockAction2.actionId],
      accessPackages: [],
      resources: [
        [
          { type: 'urn:altinn:org', id: '[org]' },
          { type: 'urn:altinn:app', id: '[app]' },
        ],
      ],
    },
  ],
  setPolicyRules: jest.fn(),
  actions: [mockAction1, mockAction2],
  subjects: mockSubjects,
  accessPackages: [],
  usageType: 'app',
  resourceType: 'urn',
  resourceId: '[app]',
  showAllErrors: false,
  savePolicy: jest.fn(),
};
describe('PolicyRuleSubjectSummary', () => {
  it('should render', () => {
    const actions = [mockAction1.actionId, mockAction2.actionId];
    renderPolicyRuleSubjectSummary({ subject: mockSubjects[0].urn, actions }, {}, true);
    expect(screen.getByText('Subject 1')).toBeInTheDocument();
  });
});

const renderPolicyRuleSubjectSummary = (
  props: Partial<PolicyRuleSubjectSummaryProps>,
  policyEditorContextProps: Partial<PolicyEditorContextProps> = {},
  withTable: boolean = false,
) => {
  const defaultProps = {
    subject: 'subject',
    actions: ['action1', 'action2'],
  };

  const component = <PolicyRuleSubjectSummary {...defaultProps} {...props} />;
  render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      {withTable ? (
        <table>
          <tbody>{component}</tbody>
        </table>
      ) : (
        component
      )}
    </PolicyEditorContext.Provider>,
  );
};
