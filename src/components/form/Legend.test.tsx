import React from 'react';

import { screen } from '@testing-library/react';

import { Legend } from 'src/components/form/Legend';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IFormLegendProps } from 'src/components/form/Legend';

describe('Legend', () => {
  const requiredMarking = '*';
  const optionalMarking = 'Valgfri';

  async function render(props: Partial<IFormLegendProps> = {}) {
    const defaultProps: IFormLegendProps = {
      id: 'label1',
      label: 'label.text',
      description: '',
      helpText: '',
      required: false,
      labelSettings: {},
    };

    return await renderWithoutInstanceAndLayout({
      renderer: () => (
        <Legend
          {...defaultProps}
          {...props}
        />
      ),
    });
  }

  it('should render legend', async () => {
    await render();
    expect(screen.getByText('label.text')).toBeInTheDocument();
  });

  it('should render required marking when field is required', async () => {
    await render({ required: true });
    expect(screen.getByText(requiredMarking)).toBeTruthy();
  });

  it('should render optional marking when labelSettings.optionalIndicator is true', async () => {
    await render({
      labelSettings: { optionalIndicator: true },
    });
    expect(screen.getByText(`(${optionalMarking})`)).toBeTruthy();
  });

  it('should not render optional marking when required, even if labelSettings.optionalIndicator is true', async () => {
    await render({
      labelSettings: { optionalIndicator: true },
      required: true,
    });
    expect(screen.queryByText(`(${optionalMarking})`)).toBeFalsy();
  });
});
