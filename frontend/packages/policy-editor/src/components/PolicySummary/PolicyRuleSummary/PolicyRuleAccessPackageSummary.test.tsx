import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../../contexts/PolicyEditorContext';
import { mockAction1, mockAction2 } from '../../../../test/mocks/policyActionMocks';
import type {
  PolicyAccessPackage,
  PolicyAccessPackageArea,
  PolicyAccessPackageAreaGroup,
} from 'app-shared/types/PolicyAccessPackages';
import {
  PolicyRuleAccessPackageSummary,
  type PolicyRuleAccessPackageSummaryProps,
} from './PolicyRuleAccessPackageSummary';

const package1: PolicyAccessPackage = {
  id: 'package1',
  urn: 'urn:package1',
  name: 'Package Alpha',
  description: 'First package',
  isDelegable: true,
};
const package2: PolicyAccessPackage = {
  id: 'package2',
  urn: 'urn:package2',
  name: 'Package Beta',
  description: 'Second package',
  isDelegable: true,
};
const package3: PolicyAccessPackage = {
  id: 'package3',
  urn: 'urn:package3',
  name: 'Package Gamma',
  description: 'Third package',
  isDelegable: true,
};

const groupedAccessPackagesByArea: PolicyAccessPackageArea[] = [
  {
    id: 'area1',
    name: 'Area 1',
    urn: 'urn:area1',
    description: '',
    icon: '',
    packages: [package1, package2],
  },
  {
    id: 'area2',
    name: 'Area 2',
    urn: 'urn:area2',
    description: '',
    icon: '',
    packages: [package3],
  },
];

const mockAccessPackageAreaGroup: PolicyAccessPackageAreaGroup = {
  id: 'group1',
  name: 'Group 1',
  description: '',
  areas: groupedAccessPackagesByArea,
  type: 'group',
};
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
  subjects: [],
  accessPackages: [mockAccessPackageAreaGroup],
  usageType: 'app',
  resourceType: 'urn',
  resourceId: '[app]',
  showAllErrors: false,
  savePolicy: jest.fn(),
};
describe('PolicyRuleAccessPackageSummary', () => {
  it('should render', () => {
    const actions = [mockAction1.actionId, mockAction2.actionId];
    renderPolicyRuleAccessPackageSummary({ accessPackage: 'urn:package1', actions }, {}, true);
    expect(screen.getByText('Package Alpha')).toBeInTheDocument();
  });
});

const renderPolicyRuleAccessPackageSummary = (
  props: Partial<PolicyRuleAccessPackageSummaryProps>,
  policyEditorContextProps: Partial<PolicyEditorContextProps> = {},
  withTable: boolean = false,
) => {
  const defaultProps: PolicyRuleAccessPackageSummaryProps = {
    accessPackage: 'urn:package1',
    actions: ['action1', 'action2'],
  };

  const component = <PolicyRuleAccessPackageSummary {...defaultProps} {...props} />;
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
