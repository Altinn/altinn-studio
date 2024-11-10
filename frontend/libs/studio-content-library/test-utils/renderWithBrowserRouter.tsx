import type { ReactNode } from 'react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';

export function renderWithBrowserRouter(component: ReactNode): RenderResult {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}
