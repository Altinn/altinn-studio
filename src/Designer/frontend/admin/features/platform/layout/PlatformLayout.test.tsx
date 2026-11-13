import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useOutletContext } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PlatformLayout } from './PlatformLayout';
import type { PlatformOutletContext } from './PlatformLayout';

const ShowContext = () => {
  const { environment, periodDays } = useOutletContext<PlatformOutletContext>();
  return <span>{`${environment}:${periodDays}`}</span>;
};

describe('PlatformLayout', () => {
  it('gives the pages production and 30 days by default', () => {
    renderPlatformLayout('/platform');

    expect(screen.getByText('production:30')).toBeInTheDocument();
  });

  it('reads environment and period from the query string', () => {
    renderPlatformLayout('/platform/apps?environment=%22tt02%22&period=90');

    expect(screen.getByText('tt02:90')).toBeInTheDocument();
  });

  it('switches page with the tabs and keeps the query string', async () => {
    const user = userEvent.setup();
    renderPlatformLayout('/platform?period=7');

    await user.click(screen.getByRole('tab', { name: textMock('admin.platform.tab.all_apps') }));

    expect(screen.getByText('production:7')).toBeInTheDocument();
    expect(screen.getByText('all-apps-page')).toBeInTheDocument();
  });
});

const renderPlatformLayout = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path='/platform' element={<PlatformLayout />}>
          <Route index element={<ShowContext />} />
          <Route
            path='apps'
            element={
              <>
                <ShowContext />
                <span>all-apps-page</span>
              </>
            }
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
