import React from 'react';

import { screen } from '@testing-library/react';

import { PANEL_VARIANT } from 'src/app-components/Panel/constants';
import { Panel } from 'src/app-components/Panel/Panel';
import { renderWithAppComponentsProvider } from 'src/app-components/test/renderWithAppComponentsProvider';
import type { PanelVariant } from 'src/app-components/Panel/Panel';
import type { TranslationKey } from 'src/app-components/types';

describe('Panel', () => {
  const panelTitle = 'Panel Title' as TranslationKey;

  it('should show title and content', () => {
    renderWithAppComponentsProvider(
      <Panel
        variant={PANEL_VARIANT.Info}
        title={panelTitle}
      >
        Panel Content
      </Panel>,
    );
    expect(screen.getByText('Panel Title')).toBeInTheDocument();
    expect(screen.getByText('Panel Content')).toBeInTheDocument();
  });

  it('should not show icon when showIcon is not set', () => {
    renderWithAppComponentsProvider(
      <Panel
        variant={PANEL_VARIANT.Info}
        title={panelTitle}
      >
        Panel Content
      </Panel>,
    );
    expect(screen.queryByRole('img', { name: 'info' })).not.toBeInTheDocument();
  });

  it('should not show icon when showIcon is false', () => {
    renderWithAppComponentsProvider(
      <Panel
        variant={PANEL_VARIANT.Info}
        title={panelTitle}
        showIcon={false}
      >
        Panel Content
      </Panel>,
    );
    expect(screen.queryByRole('img', { name: 'info' })).not.toBeInTheDocument();
  });

  it.each<PanelVariant>(['info', 'warning', 'error', 'success'])(
    'should apply relevant icon based on variant when showIcon is true',
    (variant) => {
      renderWithAppComponentsProvider(
        <Panel
          variant={variant}
          title={panelTitle}
          showIcon
        >
          Panel Content
        </Panel>,
      );
      expect(screen.queryByRole('img', { name: variant })).toBeInTheDocument;
    },
  );
});
