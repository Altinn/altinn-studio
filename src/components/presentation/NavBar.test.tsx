import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import mockAxios from 'jest-mock-axios';

import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { getProfileStateMock } from 'src/__mocks__/profileStateMock';
import { getUiConfigStateMock } from 'src/__mocks__/uiConfigStateMock';
import { NavBar } from 'src/components/presentation/NavBar';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { TextResourceMap } from 'src/features/textResources';
import type { IAppLanguage } from 'src/types/shared';

afterEach(() => mockAxios.reset());

interface RenderNavBarProps {
  showBackArrow: boolean;
  hideCloseButton: boolean;
  showLanguageSelector: boolean;
  languageResponse?: IAppLanguage[];
  textResources?: TextResourceMap;
}

const render = async ({
  hideCloseButton,
  showBackArrow,
  showLanguageSelector,
  languageResponse,
  textResources = {},
}: RenderNavBarProps) => {
  const mockClose = jest.fn();
  const mockBack = jest.fn();
  const mockAppLanguageChange = jest.fn();

  await renderWithoutInstanceAndLayout({
    renderer: () => (
      <NavBar
        handleClose={mockClose}
        handleBack={mockBack}
        showBackArrow={showBackArrow}
      />
    ),
    reduxState: {
      ...getInitialStateMock(),
      profile: getProfileStateMock({ selectedAppLanguage: 'nb' }),
      textResources: {
        resourceMap: textResources,
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
    queries: {
      fetchAppLanguages: () =>
        languageResponse ? Promise.resolve(languageResponse) : Promise.reject(new Error('No languages mocked')),
    },
    reduxGateKeeper: (action) => 'type' in action && action.type === 'profile/updateSelectedAppLanguage',
  });

  return { mockClose, mockBack, mockAppLanguageChange };
};

describe('NavBar', () => {
  it('should render nav', async () => {
    await render({
      hideCloseButton: true,
      showBackArrow: false,
      showLanguageSelector: false,
    });
    screen.getByRole('navigation', { name: /Appnavigasjon/i });
  });

  it('should render close button', async () => {
    const { mockClose } = await render({
      hideCloseButton: false,
      showBackArrow: false,
      showLanguageSelector: false,
    });
    const closeButton = screen.getByRole('button', { name: /Lukk Skjema/i });
    await userEvent.click(closeButton);
    expect(mockClose).toHaveBeenCalled();
  });

  it('should hide close button and back button', async () => {
    await render({
      hideCloseButton: true,
      showBackArrow: false,
      showLanguageSelector: false,
    });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByTestId('form-back-button')).toBeNull();
  });

  it('should render back button', async () => {
    const { mockBack } = await render({
      hideCloseButton: true,
      showBackArrow: true,
      showLanguageSelector: false,
    });
    const backButton = screen.getByTestId('form-back-button');
    await userEvent.click(backButton);
    expect(mockBack).toHaveBeenCalled();
  });
  it('should render and change app language', async () => {
    await render({
      hideCloseButton: false,
      showBackArrow: true,
      showLanguageSelector: true,
      languageResponse: [{ language: 'en' }, { language: 'nb' }],
    });
    const dropdown = screen.getByRole('combobox', { name: /Språk/i });
    await userEvent.click(dropdown);
    const en = screen.getByText(/Engelsk/i, { selector: '[role=option]' });
    await userEvent.click(en);

    // Language now changed, so the value should be the language name in the selected language
    expect(dropdown).toHaveValue('English');
  });
  it('should render app language with custom labels', async () => {
    await render({
      hideCloseButton: false,
      showBackArrow: true,
      showLanguageSelector: true,
      textResources: {
        'language.selector.label': {
          value: 'Velg språk test',
        },
        'language.full_name.nb': {
          value: 'Norsk test',
        },
        'language.full_name.en': {
          value: 'Engelsk test',
        },
      },
      languageResponse: [{ language: 'en' }, { language: 'nb' }],
    });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    screen.getByRole('combobox', { name: /Velg språk test/i });
    screen.getByText(/Norsk test/i, { selector: '[role=option]' });
    screen.getByText(/Engelsk test/i, { selector: '[role=option]' });
  });
});
