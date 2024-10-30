import type { ReactNode } from 'react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

export function renderWithBrowserRouter(component: ReactNode) {
  render(<BrowserRouter>{component}</BrowserRouter>);
}
