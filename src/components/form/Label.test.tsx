import React from 'react';

import { screen } from '@testing-library/react';

import { Label } from 'src/components/form/Label';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IFormLabelProps } from 'src/components/form/Label';

describe('Label', () => {
  const requiredMarking = '*';
  const optionalMarking = 'Valgfri';

  it('should render label', async () => {
    await render();
    expect(screen.getByText('label.text')).toBeInTheDocument();
  });

  it('should render required marking when field is required', async () => {
    await render({ required: true });
    expect(screen.getByText(requiredMarking)).toBeTruthy();
  });

  it('should not render required marking when field is readOnly', async () => {
    await render({
      required: true,
      readOnly: true,
    });
    expect(screen.queryByText(requiredMarking)).toBeFalsy();
  });

  it('should render optional marking when labelSettings.optionalIndicator is true, and required, readOnly are both false', async () => {
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
    expect(screen.queryByText(` (${optionalMarking})`)).toBeFalsy();
  });

  it('should not render optional marking when readOnly, even if labelSettings.optionalIndicator is true', async () => {
    await render({
      labelSettings: { optionalIndicator: true },
      readOnly: true,
    });
    expect(screen.queryByText(` (${optionalMarking})`)).toBeFalsy();
  });

  async function render(props: Partial<IFormLabelProps> = {}) {
    const defaultProps: IFormLabelProps = {
      id: 'label1',
      label: 'label.text',
      helpText: '',
      readOnly: false,
      required: false,
      labelSettings: {
        optionalIndicator: true,
      },
    };

    return await renderWithoutInstanceAndLayout({
      renderer: () => (
        <Label
          {...defaultProps}
          {...props}
        />
      ),
    });
  }
});
