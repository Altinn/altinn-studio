import React from 'react';
import { screen } from '@testing-library/react';
import { UnDeploy } from './UnDeploy';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

jest.spyOn(console, 'log').mockImplementation(() => {});

describe('UnDeploy', () => {
  it('should render the undeploy button with the correct text', () => {
    renderUnDeploy();

    expect(
      screen.getByRole('button', { name: textMock('app_deployment.undeploy_button') }),
    ).toBeInTheDocument();
  });

  it('should call console.log when the button is clicked', async () => {
    const user = userEvent.setup();
    renderUnDeploy();

    const button = screen.getByRole('button', {
      name: textMock('app_deployment.undeploy_button'),
    });
    await user.click(button);

    expect(console.log).toHaveBeenCalledWith('Undeploy feature will be implemented soon...');
  });
});

const renderUnDeploy = () => {
  renderWithProviders()(<UnDeploy />);
};
