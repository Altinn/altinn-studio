import React from 'react';

import { screen } from '@testing-library/react';

import { Legend } from 'src/components/form/Legend';
import { renderWithProviders } from 'src/testUtils';
import type { IFormLegendProps } from 'src/components/form/Legend';

describe('Legend', () => {
  const requiredMarking = '*';
  const optionalMarking = 'Valgfri';

  function renderLegendComponent(props: Partial<IFormLegendProps> = {}) {
    const defaultProps: IFormLegendProps = {
      id: 'label1',
      labelText: 'label.text',
      descriptionText: '',
      helpText: '',
      required: false,
      labelSettings: {},
    };

    return renderWithProviders(
      <Legend
        {...defaultProps}
        {...props}
      />,
    );
  }

  it('should render legend', () => {
    renderLegendComponent();
    expect(screen.getByText('label.text')).toBeInTheDocument();
  });

  it('should render required marking when field is required', () => {
    renderLegendComponent({ required: true });
    expect(screen.getByText(requiredMarking)).toBeTruthy();
  });

  it('should render optional marking when labelSettings.optionalIndicator is true', () => {
    renderLegendComponent({
      labelSettings: { optionalIndicator: true },
    });
    expect(screen.getByText(`(${optionalMarking})`)).toBeTruthy();
  });

  it('should not render optional marking when required, even if labelSettings.optionalIndicator is true', () => {
    renderLegendComponent({
      labelSettings: { optionalIndicator: true },
      required: true,
    });
    expect(screen.queryByText(`(${optionalMarking})`)).toBeFalsy();
  });
});
