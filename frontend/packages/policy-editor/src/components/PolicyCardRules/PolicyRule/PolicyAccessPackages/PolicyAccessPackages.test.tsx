import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyEditorContext } from '@altinn/policy-editor/contexts/PolicyEditorContext';
import { PolicyAccessPackages } from './PolicyAccessPackages';
import { PolicyRuleContext } from '@altinn/policy-editor/contexts/PolicyRuleContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockPolicyRuleContextValue } from '../../../../../test/mocks/policyRuleContextMock';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';

const accessPackageAreaSkatt = {
  id: 'skatt-area',
  name: 'Skatt',
  description: '',
  iconName: 'BankNoteIcon',
  shortDescription: '',
};

const accessPackageAreaTransport = {
  id: 'transport-area',
  name: 'Lagring og transport',
  description: '',
  iconName: 'TruckIcon',
  shortDescription: '',
};

const accessPackageAreaOther = {
  id: 'other-area',
  name: 'Annet',
  description: '',
  iconName: 'TruckIcon',
  shortDescription: '',
};

const skattPackage = {
  id: 'urn:altinn:accesspackage:skatt',
  urn: 'urn:altinn:accesspackage:skatt',
  name: 'Sjøfart',
  description: '',
  services: [],
  tags: [{ id: 'ofteBrukt', name: 'Ofte brukt' }],
  area: accessPackageAreaSkatt,
};

const sjofartPackage = {
  id: 'urn:altinn:accesspackage:sjofart',
  urn: 'urn:altinn:accesspackage:sjofart',
  name: 'Sjøfart',
  description: '',
  services: [],
  tags: [{ id: 'bransjespesifikk', name: 'Bransjespesifikke' }],
  area: accessPackageAreaTransport,
};

const lufttransportPackage = {
  id: 'urn:altinn:accesspackage:lufttransport',
  urn: 'urn:altinn:accesspackage:lufttransport',
  name: 'Lufttransport',
  description: '',
  services: [],
  tags: [{ id: 'bransjespesifikk', name: 'Bransjespesifikke' }],
  area: accessPackageAreaTransport,
};

const revisorPackage = {
  id: 'urn:altinn:accesspackage:revisor',
  urn: 'urn:altinn:accesspackage:revisor',
  name: 'Revisor',
  description: '',
  services: [],
  tags: [],
  area: accessPackageAreaOther,
};

const accessPackages = [sjofartPackage, lufttransportPackage, skattPackage, revisorPackage];

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
});

const renderAccessPackages = () => {
  return render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, accessPackages: accessPackages }}
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
    </PolicyEditorContext.Provider>,
  );
};
