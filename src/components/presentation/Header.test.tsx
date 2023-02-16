import React from 'react';

import { screen } from '@testing-library/react';

import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { Header } from 'src/components/presentation/Header';
import { renderWithProviders } from 'src/testUtils';
import { ProcessTaskType } from 'src/types';

describe('Header', () => {
  it('should render as expected with header title', () => {
    renderWithProviders(
      <Header
        type={ProcessTaskType.Data}
        header='Test Header'
      />,
      {
        preloadedState: getInitialStateMock(),
      },
    );
    expect(screen.getByRole('banner')).toHaveTextContent('Test Header');
  });

  it('should render with success modal and custom text when process is archived', () => {
    renderWithProviders(<Header type={ProcessTaskType.Archived} />, {
      preloadedState: getInitialStateMock(),
    });
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('a-modal-background-success');
  });

  it('should not render progress', () => {
    renderWithProviders(<Header type={ProcessTaskType.Data} />, {
      preloadedState: getInitialStateMock(),
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('should render progress', () => {
    const mockFormLayout = getFormLayoutStateMock();
    renderWithProviders(<Header type={ProcessTaskType.Data} />, {
      preloadedState: getInitialStateMock({
        formLayout: {
          ...mockFormLayout,
          uiConfig: {
            ...mockFormLayout.uiConfig,
            showProgress: true,
            currentView: '3',
            tracks: {
              ...mockFormLayout.uiConfig.tracks,
              order: ['1', '2', '3', '4', '5', '6'],
            },
          },
        },
      }),
    });
    screen.getByRole('progressbar', { name: /Side 3 av 6/i });
  });
  it('should not render progress when Archieved', () => {
    const mockFormLayout = getFormLayoutStateMock();
    renderWithProviders(<Header type={ProcessTaskType.Archived} />, {
      preloadedState: getInitialStateMock({
        formLayout: {
          ...mockFormLayout,
          uiConfig: {
            ...mockFormLayout.uiConfig,
            showProgress: true,
            currentView: '3',
            tracks: {
              ...mockFormLayout.uiConfig.tracks,
              order: ['1', '2', '3', '4', '5', '6'],
            },
          },
        },
      }),
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
