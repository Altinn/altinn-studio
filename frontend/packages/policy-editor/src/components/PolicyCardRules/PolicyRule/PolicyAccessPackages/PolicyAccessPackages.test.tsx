import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyEditorContext } from '@altinn/policy-editor/contexts/PolicyEditorContext';
import { PolicyAccessPackages } from './PolicyAccessPackages';
import { PolicyRuleContext } from '@altinn/policy-editor/contexts/PolicyRuleContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockPolicyRuleContextValue } from '../../../../../test/mocks/policyRuleContextMock';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';

const accessPackageAreaTransport = {
  id: 'transport-area',
  name: 'Lagring og transport',
  description: '',
  iconName: 'TruckIcon',
  shortDescription: '',
};

const sjofartPackage = {
  id: 'urn:altinn:accesspackage:sjofart',
  urn: 'urn:altinn:accesspackage:sjofart',
  name: 'Sjøfart',
  description: '',
  services: [],
  area: accessPackageAreaTransport,
};

const lufttransportPackage = {
  id: 'urn:altinn:accesspackage:lufttransport',
  urn: 'urn:altinn:accesspackage:lufttransport',
  name: 'Lufttransport',
  description: '',
  services: [],
  area: accessPackageAreaTransport,
};

const accessPackages = [sjofartPackage, lufttransportPackage];

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
