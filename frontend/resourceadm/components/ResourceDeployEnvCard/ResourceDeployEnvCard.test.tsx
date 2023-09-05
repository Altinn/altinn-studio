import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResourceDeployEnvCard, ResourceDeployEnvCardProps } from './ResourceDeployEnvCard';
import { textMock } from '../../../testing/mocks/i18nMock';

const mockTestEnv: string = 'Test Environment';
const mockCurrentEnvVersion: string = '1';
const mockNewEnvVersion: string = '2';

describe('ResourceDeployEnvCard', () => {
  const defaultProps: ResourceDeployEnvCardProps = {
    isDeployPossible: true,
    envName: mockTestEnv,
    currentEnvVersion: mockCurrentEnvVersion,
    newEnvVersion: mockNewEnvVersion,
  };

  it('renders the environment name', () => {
    render(<ResourceDeployEnvCard {...defaultProps} />);
    const envName = screen.getByText(mockTestEnv);
    expect(envName).toBeInTheDocument();
  });

  it('renders the current environment version', () => {
    render(<ResourceDeployEnvCard {...defaultProps}  />);
    const currentVersion = screen.getByText(`v${mockCurrentEnvVersion}`);
    expect(currentVersion).toBeInTheDocument();
  });

  it('renders the new environment version and arrow icon if new version exists', () => {
    render(<ResourceDeployEnvCard {...defaultProps} />);
    const newVersion = screen.getByText(`v${mockNewEnvVersion}`);
    const arrowIcon = screen.getByTitle(textMock('resourceadm.deploy_card_arrow_icon', { env: mockTestEnv }));

    expect(newVersion).toBeInTheDocument();
    expect(arrowIcon).toBeInTheDocument();
  });

  it('disables the button when deploy is not possible', () => {
    render(<ResourceDeployEnvCard {...defaultProps} isDeployPossible={false} />);
    const deployButton = screen.getByRole('button', { name: textMock('resourceadm.deploy_card_publish', { env: mockTestEnv }) } );
    expect(deployButton).toHaveAttribute('aria-disabled', 'true');
  });
})
