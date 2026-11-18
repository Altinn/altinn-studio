import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VersionSwitcher } from 'src/features/devtools/components/VersionSwitcher/VersionSwitcher';

describe('VersionSwitcher', () => {
  const originalLocation = window.location;
  const assign = vi.fn();

  function setLocation(href: string) {
    const { hostname } = new URL(href);
    Object.defineProperty(window, 'location', { configurable: true, value: { href, hostname, assign } });
  }

  beforeEach(() => {
    assign.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('is hidden in production, where the backend ignores the parameter', () => {
    setLocation('https://ttd.apps.altinn.no/ttd/app/');
    render(<VersionSwitcher />);

    expect(screen.queryByRole('textbox', { name: 'Frontend versjon' })).not.toBeInTheDocument();
  });

  it('shows the version from the address', () => {
    setLocation('http://local.altinn.cloud/ttd/app/?frontendVersion=9.0.0-preview.10');
    render(<VersionSwitcher />);

    expect(screen.getByRole('textbox', { name: 'Frontend versjon' })).toHaveValue('9.0.0-preview.10');
  });

  it('reloads the page with the version in the address', async () => {
    setLocation('http://local.altinn.cloud/ttd/app/instance/1/abc/Task_1/Side1');
    render(<VersionSwitcher />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Frontend versjon' }), '9.0.0-preview.12');
    await userEvent.click(screen.getByRole('button', { name: 'Bytt versjon' }));

    expect(assign).toHaveBeenCalledWith(
      'http://local.altinn.cloud/ttd/app/instance/1/abc/Task_1/Side1?frontendVersion=9.0.0-preview.12',
    );
  });

  it('shows an error and stays on the page when the version is not a version number', async () => {
    setLocation('http://local.altinn.cloud/ttd/app/');
    render(<VersionSwitcher />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Frontend versjon' }), 'https://evil.example/x');
    await userEvent.click(screen.getByRole('button', { name: 'Bytt versjon' }));

    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Frontend versjon' })).toHaveAccessibleDescription(
      'Skriv et versjonsnummer, for eksempel 9.0.0-preview.12',
    );
  });

  it('links to the list of versions in a new tab', () => {
    setLocation('http://local.altinn.cloud/ttd/app/');
    render(<VersionSwitcher />);

    const link = screen.getByRole('link', { name: 'Se tilgjengelige versjoner (åpnes i ny fane)' });
    expect(link).toHaveAttribute('href', 'https://altinn.studio/designer/app-dist/versions');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
