import React from 'react';
import { render, screen } from '@testing-library/react';
import { AltinnHeaderButtons } from './AltinnHeaderButtons';
import { textMock } from '../../../../../testing/mocks/i18nMock';

describe('AltinnHeaderbuttons', () => {
  test('should render deploy  button', async () => {
    await renderWithMock();
    expect(screen.getByRole('button', { name: textMock('top_menu.deploy') }));
  });

  test('should render preview button', async () => {
    await renderWithMock();
    expect(screen.getByRole('button', { name: textMock('top_menu.preview') }));
  });
});

const renderWithMock = async () => {
  render(<AltinnHeaderButtons />, { wrapper: undefined });
};
