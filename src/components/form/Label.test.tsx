import React from 'react';

import { screen } from '@testing-library/react';

import { Label } from 'src/components/form/Label';
import { renderWithProviders } from 'src/testUtils';
import type { IFormLabelProps } from 'src/components/form/Label';

describe('Label', () => {
  const requiredMarking = '*';
  const optionalMarking = 'Valgfri';

  it('should render label', () => {
    renderLabelComponent();
    expect(screen.getByText('label.text')).toBeInTheDocument();
  });

  it('should render required marking when field is required', () => {
    renderLabelComponent({ required: true });
    expect(screen.getByText(requiredMarking)).toBeTruthy();
  });

  it('should not render required marking when field is readOnly', () => {
    renderLabelComponent({
      required: true,
      readOnly: true,
    });
    expect(screen.queryByText(requiredMarking)).toBeFalsy();
  });

  it('should render optional marking when labelSettings.optionalIndicator is true, and required, readOnly are both false', () => {
    renderLabelComponent({
      labelSettings: { optionalIndicator: true },
    });
    expect(screen.getByText(`(${optionalMarking})`)).toBeTruthy();
  });

  it('should not render optional marking when required, even if labelSettings.optionalIndicator is true', () => {
    renderLabelComponent({
      labelSettings: { optionalIndicator: true },
      required: true,
    });
    expect(screen.queryByText(` (${optionalMarking})`)).toBeFalsy();
  });

  it('should not render optional marking when readOnly, even if labelSettings.optionalIndicator is true', () => {
    renderLabelComponent({
      labelSettings: { optionalIndicator: true },
      readOnly: true,
    });
    expect(screen.queryByText(` (${optionalMarking})`)).toBeFalsy();
  });

  function renderLabelComponent(props: Partial<IFormLabelProps> = {}) {
    const defaultProps: IFormLabelProps = {
      id: 'label1',
      labelText: 'label.text',
      helpText: '',
      readOnly: false,
      required: false,
      labelSettings: {
        optionalIndicator: true,
      },
    };

    return renderWithProviders(
      <Label
        {...defaultProps}
        {...props}
      />,
    );
  }
});
