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
import type {
  PolicyAccessPackage,
  PolicyAccessPackageArea,
  PolicyAccessPackageAreaGroup,
} from 'app-shared/types/PolicyAccessPackages';
import { policySubjectOrg } from '@altinn/policy-editor/utils';
import { INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE } from '@altinn/policy-editor/constants';

const mockSubjects: PolicySubject[] = [
  {
    legacyRoleCode: 's1',
    name: 'Subject 1',
    legacyUrn: 'urn:altinn:rolecode:s1',
    urn: 'urn:altinn:rolecode:s1',
    description: 'Subject 1 description',
    id: '',
    provider: {
      code: INTERNAL_ACCESS_PACKAGE_PROVIDER_CODE,
      id: '',
      name: '',
    },
  },
  policySubjectOrg,
];
const mockPolicyEditorContextValue: PolicyEditorContextProps = {
  policyRules: [
    {
      ruleId: 'r1',
      description: '',
      subject: [mockSubjects[0].urn, policySubjectOrg.urn],
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
    renderPolicySummary({});
    expect(screen.getByText(textMock('policy_editor.summary_heading'))).toBeInTheDocument();
  });

  it('should render subject summary for each subject in policy rule', () => {
    renderPolicySummary({});
    expect(screen.getByText('Subject 1')).toBeInTheDocument();
    expect(screen.getByText('Tjenesteeier')).toBeInTheDocument();
  });

  it('should render action heading for each unique action in policy rule', () => {
    renderPolicySummary({});
    expect(
      screen.getByText(textMock(`policy_editor.action_${mockAction1.actionId}`)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock(`policy_editor.action_${mockAction2.actionId}`)),
    ).toBeInTheDocument();
  });

  it('should not render action heading for actions that are not in policy rule', () => {
    renderPolicySummary({});
    expect(
      screen.queryByText(textMock(`policy_editor.action_${mockAction3.actionId}`)),
    ).not.toBeInTheDocument();
  });

  it('should render access package summary for each access package in policy rule', () => {
    const package1: PolicyAccessPackage = {
      id: 'package1',
      urn: 'urn:package1',
      name: 'Package Alpha',
      description: 'First package',
      isResourcePolicyAvailable: true,
    };
    const package2: PolicyAccessPackage = {
      id: 'package2',
      urn: 'urn:package2',
      name: 'Package Beta',
      description: 'Second package',
      isResourcePolicyAvailable: true,
    };
    const package3: PolicyAccessPackage = {
      id: 'package3',
      urn: 'urn:package3',
      name: 'Package Gamma',
      description: 'Third package',
      isResourcePolicyAvailable: true,
    };

    const groupedAccessPackagesByArea: PolicyAccessPackageArea[] = [
      {
        id: 'area1',
        name: 'Area 1',
        urn: 'urn:area1',
        description: '',
        iconUrl: '',
        packages: [package1, package2],
      },
      {
        id: 'area2',
        name: 'Area 2',
        urn: 'urn:area2',
        description: '',
        iconUrl: '',
        packages: [package3],
      },
    ];

    const accessPackages: PolicyAccessPackageAreaGroup[] = [
      {
        id: 'group1',
        name: 'Group 1',
        description: '',
        areas: groupedAccessPackagesByArea,
        type: 'group',
      },
    ];

    const mockRules = [...mockPolicyEditorContextValue.policyRules];
    mockRules[0].accessPackages = [package1.urn, package2.urn];

    renderPolicySummary({
      accessPackages,
      policyRules: [...mockPolicyEditorContextValue.policyRules],
    });
    expect(screen.getByText(package1.name)).toBeInTheDocument();
    expect(screen.getByText(package2.name)).toBeInTheDocument();
  });
});

const renderPolicySummary = (policyEditorContextProps: Partial<PolicyEditorContextProps> = {}) => {
  render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      <PolicySummary />
    </PolicyEditorContext.Provider>,
  );
};
