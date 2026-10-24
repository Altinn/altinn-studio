import React from 'react';

import { screen } from '@testing-library/react';

import { NoActionRequiredPanel } from 'src/layout/SigningActions/PanelNoActionRequired';
import { expectConfiguredPlatformLink, expectNotConfiguredPlatformLink } from 'src/test/platformLink';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

// The panel's own layout wiring is not under test here, only its link to the inbox
vi.mock('src/layout/SigningActions/PanelSigning', () => ({
  SigningPanel: ({ actionButton }: { actionButton: React.ReactNode }) => <div>{actionButton}</div>,
}));
vi.mock('src/utils/layout/hooks', () => ({ useComponentConfig: () => ({ textResourceBindings: undefined }) }));
vi.mock('src/utils/layout/useEvalExpression', () => ({ useEvalOptionalText: () => undefined }));

async function render() {
  await renderWithoutInstanceAndLayout({
    renderer: () => (
      <NoActionRequiredPanel
        baseComponentId='signing-actions'
        hasSigned={true}
      />
    ),
  });
  return screen.getByRole('link', { name: /gå til innboks/i });
}

describe('NoActionRequiredPanel', () => {
  it('links to the configured inbox', async () => {
    expectConfiguredPlatformLink(
      await render(),
      'https://am.ui.tt02.altinn.no/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=https%3A%2F%2Faf.tt02.altinn.no%2F',
    );
  });

  it('shows the inbox link as not configured when no inbox url is configured', async () => {
    window.altinnAppGlobalData.platformFrontendSettings.arbeidsflateInboxUrl = undefined;

    expectNotConfiguredPlatformLink(await render(), 'ArbeidsflateInboxUrl');
  });
});
