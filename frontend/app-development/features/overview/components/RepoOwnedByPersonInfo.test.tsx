import React from 'react';
import { render, screen } from '@testing-library/react';
import { RepoOwnedByPersonInfo } from './RepoOwnedByPersonInfo';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('RepoOwnedByPersonInfo', () => {
  it('should show alert and info texts', () => {
    render(<RepoOwnedByPersonInfo />);

    const alert = screen.getByText(textMock('app_deployment.private_app_owner'));
    expect(alert).toBeInTheDocument();

    const infoText1 = screen.getByText(textMock('app_deployment.private_app_owner_info'));
    expect(infoText1).toBeInTheDocument();

    const infoText2 = screen.getByText(textMock('app_deployment.private_app_owner_help'));
    expect(infoText2).toBeInTheDocument();

    const infoText3 = screen.getByText(textMock('app_deployment.private_app_owner_options'));
    expect(infoText3).toBeInTheDocument();
  });
});
