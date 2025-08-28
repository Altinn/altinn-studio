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

const mockSubjects: PolicySubject[] = [
  {
    subjectId: 's1',
    subjectTitle: 'Subject 1',
    subjectDescription: 'Subject 1 description',
    subjectSource: 'altinn:rolecode',
  },
  {
    subjectId: 's2',
    subjectTitle: '[ORG]',
    subjectDescription: 'Subject 2 description',
    subjectSource: 'altinn:org',
  },
];
const mockPolicyEditorContextValue: PolicyEditorContextProps = {
  policyRules: [
    {
      ruleId: 'r1',
      description: '',
      subject: ['s1'],
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
    renderPolicyRuleSubjectSummary({ subject: 's1', actions }, {}, true);
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
