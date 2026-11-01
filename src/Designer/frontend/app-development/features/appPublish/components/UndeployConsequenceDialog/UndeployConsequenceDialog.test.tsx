import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { UndeployConsequenceDialog } from './UndeployConsequenceDialog';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';

describe('UndeployConsequenceDialog', () => {
  it('shows the consequences of unpublishing when it is open', () => {
    renderUndeployConsequenceDialog(true);

    expect(
      screen.getByRole('heading', {
        name: textMock('app_deployment.unpublish_consequence_dialog_title'),
      }),
    ).toBeInTheDocument();
  });

  it('shows nothing when it is closed', () => {
    renderUndeployConsequenceDialog(false);

    expect(
      screen.queryByRole('heading', {
        name: textMock('app_deployment.unpublish_consequence_dialog_title'),
      }),
    ).not.toBeInTheDocument();
  });
});

function renderUndeployConsequenceDialog(isOpen: boolean): void {
  renderWithProviders(
    <UndeployConsequenceDialog environment='production' isOpen={isOpen} onClose={() => {}} />,
    { startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/deploy` },
  );
}
