import React from 'react';

import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';

import NavBar from 'src/components/presentation/NavBar';
import type { ITextResource } from 'src/types';

import { getFormLayoutStateMock } from 'altinn-app-frontend/__mocks__/formLayoutStateMock';
import { getUiConfigStateMock } from 'altinn-app-frontend/__mocks__/uiConfigStateMock';
import {
  renderWithProviders,
  setupServer,
} from 'altinn-app-frontend/testUtils';

import { getLanguageFromCode } from 'altinn-shared/language';
import type { IAppLanguage } from 'altinn-shared/types';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

interface RenderNavBarProps {
  showBackArrow: boolean;
  hideCloseButton: boolean;
  showLanguageSelector: boolean;
  languageResponse?: IAppLanguage[];
  textResources?: ITextResource[];
}

const renderNavBar = ({
  hideCloseButton,
  showBackArrow,
  showLanguageSelector,
  languageResponse = [],
  textResources = [],
}: RenderNavBarProps) => {
  const mockClose = jest.fn();
  const mockBack = jest.fn();
  const mockAppLanguageChange = jest.fn();
  server.use(
    rest.get(/\/applicationlanguages/, (req, res, ctx) => {
      return res(ctx.json(languageResponse));
    }),
  );
  renderWithProviders(
    <NavBar
      handleClose={mockClose}
      handleBack={mockBack}
      showBackArrow={showBackArrow}
    />,
    {
      preloadedState: {
        language: {
          selectedAppLanguage: 'nb',
          language: getLanguageFromCode('nb'),
          error: null,
        },
        textResources: {
          resources: textResources,
          language: 'nb',
          error: null,
        },
        formLayout: getFormLayoutStateMock({
          uiConfig: getUiConfigStateMock({
            hideCloseButton,
            showLanguageSelector,
          }),
        }),
      },
    },
  );

  return { mockClose, mockBack, mockAppLanguageChange };
};

describe('NavBar', () => {
  it('should render nav', () => {
    renderNavBar({
      hideCloseButton: true,
      showBackArrow: false,
      showLanguageSelector: false,
    });
    screen.getByRole('navigation', { name: /Appnavigasjon/i });
  });

  it('should render close button', async () => {
    const { mockClose } = renderNavBar({
      hideCloseButton: false,
      showBackArrow: false,
      showLanguageSelector: false,
    });
    const closeButton = screen.getByRole('button', { name: /Lukk Skjema/i });
    await userEvent.click(closeButton);
    expect(mockClose).toHaveBeenCalled();
  });

  it('should hide close button and back button', () => {
    renderNavBar({
      hideCloseButton: true,
      showBackArrow: false,
      showLanguageSelector: false,
    });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByTestId('altinn-back-button')).toBeNull();
  });

  it('should render back button', async () => {
    const { mockBack } = renderNavBar({
      hideCloseButton: true,
      showBackArrow: true,
      showLanguageSelector: false,
    });
    const backButton = screen.getByTestId('altinn-back-button');
    await userEvent.click(backButton);
    expect(mockBack).toHaveBeenCalled();
  });
  it('should render and change app language', async () => {
    renderNavBar({
      hideCloseButton: false,
      showBackArrow: true,
      showLanguageSelector: true,
      languageResponse: [{ language: 'en' }, { language: 'nb' }],
    });
    await waitForElementToBeRemoved(screen.queryByRole('progressbar'));
    const dropdown = screen.getByRole('combobox', { name: /Språk/i });
    await userEvent.selectOptions(dropdown, 'en');
    expect(dropdown).toHaveValue('en');
  });
  it('should render app language with custom labels', async () => {
    renderNavBar({
      hideCloseButton: false,
      showBackArrow: true,
      showLanguageSelector: true,
      textResources: [
        {
          id: 'language.selector.label',
          value: 'Velg språk test',
        },
        {
          id: 'language.full_name.nb',
          value: 'Norsk test',
        },
        {
          id: 'language.full_name.en',
          value: 'Engelsk test',
        },
      ],
      languageResponse: [{ language: 'en' }, { language: 'nb' }],
    });
    await waitForElementToBeRemoved(screen.queryByRole('progressbar'));
    screen.getByRole('combobox', { name: /Velg språk test/i });
    screen.getByRole('option', { name: /Norsk test/i });
    screen.getByRole('option', { name: /Engelsk test/i });
  });
});
