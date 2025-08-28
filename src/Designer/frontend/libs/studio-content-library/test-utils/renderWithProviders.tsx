import type { ReactNode } from 'react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import { ToastContainer, Slide } from 'react-toastify';

export function renderWithProviders(component: ReactNode): RenderResult {
  return render(
    <>
      <ToastContainer position='top-center' theme='colored' transition={Slide} draggable={false} />
      <BrowserRouter>{component}</BrowserRouter>
    </>,
  );
}
