import React, { useState } from 'react';
import { MemoryRouter, useNavigate, useSearchParams } from 'react-router';
import type { PropsWithChildren } from 'react';

import { fireEvent, render, renderHook, screen } from '@testing-library/react';

import {
  CurrentLanguageProvider,
  useCurrentLanguage,
  useSetCurrentLanguage,
} from 'src/features/language/LanguageProvider';
import { CookieStorage } from 'src/utils/cookieStorage/CookieStorage';

function Consumer({ id = 'language' }: { id?: string }) {
  const language = useCurrentLanguage();
  const [count, setCount] = useState(0);
  return (
    <button
      data-testid={id}
      onClick={() => setCount(count + 1)}
    >
      {language}:{count}
    </button>
  );
}

function Controls() {
  const setLanguage = useSetCurrentLanguage();
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => setLanguage('nn')}>Set Nynorsk</button>
      <button onClick={() => setSearchParams({ lang: 'en' })}>English URL</button>
      <button onClick={() => navigate('/another-page')}>Another page</button>
    </>
  );
}

function Wrapper({ children }: PropsWithChildren) {
  return (
    <MemoryRouter>
      <CurrentLanguageProvider>{children}</CurrentLanguageProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.spyOn(window, 'logWarnOnce').mockImplementation(() => undefined);
  vi.spyOn(window, 'logInfoOnce').mockImplementation(() => undefined);
  vi.spyOn(window, 'logErrorOnce').mockImplementation(() => undefined);
  CookieStorage.removeItem('lang_12345');
  CookieStorage.removeItem('lang');
  window.altinnAppGlobalData.availableLanguages = [{ language: 'nb' }, { language: 'nn' }, { language: 'en' }];
  window.altinnAppGlobalData.userProfile!.partyId = 12345;
  window.altinnAppGlobalData.userProfile!.profileSettingPreference.language = 'nb';
});
afterEach(() => vi.restoreAllMocks());

it('requires a language provider for consumers', () => {
  expect(() => renderHook(useCurrentLanguage)).toThrow('CurrentLanguageProvider is missing');
});

it('prefers the URL over cookie and profile', () => {
  CookieStorage.setItem('lang_12345', 'nn');
  window.altinnAppGlobalData.userProfile!.profileSettingPreference.language = 'nb';
  render(
    <MemoryRouter initialEntries={['/?lang=en']}>
      <CurrentLanguageProvider>
        <Consumer />
      </CurrentLanguageProvider>
    </MemoryRouter>,
  );
  expect(screen.getByTestId('language')).toHaveTextContent('en:0');
});

it('updates all consumers when the language setter changes the cookie and removes the URL override', () => {
  render(
    <MemoryRouter initialEntries={['/?lang=en']}>
      <CurrentLanguageProvider>
        <Controls />
        <Consumer id='first' />
        <Consumer id='second' />
      </CurrentLanguageProvider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText('Set Nynorsk'));
  expect(screen.getByTestId('first')).toHaveTextContent('nn:0');
  expect(screen.getByTestId('second')).toHaveTextContent('nn:0');
  expect(CookieStorage.getItem('lang_12345')).toBe('nn');
});

it('reacts to URL language changes and resolves the fallback again when navigating without an override', () => {
  CookieStorage.setItem('lang_12345', 'nn');
  render(
    <Wrapper>
      <Controls />
      <Consumer />
    </Wrapper>,
  );
  expect(screen.getByTestId('language')).toHaveTextContent('nn:0');
  fireEvent.click(screen.getByText('English URL'));
  expect(screen.getByTestId('language')).toHaveTextContent('en:0');
  fireEvent.click(screen.getByText('Another page'));
  expect(screen.getByTestId('language')).toHaveTextContent('nn:0');
});

it('uses the profile when URL and cookie preferences are unsupported', () => {
  CookieStorage.setItem('lang_12345', 'fr');
  window.altinnAppGlobalData.userProfile!.profileSettingPreference.language = 'nn';
  render(
    <MemoryRouter initialEntries={['/?lang=de']}>
      <CurrentLanguageProvider>
        <Consumer />
      </CurrentLanguageProvider>
    </MemoryRouter>,
  );
  expect(screen.getByTestId('language')).toHaveTextContent('nn:0');
});

it('uses the unscoped cookie when no profile is available', () => {
  window.altinnAppGlobalData.userProfile = undefined;
  CookieStorage.setItem('lang', 'en');
  render(
    <Wrapper>
      <Consumer />
    </Wrapper>,
  );
  expect(screen.getByTestId('language')).toHaveTextContent('en:0');
});

it.each([
  [['nb', 'nn'], 'nb'],
  [['nn', 'en'], 'nn'],
  [['en'], 'en'],
  [['de', 'fr'], 'de'],
  [[], 'nb'],
] as const)('preserves available-language fallback for %s', (available, expected) => {
  window.altinnAppGlobalData.userProfile!.profileSettingPreference.language = 'unsupported';
  window.altinnAppGlobalData.availableLanguages = available.map((language) => ({ language }));
  render(
    <Wrapper>
      <Consumer />
    </Wrapper>,
  );
  expect(screen.getByTestId('language')).toHaveTextContent(`${expected}:0`);
});

it('does not read cookies or resolve URL state when a consumer rerenders', () => {
  render(
    <Wrapper>
      <Consumer />
    </Wrapper>,
  );
  const getCookie = vi.spyOn(CookieStorage, 'getItem');
  fireEvent.click(screen.getByTestId('language'));
  expect(screen.getByTestId('language')).toHaveTextContent('nb:1');
  expect(getCookie).not.toHaveBeenCalled();
});

it('notifies all language consumers through one shared cookie reader', () => {
  const getCookie = vi.spyOn(CookieStorage, 'getItem');
  const { rerender } = render(
    <Wrapper>
      <Consumer />
    </Wrapper>,
  );
  const oneConsumerReads = getCookie.mock.calls.length;
  getCookie.mockClear();
  rerender(
    <Wrapper>
      {Array.from({ length: 25 }, (_, index) => (
        <Consumer
          key={index}
          id={`language-${index}`}
        />
      ))}
    </Wrapper>,
  );
  expect(screen.getByTestId('language-24')).toHaveTextContent('nb:0');
  expect(getCookie.mock.calls.length).toBeLessThanOrEqual(oneConsumerReads + 1);
});

it('reuses the parent language without reading cookies in nested providers', () => {
  function Parent() {
    const [showNested, setShowNested] = useState(false);
    return (
      <>
        <button onClick={() => setShowNested(true)}>Show nested</button>
        {showNested && (
          <CurrentLanguageProvider>
            <Consumer id='nested' />
          </CurrentLanguageProvider>
        )}
      </>
    );
  }
  render(
    <Wrapper>
      <Parent />
    </Wrapper>,
  );
  const getCookie = vi.spyOn(CookieStorage, 'getItem');
  fireEvent.click(screen.getByText('Show nested'));
  expect(screen.getByTestId('nested')).toHaveTextContent('nb:0');
  expect(getCookie).not.toHaveBeenCalled();
});
