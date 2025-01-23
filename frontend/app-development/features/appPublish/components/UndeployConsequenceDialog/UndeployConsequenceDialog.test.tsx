import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UndeployConsequenceDialog } from './UndeployConsequenceDialog';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';

describe('UndeployConsequenceDialog', () => {
  it('should open UndeployConsequenceDialog modal on button clicked', async () => {
    const environment = 'production';
    renderUndeployConsequenceDialog(environment);

    const button = screen.getByRole('button', {
      name: textMock('app_deployment.undeploy_button'),
    });

    const user = userEvent.setup();
    await user.click(button);

    const modalHeading = screen.getByRole('heading', {
      name: textMock('app_deployment.unpublish_consequence_dialog_title'),
    });
    expect(modalHeading).toBeInTheDocument();
  });
});

function renderUndeployConsequenceDialog(environment: string): void {
  renderWithProviders(<UndeployConsequenceDialog environment={environment} />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/deploy`,
  });
}
