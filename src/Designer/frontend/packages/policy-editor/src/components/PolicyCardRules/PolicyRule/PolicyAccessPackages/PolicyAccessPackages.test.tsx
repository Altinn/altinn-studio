import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyEditorContext } from '@altinn/policy-editor/contexts/PolicyEditorContext';
import { PolicyAccessPackages } from './PolicyAccessPackages';
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

const revisorPackageName = 'Revisor delegable';
const revisorNonDelegablePackageName = 'Revisor non-delegable';
const skattPackage: PolicyAccessPackage = {
  id: 'urn:altinn:accesspackage:skatt',
  urn: 'urn:altinn:accesspackage:skatt',
  name: 'Skatt',
  description: '',
  isDelegable: true,
};

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

const revisorPackage: PolicyAccessPackage = {
  id: 'urn:altinn:accesspackage:revisor',
  urn: 'urn:altinn:accesspackage:revisor',
  name: revisorPackageName,
  description: '',
  isDelegable: true,
};

const revisorNonDelegablePackage: PolicyAccessPackage = {
  id: 'urn:altinn:accesspackage:nondelegablerevisor',
  urn: 'urn:altinn:accesspackage:nondelegablerevisor',
  name: revisorNonDelegablePackageName,
  description: '',
  isDelegable: false,
};

const accessPackageAreaSkatt: PolicyAccessPackageArea = {
  id: 'skatt-area',
  urn: 'accesspackage:area:skatt_avgift_regnskap_og_toll',
  name: 'Skatt',
  description: '',
  icon: '',
  packages: [skattPackage],
};

const accessPackageAreaTransport: PolicyAccessPackageArea = {
  id: 'transport-area',
  urn: 'accesspackage:area:transport',
  name: 'Lagring og transport',
  description: '',
  icon: 'TruckIcon',
  packages: [sjofartPackage, lufttransportPackage],
};

const accessPackageAreaOther: PolicyAccessPackageArea = {
  id: 'other-area',
  urn: 'accesspackage:area:annet',
  name: 'Annet',
  description: '',
  icon: 'TruckIcon',
  packages: [revisorPackage, revisorNonDelegablePackage],
};

const accessPackageAreaGroupVanlig: PolicyAccessPackageAreaGroup = {
  id: 'vanlig',
  name: 'Vanlig',
  description: 'Mest vanlige pakkenegruppene',
  type: 'Organisasjon',
  areas: [accessPackageAreaSkatt, accessPackageAreaTransport, accessPackageAreaOther],
};

describe('PolicyAccessPackages', () => {
  afterEach(jest.clearAllMocks);

  it('should call add service when access package is checked', async () => {
    const user = userEvent.setup();
    renderAccessPackages();

    const accordionButton = screen.getByRole('button', { name: accessPackageAreaTransport.name });
    await user.click(accordionButton);

    const packageCheckbox = screen.getByLabelText(
      textMock('policy_editor.access_package_add', {
        packageName: sjofartPackage.name,
      }),
    );

    await user.click(packageCheckbox);

    expect(packageCheckbox).toBeChecked();
  });

  it('should call remove service when access package is unchecked', async () => {
    const user = userEvent.setup();
    renderAccessPackages();

    const packageCheckbox = screen.getByLabelText(
      textMock('policy_editor.access_package_remove', {
        packageName: lufttransportPackage.name,
      }),
    );

    await user.click(packageCheckbox);

    expect(packageCheckbox).not.toBeChecked();
  });

  it('should filter list on search', async () => {
    const user = userEvent.setup();
    renderAccessPackages();

    const searchField = screen.getByLabelText(textMock('policy_editor.access_package_search'));
    await user.type(searchField, 'Sjø');

    expect(screen.getByText('Sjøfart')).toBeInTheDocument();
  });

  it('should not show non-delegable access packages', async () => {
    const user = userEvent.setup();
    renderAccessPackages();

    const searchField = screen.getByLabelText(textMock('policy_editor.access_package_search'));
    await user.type(searchField, 'Revisor');

    expect(screen.getByText(revisorPackageName)).toBeInTheDocument();
    expect(screen.queryByText(revisorNonDelegablePackageName)).not.toBeInTheDocument();
  });
});

const renderAccessPackages = () => {
  const queryClient = createQueryClientMock();

  return render(
    <ServicesContextProvider {...queriesMock} client={queryClient}>
      <PolicyEditorContext.Provider
        value={{ ...mockPolicyEditorContextValue, accessPackages: [accessPackageAreaGroupVanlig] }}
      >
        <PolicyRuleContext.Provider
          value={{
            ...mockPolicyRuleContextValue,
            policyRule: {
              ...mockPolicyRuleContextValue.policyRule,
              accessPackages: [lufttransportPackage.urn],
            },
          }}
        >
          <PolicyAccessPackages />
        </PolicyRuleContext.Provider>
      </PolicyEditorContext.Provider>
    </ServicesContextProvider>,
  );
};
