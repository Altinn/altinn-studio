import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  PolicyAccessPackageAccordionCheckbox,
  type PolicyAccessPackageAccordionCheckboxProps,
} from './PolicyAccessPackageAccordionCheckbox';

const defaultProps = {
  accessPackage: {
    id: '1345',
    name: 'Lufttransport',
    description: 'Luft',
    urn: 'urn',
    isDelegable: true,
  },
  isChecked: false,
  handleSelectChange: jest.fn(),
};

describe('PolicyAccessPackageAccordionCheckbox', () => {
  it('should show checked text', () => {
    renderPolicyAccessPackageAccordionCheckbox();

    const expectedAddText = textMock('policy_editor.access_package_add', {
      packageName: defaultProps.accessPackage.name,
    });
    expect(screen.getByLabelText(expectedAddText)).toBeInTheDocument();
  });

  it('should show unchecked text', () => {
    renderPolicyAccessPackageAccordionCheckbox({ isChecked: true });

    const expectedRemoveText = textMock('policy_editor.access_package_remove', {
      packageName: defaultProps.accessPackage.name,
    });
    expect(screen.getByLabelText(expectedRemoveText)).toBeInTheDocument();
  });

  it('should call handleSelectChange when checkbox is checked', async () => {
    const user = userEvent.setup();
    const handleSelectChangeFn = jest.fn();

    renderPolicyAccessPackageAccordionCheckbox({ handleSelectChange: handleSelectChangeFn });

    const expectedAddText = textMock('policy_editor.access_package_add', {
      packageName: defaultProps.accessPackage.name,
    });
    const checkbox = screen.getByLabelText(expectedAddText);
    await user.click(checkbox);

    expect(handleSelectChangeFn).toHaveBeenCalledWith('urn');
  });
});

const renderPolicyAccessPackageAccordionCheckbox = (
  props: Partial<PolicyAccessPackageAccordionCheckboxProps> = {},
) => {
  render(<PolicyAccessPackageAccordionCheckbox {...defaultProps} {...props} />);
};
