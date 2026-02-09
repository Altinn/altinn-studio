import { act, render, renderHook, screen } from '@testing-library/react';
import type { RenderHookResult, RenderOptions } from '@testing-library/react';
import { useContentLibraryRouter } from 'app-shared/hooks/useContentLibraryRouter';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import { PageName } from '@studio/content-library';
import type { ContentLibraryRouter } from '@studio/content-library';
import userEvent from '@testing-library/user-event';

// Test data:
const basePath = '/content-library';

describe('useContentLibraryRouter', () => {
  it('Returns the landing page as location by default', () => {
    const { result } = renderUseContentLibraryRouter();
    expect(result.current.location).toBe(PageName.LandingPage);
  });

  it('Extracts the page name from the path when valid', () => {
    const { result } = renderUseContentLibraryRouter(`${basePath}/${PageName.CodeLists}`);
    expect(result.current.location).toBe(PageName.CodeLists);
  });

  it('Returns the landing page as location when invalid page name is given', () => {
    const { result } = renderUseContentLibraryRouter(`${basePath}/invalid-page-name`);
    expect(result.current.location).toBe(PageName.LandingPage);
  });

  it('Returns a function that renders a link component to some given page', async () => {
    const captureLocation = jest.fn();
    const linkText = 'Code lists';
    const TestComponent = (): React.ReactElement => {
      const { renderLink, location } = useContentLibraryRouter(basePath);
      captureLocation(location);
      return renderLink(PageName.CodeLists, { children: linkText });
    };

    render(<TestComponent />, { wrapper: wrapper() });
    await userEvent.click(screen.getByRole('link', { name: linkText }));

    expect(captureLocation).toHaveBeenLastCalledWith(PageName.CodeLists);
  });

  it('Returns a function that navigates to a specific page', () => {
    const { result } = renderUseContentLibraryRouter();
    act(() => result.current.navigate(PageName.CodeLists));
    expect(result.current.location).toBe(PageName.CodeLists);
  });
});

function renderUseContentLibraryRouter(
  path: string = basePath,
): RenderHookResult<ContentLibraryRouter, void> {
  return renderHook(() => useContentLibraryRouter(basePath), { wrapper: wrapper(path) });
}

function wrapper(path: string = basePath): RenderOptions['wrapper'] {
  const Component = ({ children }: { children: React.ReactNode }): React.ReactElement => (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={`${basePath}/:elementType?`} element={children} />
      </Routes>
    </MemoryRouter>
  );
  Component.displayName = 'Wrapper';
  return Component;
}
