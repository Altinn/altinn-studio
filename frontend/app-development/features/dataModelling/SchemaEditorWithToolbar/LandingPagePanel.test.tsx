import React from 'react';
import { screen, act } from '@testing-library/react';
import type { LandingPagePanelProps } from './LandingPagePanel';
import { LandingPagePanel } from './LandingPagePanel';
import userEvent from '@testing-library/user-event';
import * as testids from '../../../../testing/testids';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { renderWithMockStore } from '../../../test/mocks';

const user = userEvent.setup();

const landingPagePropsMock: LandingPagePanelProps = {
  openCreateNew: jest.fn(),
};

describe('LandingPagePanel', () => {
  it('renders component', async () => {
    render();

    expect(screen.getByRole('heading', { name: textMock('app_data_modelling.landing_dialog_header') })).toBeInTheDocument();
    expect(screen.getByText(textMock('app_data_modelling.landing_dialog_paragraph'))).toBeInTheDocument();
    expect(screen.getByTestId(testids.fileSelectorInput)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('app_data_modelling.landing_dialog_upload') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('app_data_modelling.landing_dialog_create') })).toBeInTheDocument();
  });

  it('opens create dialog when clicking create button', async () => {
    render();

    const button = screen.getByRole('button', { name: textMock('app_data_modelling.landing_dialog_create') });
    await act(() => user.click(button));

    expect(landingPagePropsMock.openCreateNew).toBeCalledTimes(1);
  });
});

const render = (props: Partial<LandingPagePanelProps> = {}) =>
  renderWithMockStore()(<LandingPagePanel {...landingPagePropsMock} {...props} />);
