import { render, renderHook, screen } from '@testing-library/react';
import type { RenderHookResult, RenderOptions } from '@testing-library/react';
import { useContentLibraryRouter } from 'app-shared/hooks/useContentLibraryRouter';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import { PageName } from '@studio/content-library';
import type { ContentLibraryRouter } from '@studio/content-library';

// Test data:
const basePath = '/content-library';

describe('useContentLibraryRouter', () => {
  it('Returns the landing page as location by default', () => {
    const { result } = renderUseContentLibraryRouter();
    expect(result.current.location).toBe(PageName.LandingPage);
  });

  it('Extracts tha page name from the path when valid', () => {
    const { result } = renderUseContentLibraryRouter(`${basePath}/${PageName.CodeLists}`);
    expect(result.current.location).toBe(PageName.CodeLists);
  });

  it('Returns the landing page as location when invalid page name is given', () => {
    const { result } = renderUseContentLibraryRouter(`${basePath}/invalid-page-name`);
    expect(result.current.location).toBe(PageName.LandingPage);
  });

  it('Returns a function for rendering a link component', () => {
    const { result } = renderUseContentLibraryRouter();
    const linkText = 'Code lists';
    const view = result.current.renderLink(PageName.CodeLists, { children: linkText });
    render(view, { wrapper: wrapper() });
    expect(screen.getByRole('link', { name: linkText })).toBeInTheDocument();
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
