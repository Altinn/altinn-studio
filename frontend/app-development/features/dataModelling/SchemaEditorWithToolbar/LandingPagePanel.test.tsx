import React from 'react';
import { screen, act } from '@testing-library/react';
import type { LandingPagePanelProps } from './LandingPagePanel';
import { LandingPagePanel } from './LandingPagePanel';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../packages/schema-editor/test/renderWithProviders';

const user = userEvent.setup();

const landingPagePropsMock: LandingPagePanelProps = {
  openCreateNew: jest.fn(),
};

describe('LandingPagePanel', () => {
  it('renders component', async () => {
    render();

    expect(screen.getByText(/app_data_modelling.landing_dialog_header/)).toBeInTheDocument();
    expect(screen.getByText(/app_data_modelling.landing_dialog_paragraph/)).toBeInTheDocument();
    expect(screen.getByTestId('FileSelector-input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /app_data_modelling.landing_dialog_upload/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /app_data_modelling.landing_dialog_create/ })).toBeInTheDocument();
  });

  it('opens create dialog when clicking create button', async () => {
    render();

    const button = screen.getByRole('button', { name: /app_data_modelling.landing_dialog_create/ });
    await act(() => user.click(button));

    expect(landingPagePropsMock.openCreateNew).toBeCalledTimes(1);
  });
});

const render = (props: Partial<LandingPagePanelProps> = {}) => {
  return renderWithProviders()(<LandingPagePanel {...landingPagePropsMock} {...props} />);
};
