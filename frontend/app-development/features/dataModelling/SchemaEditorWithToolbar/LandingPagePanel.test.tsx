import React from 'react';
import { screen } from '@testing-library/react';
import type { LandingPagePanelProps } from './LandingPagePanel';
import { LandingPagePanel } from './LandingPagePanel';
import userEvent from '@testing-library/user-event';
import { fileSelectorInputId } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithMockStore } from '../../../test/mocks';

const user = userEvent.setup();

const landingPagePropsMock: LandingPagePanelProps = {
  openCreateNew: jest.fn(),
};

describe('LandingPagePanel', () => {
  it('renders component', async () => {
    renderLandingPagePanel();

    expect(
      screen.getByRole('heading', { name: textMock('app_data_modelling.landing_dialog_header') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_data_modelling.landing_dialog_paragraph')),
    ).toBeInTheDocument();
    expect(screen.getByTestId(fileSelectorInputId)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('app_data_modelling.landing_dialog_upload') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('app_data_modelling.landing_dialog_create') }),
    ).toBeInTheDocument();
  });

  it('opens create dialog when clicking create button', async () => {
    renderLandingPagePanel();

    const button = screen.getByRole('button', {
      name: textMock('app_data_modelling.landing_dialog_create'),
    });
    await user.click(button);

    expect(landingPagePropsMock.openCreateNew).toHaveBeenCalledTimes(1);
  });
});

const renderLandingPagePanel = (props: Partial<LandingPagePanelProps> = {}) =>
  renderWithMockStore()(<LandingPagePanel {...landingPagePropsMock} {...props} />);
