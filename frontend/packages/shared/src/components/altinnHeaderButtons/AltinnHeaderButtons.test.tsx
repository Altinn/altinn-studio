import React from 'react';
import { render, screen } from '@testing-library/react';
import { AltinnHeaderButtons } from './AltinnHeaderButtons';

describe('AltinnHeaderbuttons', () => {
  test('should render preview button', async () => {
    await renderWithMock();
    expect(screen.getByRole('button', { name: /top_menu.deploy/ }));
  });

  test('should render deploy button', async () => {
    await renderWithMock();
    const deployButton = screen.getByTestId(/top_menu.preview/);
    expect(deployButton).toBeInTheDocument();
  });
});

const renderWithMock = async () => {
  render(<AltinnHeaderButtons />, { wrapper: undefined });
};
