import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import mockAxios from 'jest-mock-axios';

import { getFormLayoutStateMock } from 'src/__mocks__/getFormLayoutStateMock';
import { getUiConfigStateMock } from 'src/__mocks__/getUiConfigStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { NavBar } from 'src/components/presentation/NavBar';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IRawTextResource } from 'src/features/language/textResources';
import type { IAppLanguage } from 'src/types/shared';

afterEach(() => mockAxios.reset());

interface RenderNavBarProps {
  showBackArrow: boolean;
  hideCloseButton: boolean;
  showLanguageSelector: boolean;
  languageResponse?: IAppLanguage[];
  textResources?: IRawTextResource[];
}

const render = async ({
  hideCloseButton,
  showBackArrow,
  showLanguageSelector,
  languageResponse,
  textResources = [],
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
      fetchTextResources: () => Promise.resolve({ language: 'nb', resources: textResources }),
    },
    reduxGateKeeper: (action) => 'type' in action && action.type === 'deprecated/setCurrentLanguage',
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

    await userEvent.click(screen.getByRole('combobox', { name: /Språk/i }));
    const en = screen.getByText(/Engelsk/i, { selector: '[role=option]' });
    await userEvent.click(en);

    // Language now changed, so the value should be the language name in the selected language
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Language/i })).toHaveValue('English');
    });
  });
  it('should render app language with custom labels', async () => {
    await render({
      hideCloseButton: false,
      showBackArrow: true,
      showLanguageSelector: true,
      textResources: [
        { id: 'language.selector.label', value: 'Velg språk test' },
        { id: 'language.full_name.nb', value: 'Norsk test' },
        { id: 'language.full_name.en', value: 'Engelsk test' },
      ],
      languageResponse: [{ language: 'en' }, { language: 'nb' }],
    });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    screen.getByRole('combobox', { name: /Velg språk test/i });
    screen.getByText(/Norsk test/i, { selector: '[role=option]' });
    screen.getByText(/Engelsk test/i, { selector: '[role=option]' });
  });
});
