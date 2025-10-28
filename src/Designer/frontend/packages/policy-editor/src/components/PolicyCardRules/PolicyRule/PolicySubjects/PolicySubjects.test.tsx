import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyEditorContext } from '@altinn/policy-editor/contexts/PolicyEditorContext';
import { PolicyRuleContext } from '@altinn/policy-editor/contexts/PolicyRuleContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockPolicyRuleContextValue } from '../../../../../test/mocks/policyRuleContextMock';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type {
  PolicyAccessPackage,
  PolicyAccessPackageArea,
  PolicyAccessPackageAreaGroup,
} from 'app-shared/types/PolicyAccessPackages';
import { PolicySubjects } from './PolicySubjects';
import { policySubjectOrg } from '@altinn/policy-editor/utils';
import {
  mockSubject1,
  mockSubject2,
  mockSubject3,
} from '../../../../../test/mocks/policySubjectMocks';

const sjofartPackage: PolicyAccessPackage = {
  id: 'urn:altinn:accesspackage:sjofart',
  urn: 'urn:altinn:accesspackage:sjofart',
  name: 'Sjøfart',
  description: '',
  isDelegable: true,
};
const lufttransportPackage: PolicyAccessPackage = {
  id: 'urn:altinn:accesspackage:lufttransport',
  urn: 'urn:altinn:accesspackage:lufttransport',
  name: 'Lufttransport',
  description: '',
  isDelegable: true,
};
const accessPackageAreaTransport: PolicyAccessPackageArea = {
  id: 'transport-area',
  urn: 'accesspackage:area:transport',
  name: 'Lagring og transport',
  description: '',
  icon: 'TruckIcon',
  packages: [sjofartPackage, lufttransportPackage],
};
const accessPackageAreaGroupVanlig: PolicyAccessPackageAreaGroup = {
  id: 'vanlig',
  name: 'Vanlig',
  description: 'Mest vanlige pakkenegruppene',
  type: 'Organisasjon',
  areas: [accessPackageAreaTransport],
};

const revisorRoleSubject = {
  id: 'f76b997a-9bd8-4f7b-899f-fcd85d35669f',
  name: 'Revisor',
  description: 'Revisor',
  urn: 'urn:altinn:external-role:ccr:revisor',
  legacyRoleCode: 'REVI',
  legacyUrn: 'urn:altinn:rolecode:REVI',
  provider: {
    id: '0195ea92-2080-758b-89db-7735c4f68320',
    name: 'Enhetsregisteret',
    code: 'sys-ccr',
  },
};
const privRoleSubject = {
  id: '1c6eeec1-fe70-4fc5-8b45-df4a2255dea6',
  name: 'Privatperson',
  description: 'Denne rollen er hentet fra Folkeregisteret og gir rettighet til flere tjenester.',
  urn: 'urn:altinn:role:privatperson',
  legacyRoleCode: 'PRIV',
  legacyUrn: 'urn:altinn:rolecode:PRIV',
  provider: {
    id: '0195ea92-2080-777d-8626-69c91ea2a05d',
    name: 'Altinn 2',
    code: 'sys-altinn2',
  },
};
const agentRoleSubject = {
  id: 'ff4c33f5-03f7-4445-85ed-1e60b8aafb30',
  name: 'Agent',
  description: 'Gir mulighet til å motta delegerte fullmakter for virksomheten',
  urn: 'urn:altinn:role:agent',
  legacyRoleCode: null,
  legacyUrn: null,
  provider: {
    id: '0195ea92-2080-7e7c-bbe3-bb0521c1e51a',
    name: 'Altinn 3',
    code: 'sys-altinn3',
  },
};
const subjects = [
  revisorRoleSubject,
  privRoleSubject,
  agentRoleSubject,
  mockSubject1,
  mockSubject2,
  mockSubject3,
  policySubjectOrg,
];

describe('PolicySubjects', () => {
  afterEach(jest.clearAllMocks);

  it('should show subject checkbox checked when subject is added with urn', async () => {
    const user = userEvent.setup();
    renderPolicySubjects();

    const altinnRolesTab = screen.getByText(
      textMock('policy_editor.rule_card_subjects_altinn_roles'),
    );
    await user.click(altinnRolesTab);

    const checkbox = screen.getByLabelText(agentRoleSubject.name);
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it('should show subject checkbox checked when subject is added with legacyUrn', async () => {
    const user = userEvent.setup();
    renderPolicySubjects();

    const checkbox = screen.getByLabelText(
      `${revisorRoleSubject.name} (${revisorRoleSubject.legacyRoleCode})`,
    );
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it('should remove subject from selected list when subject checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderPolicySubjects();

    const label = `${mockSubject1.name} (${mockSubject1.legacyRoleCode})`;
    const selectedSubjectCheckbox = screen.getByLabelText(label);
    await user.click(selectedSubjectCheckbox);

    expect(screen.queryByText(label)).not.toBeInTheDocument();
  });

  it('should remove access package from selected list when selected access package checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderPolicySubjects();

    const selectedAccessPackageCheckbox = screen.getByLabelText(lufttransportPackage.name);
    await user.click(selectedAccessPackageCheckbox);

    expect(screen.queryByText(lufttransportPackage.name)).not.toBeInTheDocument();
  });

  it('should show unknown access package if rule contains unknown access package', () => {
    renderPolicySubjects();

    expect(
      screen.getByText(textMock('policy_editor.access_package_unknown_heading')),
    ).toBeInTheDocument();
  });

  it('should show error if no subject is selected', () => {
    renderPolicySubjects();

    expect(
      screen.getByText(textMock('policy_editor.rule_card_subjects_error')),
    ).toBeInTheDocument();
  });

  it('should show ccr subjects in first tab', () => {
    renderPolicySubjects();

    expect(
      screen.getByText(`${revisorRoleSubject.name} (${revisorRoleSubject.legacyRoleCode})`),
    ).toBeInTheDocument();
  });

  it('should show access packages in second tab', async () => {
    const user = userEvent.setup();
    renderPolicySubjects();

    const accessPackagesTab = screen.getByText(
      textMock('policy_editor.rule_card_subjects_access_packages'),
    );
    await user.click(accessPackagesTab);

    expect(screen.getByText(accessPackageAreaTransport.name)).toBeInTheDocument();
  });

  it('should show altinn 2 and altinn 3 roles in third tab', async () => {
    const user = userEvent.setup();
    renderPolicySubjects();

    const altinnRolesTab = screen.getByText(
      textMock('policy_editor.rule_card_subjects_altinn_roles'),
    );
    await user.click(altinnRolesTab);

    expect(
      screen.getByText(`${privRoleSubject.name} (${privRoleSubject.legacyRoleCode})`),
    ).toBeInTheDocument();
    expect(screen.getByText(agentRoleSubject.name)).toBeInTheDocument();
  });

  it('should show org subject in fourth tab', async () => {
    const user = userEvent.setup();
    renderPolicySubjects();

    const otherRolesTab = screen.getByText(
      textMock('policy_editor.rule_card_subjects_other_roles'),
    );
    await user.click(otherRolesTab);

    expect(
      screen.getByText(`${policySubjectOrg.name} (${policySubjectOrg.legacyRoleCode})`),
    ).toBeInTheDocument();
  });
});

const renderPolicySubjects = () => {
  const queryClient = createQueryClientMock();

  return render(
    <ServicesContextProvider {...queriesMock} client={queryClient}>
      <ContextWrapper />
    </ServicesContextProvider>,
  );
};

const ContextWrapper = () => {
  // Add local state for policyRule
  const [policyRules, setPolicyRules] = useState([
    {
      ...mockPolicyRuleContextValue.policyRule,
      accessPackages: [lufttransportPackage.urn, 'urn:altinn:accesspackage:unknown'],
    },
  ]);

  return (
    <PolicyEditorContext.Provider
      value={{
        ...mockPolicyEditorContextValue,
        accessPackages: [accessPackageAreaGroupVanlig],
        subjects: subjects,
        policyRules: policyRules,
        setPolicyRules,
      }}
    >
      <PolicyRuleContext.Provider
        value={{
          ...mockPolicyRuleContextValue,
          policyError: {
            resourceError: false,
            actionsError: false,
            subjectsError: true,
          },
          showAllErrors: true,
          policyRule: { ...policyRules[0] },
        }}
      >
        <PolicySubjects />
      </PolicyRuleContext.Provider>
    </PolicyEditorContext.Provider>
  );
};
