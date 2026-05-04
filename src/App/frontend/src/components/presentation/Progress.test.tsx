import React from 'react';

import { screen } from '@testing-library/react';

import { defaultDataTypeMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { Progress } from 'src/components/presentation/Progress';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

type RenderProps = {
  order: string[];
  currentPageId?: string;
};

const render = ({ order = [], currentPageId }: RenderProps) => {
  window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
    ui.settings = { ...ui.settings!, showProgress: true };
    ui.folders.Task_1 = {
      defaultDataType: defaultDataTypeMock,
      pages: {
        order,
      },
    };
  });

  return renderWithInstanceAndLayout({
    renderer: () => <Progress />,
    initialPage: currentPageId,
  });
};

describe('Progress', () => {
  it('should render progress', async () => {
    await render({ order: ['1', '2', '3', '4', '5', '6'], currentPageId: '3' });
    screen.getByRole('progressbar', { name: /Side 3 av 6/i });
  });
});
