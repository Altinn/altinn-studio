import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  PolicyAccessPackageAccordion,
  type PolicyAccessPackageAccordionProps,
} from './PolicyAccessPackageAccordion';

const defaultProps = {
  accessPackage: {
    id: 'urn:altinn:accesspackage:sjofart',
    urn: 'urn:altinn:accesspackage:sjofart',
    name: 'Sjøfart',
    description: '',
    isDelegable: true,
  },
  isChecked: false,
  handleSelectChange: jest.fn(),
};

describe('PolicyAccessPackageAccordion', () => {
  it('should show accordion for accesspackage', () => {
    renderPolicyAccessPackageAccordion();

    expect(screen.getByText(defaultProps.accessPackage.name)).toBeInTheDocument();
  });
});

const renderPolicyAccessPackageAccordion = (
  props: Partial<PolicyAccessPackageAccordionProps> = {},
) => {
  render(<PolicyAccessPackageAccordion {...defaultProps} {...props} />);
};
