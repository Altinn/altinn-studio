import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { DialogContent } from './DialogContent';
import { consequencesDialogData } from '../consequences.data';
import { renderWithProviders } from '../../../../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';

describe('DialogContent', () => {
  it('renders sections and items correctly', () => {
    renderDialogContent('unit-test-env');

    consequencesDialogData.forEach(({ titleKey, items }) => {
      expect(
        screen.getByRole('heading', { level: 3, name: textMock(titleKey) }),
      ).toBeInTheDocument();

      items.forEach(({ textKey }) => {
        expect(screen.getByText(textMock(textKey))).toBeInTheDocument();
      });
    });
  });

  it('should render the "Undeploy" button', (): void => {
    renderDialogContent('unit-test-env');

    const undeployButton = screen.getByRole('button', {
      name: textMock('app_deployment.undeploy_button'),
    });
    expect(undeployButton).toBeInTheDocument();
  });
});

function renderDialogContent(environment: string): void {
  renderWithProviders(<DialogContent environment={environment} />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/deploy`,
  });
}
