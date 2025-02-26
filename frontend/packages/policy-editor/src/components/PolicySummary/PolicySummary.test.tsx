import { render, screen } from '@testing-library/react';
import React from 'react';
import { PolicySummary } from './PolicySummary';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../contexts/PolicyEditorContext';
import { mockAction1, mockAction2, mockAction3 } from '../../../test/mocks/policyActionMocks';
import type { PolicySubject } from '../../types';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockSubjects: PolicySubject[] = [
  {
    subjectId: 's1',
    subjectTitle: 'Subject 1',
    subjectDescription: 'Subject 1 description',
    subjectSource: 'altinn:rolecode',
  },
  {
    subjectId: '[org]',
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
      subject: ['s1', '[org]'],
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

describe('PolicySummary', () => {
  it('should render', () => {
    renderPolicyRuleSubjectSummary({});
    expect(screen.getByText(textMock('policy_editor.summary_heading'))).toBeInTheDocument();
  });

  it('should render subject summary for each subject in policy rule', () => {
    renderPolicyRuleSubjectSummary({});
    expect(screen.getByText('Subject 1')).toBeInTheDocument();
    expect(screen.getByText('Tjenesteeier')).toBeInTheDocument();
  });

  it('should render action heading for each unique action in policy rule', () => {
    renderPolicyRuleSubjectSummary({});
    expect(
      screen.getByText(textMock(`policy_editor.action_${mockAction1.actionId}`)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock(`policy_editor.action_${mockAction2.actionId}`)),
    ).toBeInTheDocument();
  });

  it('should not render action heading for actions that are not in policy rule', () => {
    renderPolicyRuleSubjectSummary({});
    expect(
      screen.queryByText(textMock(`policy_editor.action_${mockAction3.actionId}`)),
    ).not.toBeInTheDocument();
  });
});

const renderPolicyRuleSubjectSummary = (
  policyEditorContextProps: Partial<PolicyEditorContextProps> = {},
) => {
  render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      <PolicySummary />
    </PolicyEditorContext.Provider>,
  );
};
