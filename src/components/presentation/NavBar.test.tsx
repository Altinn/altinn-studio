import React from 'react';

import { act, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import mockAxios from 'jest-mock-axios';

import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getProfileStateMock } from 'src/__mocks__/profileStateMock';
import { getUiConfigStateMock } from 'src/__mocks__/uiConfigStateMock';
import { NavBar } from 'src/components/presentation/NavBar';
import { renderWithProviders } from 'src/test/renderWithProviders';
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

const renderNavBar = ({
  hideCloseButton,
  showBackArrow,
  showLanguageSelector,
  languageResponse,
  textResources = {},
}: RenderNavBarProps) => {
  const mockClose = jest.fn();
  const mockBack = jest.fn();
  const mockAppLanguageChange = jest.fn();

  renderWithProviders(
    <NavBar
      handleClose={mockClose}
      handleBack={mockBack}
      showBackArrow={showBackArrow}
    />,
    {
      preloadedState: {
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
    },
  );

  if (languageResponse) {
    mockAxios.mockResponseFor(
      {
        url: 'https://local.altinn.cloud/ttd/test/api/v1/applicationlanguages',
      },
      { data: languageResponse },
    );
  }

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
    expect(screen.queryByTestId('form-back-button')).toBeNull();
  });

  it('should render back button', async () => {
    const { mockBack } = renderNavBar({
      hideCloseButton: true,
      showBackArrow: true,
      showLanguageSelector: false,
    });
    const backButton = screen.getByTestId('form-back-button');
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
    await act(() => dropdown.click());
    const en = screen.getByText(/Engelsk/i, { selector: '[role=option]' });
    await act(() => en.click());

    // Language now changed, so the value should be the language name in the selected language
    expect(dropdown).toHaveValue('English');
  });
  it('should render app language with custom labels', async () => {
    renderNavBar({
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
    await waitForElementToBeRemoved(screen.queryByRole('progressbar'));
    screen.getByRole('combobox', { name: /Velg språk test/i });
    screen.getByText(/Norsk test/i, { selector: '[role=option]' });
    screen.getByText(/Engelsk test/i, { selector: '[role=option]' });
  });
});
