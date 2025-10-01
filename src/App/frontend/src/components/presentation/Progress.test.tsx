import React from 'react';

import { screen } from '@testing-library/react';

import { Progress } from 'src/components/presentation/Progress';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

type RenderProps = {
  order: string[];
  currentPageId?: string;
};

const render = ({ order = [], currentPageId }: RenderProps) =>
  renderWithInstanceAndLayout({
    renderer: () => <Progress />,
    initialPage: currentPageId,
    queries: {
      fetchLayoutSettings: () => Promise.resolve({ showProgress: true, pages: { order } }),
    },
  });

describe('Progress', () => {
  it('should render progress', async () => {
    await render({ order: ['1', '2', '3', '4', '5', '6'], currentPageId: '3' });
    screen.getByRole('progressbar', { name: /Side 3 av 6/i });
  });
});
