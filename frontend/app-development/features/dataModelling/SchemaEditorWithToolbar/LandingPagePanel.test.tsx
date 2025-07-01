import React from 'react';
import { screen } from '@testing-library/react';
import type { LandingPagePanelProps } from './LandingPagePanel';
import { LandingPagePanel } from './LandingPagePanel';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../test/mocks';

const landingPagePropsMock: LandingPagePanelProps = {
  openCreateNew: jest.fn(),
  canUseUploadXSDFeature: true,
};

describe('LandingPagePanel', (): void => {
  it('renders component', async (): Promise<void> => {
    renderLandingPagePanel();

    expect(getLandingPageHeader()).toBeInTheDocument();
    expect(getLandingPageBody()).toBeInTheDocument();
    expect(getUploadXSButton()).toBeInTheDocument();
    expect(getCreateNewDataModelButton()).toBeInTheDocument();
  });

  it('opens create dialog when clicking create button', async (): Promise<void> => {
    const user = userEvent.setup();
    renderLandingPagePanel();
    await user.click(getCreateNewDataModelButton());
    expect(landingPagePropsMock.openCreateNew).toHaveBeenCalledTimes(1);
  });

  it('should hide upload xsd if feature is not available', (): void => {
    renderLandingPagePanel({ canUseUploadXSDFeature: false });
    expect(queryUploadXSDButton()).not.toBeInTheDocument();
  });
});

function getLandingPageHeader(): HTMLHeadingElement {
  return screen.getByRole('heading', {
    name: textMock('app_data_modelling.landing_dialog_header'),
  });
}

function getLandingPageBody(): HTMLParagraphElement {
  return screen.getByText(textMock('app_data_modelling.landing_dialog_paragraph'));
}

function getCreateNewDataModelButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: textMock('app_data_modelling.landing_dialog_create') });
}

function queryUploadXSDButton(): HTMLButtonElement | null {
  return screen.queryByRole('button', {
    name: textMock('app_data_modelling.landing_dialog_upload'),
  });
}

function getUploadXSButton(): HTMLButtonElement {
  return screen.getByRole('button', {
    name: textMock('app_data_modelling.landing_dialog_upload'),
  });
}

const defaultProps: Partial<LandingPagePanelProps> = {
  canUseUploadXSDFeature: true,
};

const renderLandingPagePanel = (props: Partial<LandingPagePanelProps> = {}) =>
  renderWithProviders()(
    <LandingPagePanel {...landingPagePropsMock} {...defaultProps} {...props} />,
  );
