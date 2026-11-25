import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VersionSwitcher } from 'src/features/devtools/components/VersionSwitcher/VersionSwitcher';
import { createQueryTestWrapper } from 'src/test/queryTestUtils';
import type { QueryOverrides } from 'src/test/renderWithProviders';

describe('VersionSwitcher', () => {
  const originalLocation = window.location;
  const assign = vi.fn();

  function setLocation(href: string) {
    const { hostname } = new URL(href);
    Object.defineProperty(window, 'location', { configurable: true, value: { href, hostname, assign } });
  }

  function renderSwitcher(overrides: QueryOverrides = {}) {
    const { wrapper } = createQueryTestWrapper({
      queries: { fetchAppFrontendVersions: async () => ['9.0.0-preview.12', '9.0.0-preview.13'] },
      ...overrides,
    });
    return render(<VersionSwitcher />, { wrapper });
  }

  beforeEach(() => {
    assign.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('is hidden in production, where the backend ignores the parameter', () => {
    setLocation('https://ttd.apps.altinn.no/ttd/app/');
    renderSwitcher();

    expect(screen.queryByText('Frontend versjon')).not.toBeInTheDocument();
  });

  it('lists the published versions, newest first', async () => {
    setLocation('http://local.altinn.cloud/ttd/app/');
    renderSwitcher();

    await userEvent.click(await screen.findByRole('combobox', { name: 'Frontend versjon' }));

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Versjonen som følger med appen',
      '9.0.0-preview.13',
      '9.0.0-preview.12',
    ]);
  });

  it("shows the app's own version when the address has no version", async () => {
    setLocation('http://local.altinn.cloud/ttd/app/');
    renderSwitcher();

    expect(await screen.findByRole('combobox', { name: 'Frontend versjon' })).toHaveValue(
      'Versjonen som følger med appen',
    );
    expect(screen.getByRole('button', { name: 'Bytt versjon' })).toBeDisabled();
  });

  it('shows the version from the address', async () => {
    setLocation('http://local.altinn.cloud/ttd/app/?frontendVersion=9.0.0-preview.12');
    renderSwitcher();

    expect(await screen.findByRole('combobox', { name: 'Frontend versjon' })).toHaveValue('9.0.0-preview.12');
  });

  it('reloads the page with the chosen version in the address', async () => {
    setLocation('http://local.altinn.cloud/ttd/app/instance/1/abc/Task_1/Side1');
    renderSwitcher();

    await userEvent.click(await screen.findByRole('combobox', { name: 'Frontend versjon' }));
    await userEvent.click(screen.getByRole('option', { name: '9.0.0-preview.13' }));
    await userEvent.click(screen.getByRole('button', { name: 'Bytt versjon' }));

    expect(assign).toHaveBeenCalledWith(
      'http://local.altinn.cloud/ttd/app/instance/1/abc/Task_1/Side1?frontendVersion=9.0.0-preview.13',
    );
  });

  it("goes back to the app's own version by removing the version from the address", async () => {
    setLocation('http://local.altinn.cloud/ttd/app/instance/1/abc/Task_1/Side1?frontendVersion=9.0.0-preview.13');
    renderSwitcher();

    await userEvent.click(await screen.findByRole('combobox', { name: 'Frontend versjon' }));
    await userEvent.click(screen.getByRole('option', { name: 'Versjonen som følger med appen' }));
    await userEvent.click(screen.getByRole('button', { name: 'Bytt versjon' }));

    expect(assign).toHaveBeenCalledWith('http://local.altinn.cloud/ttd/app/instance/1/abc/Task_1/Side1');
  });

  it('says so when the versions cannot be fetched', async () => {
    setLocation('http://local.altinn.cloud/ttd/app/');
    renderSwitcher({
      queries: {
        fetchAppFrontendVersions: async () => {
          throw new Error('app-dist is down');
        },
      },
    });

    expect(await screen.findByText('Kunne ikke hente versjonene som er publisert.')).toBeInTheDocument();
  });
});
