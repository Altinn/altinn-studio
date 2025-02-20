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
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderPolicyRuleSubjectSummary({ subject: 's1', actions }, {});
    expect(screen.getByText('Subject 1')).toBeInTheDocument();
    // We are rendering a table row independently of table, so we expect a console error
    expect(consoleError).toHaveBeenCalled();
  });
});

const renderPolicyRuleSubjectSummary = (
  props: Partial<PolicyRuleSubjectSummaryProps>,
  policyEditorContextProps: Partial<PolicyEditorContextProps> = {},
) => {
  const defaultProps = {
    subject: 'subject',
    actions: ['action1', 'action2'],
  };
  render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      <PolicyRuleSubjectSummary {...defaultProps} {...props} />
    </PolicyEditorContext.Provider>,
  );
};
