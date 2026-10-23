import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import AppUpgrade from './AppUpgrade';

describe('AppUpgrade', () => {
  it('renders the heading', () => {
    render(<AppUpgrade />);

    expect(
      screen.getByRole('heading', { name: textMock('app_upgrade.heading'), level: 1 }),
    ).toBeInTheDocument();
  });
});
