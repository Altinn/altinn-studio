import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ResourceDeployEnvCardProps } from './ResourceDeployEnvCard';
import { ResourceDeployEnvCard } from './ResourceDeployEnvCard';
import { textMock } from '../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

const mockTestEnv: string = 'Test Environment';
const mockCurrentEnvVersion: string = '1';
const mockNewEnvVersion: string = '2';

describe('ResourceDeployEnvCard', () => {
  const user = userEvent.setup();
  const mockOnClick = jest.fn();

  const defaultProps: ResourceDeployEnvCardProps = {
    isDeployPossible: true,
    envName: mockTestEnv,
    currentEnvVersion: mockCurrentEnvVersion,
    newEnvVersion: mockNewEnvVersion,
    onClick: mockOnClick,
    loading: false,
  };

  it('displayes a spinner when loading is true', () => {
    render(<ResourceDeployEnvCard {...defaultProps} loading />);
    expect(screen.getByText(textMock('resourceadm.deploy_deploying'))).toBeInTheDocument();
  });

  it('renders the environment name', () => {
    render(<ResourceDeployEnvCard {...defaultProps} />);
    const envName = screen.getByText(mockTestEnv);
    expect(envName).toBeInTheDocument();
  });

  it('renders the current environment version', () => {
    render(<ResourceDeployEnvCard {...defaultProps} />);
    const currentVersion = screen.getByText(mockCurrentEnvVersion);
    expect(currentVersion).toBeInTheDocument();
  });

  it('renders the new environment version and arrow icon if new version exists', () => {
    render(<ResourceDeployEnvCard {...defaultProps} />);
    const newVersion = screen.getByText(mockNewEnvVersion);
    const arrowIcon = screen.getByTitle(
      textMock('resourceadm.deploy_card_arrow_icon', { env: mockTestEnv }),
    );

    expect(newVersion).toBeInTheDocument();
    expect(arrowIcon).toBeInTheDocument();
  });

  it('disables the button when deploy is not possible', () => {
    render(<ResourceDeployEnvCard {...defaultProps} isDeployPossible={false} />);
    const deployButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: mockTestEnv }),
    });
    expect(deployButton).toBeDisabled();
  });

  it('calls onclick when the button is clicked', async () => {
    render(<ResourceDeployEnvCard {...defaultProps} />);
    const deployButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: mockTestEnv }),
    });

    await act(() => user.click(deployButton));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
