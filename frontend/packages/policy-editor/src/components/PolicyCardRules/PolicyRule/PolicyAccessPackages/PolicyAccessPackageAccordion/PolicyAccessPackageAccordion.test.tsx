import React from 'react';
import { render, screen } from '@testing-library/react';
import { PolicyAccessPackageAccordion } from './PolicyAccessPackageAccordion';
import type { PolicyAccessPackage } from 'app-shared/types/PolicyAccessPackages';

const defaultAccessPackageProp: PolicyAccessPackage = {
  id: 'urn:altinn:accesspackage:sjofart',
  urn: 'urn:altinn:accesspackage:sjofart',
  name: 'Sjøfart',
  description: '',
};

describe('PolicyAccessPackageAccordion', () => {
  it('should show accordion for accesspackage', () => {
    render(
      <PolicyAccessPackageAccordion
        accessPackage={defaultAccessPackageProp}
        isChecked={false}
        handleSelectChange={jest.fn()}
      />,
    );

    expect(screen.getByText(defaultAccessPackageProp.name)).toBeInTheDocument();
  });
});
