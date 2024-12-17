import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyEditorContext } from '@altinn/policy-editor/contexts/PolicyEditorContext';
import { PolicyAccessPackages } from './PolicyAccessPackages';
import { PolicyRuleContext } from '@altinn/policy-editor/contexts/PolicyRuleContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockPolicyRuleContextValue } from '../../../../../test/mocks/policyRuleContextMock';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';
import type { PolicyAccessPackageAreaGroup } from '@altinn/policy-editor';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const skattPackage = {
  id: 'urn:altinn:accesspackage:skatt',
  urn: 'urn:altinn:accesspackage:skatt',
  name: 'Skatt',
  description: '',
};

const sjofartPackage = {
  id: 'urn:altinn:accesspackage:sjofart',
  urn: 'urn:altinn:accesspackage:sjofart',
  name: 'Sjøfart',
  description: '',
};

const lufttransportPackage = {
  id: 'urn:altinn:accesspackage:lufttransport',
  urn: 'urn:altinn:accesspackage:lufttransport',
  name: 'Lufttransport',
  description: '',
};

const revisorPackage = {
  id: 'urn:altinn:accesspackage:revisor',
  urn: 'urn:altinn:accesspackage:revisor',
  name: 'Revisor',
  description: '',
};

const accessPackageAreaSkatt = {
  id: 'skatt-area',
  urn: 'accesspackage:area:skatt_avgift_regnskap_og_toll',
  name: 'Skatt',
  description: '',
  icon: '',
  areaGroup: 'Vanlig',
  packages: [skattPackage],
};

const accessPackageAreaTransport = {
  id: 'transport-area',
  urn: 'accesspackage:area:transport',
  name: 'Lagring og transport',
  description: '',
  icon: 'TruckIcon',
  areaGroup: 'Vanlig',
  packages: [sjofartPackage, lufttransportPackage],
};

const accessPackageAreaOther = {
  id: 'other-area',
  urn: 'accesspackage:area:annet',
  name: 'Annet',
  description: '',
  icon: 'TruckIcon',
  areaGroup: 'Vanlig',
  packages: [revisorPackage],
};

const accessPackageAreaGroupVanlig: PolicyAccessPackageAreaGroup = {
  id: 'vanlig',
  urn: 'accesspackage:areagroup:vanlig',
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
