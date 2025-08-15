import React from 'react';

import { screen } from '@testing-library/react';
import mockAxios from 'jest-mock-axios';

import { NavBar } from 'src/components/presentation/NavBar';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { PresentationType, ProcessTaskType } from 'src/types';

afterEach(() => mockAxios.reset());

interface RenderNavBarProps {
  currentPageId?: string;
  hideCloseButton: boolean;
  type?: ProcessTaskType | PresentationType;
  initialPage?: string;
}

const render = async ({ hideCloseButton, initialPage }: RenderNavBarProps) => {
  await renderWithInstanceAndLayout({
    renderer: () => <NavBar />,
    initialPage,
    queries: {
      fetchLayoutSettings: () => Promise.resolve({ pages: { hideCloseButton, order: ['1', '2', '3'] } }),
    },
  });
};

describe('NavBar', () => {
  it('should render nav', async () => {
    await render({
      hideCloseButton: true,
    });
    screen.getByRole('navigation', { name: /Overordnet/i });
  });

  it('should render close button', async () => {
    jest.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location });

    await render({
      hideCloseButton: false,
    });
    expect(screen.getByRole('link', { name: 'Tilbake til innboks' })).toBeInTheDocument();
  });

  it('should hide close button', async () => {
    await render({
      hideCloseButton: true,
    });
    expect(screen.queryByRole('link', { name: 'Tilbake til innboks' })).not.toBeInTheDocument();
  });
});
