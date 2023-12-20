import {
  createNavigationTab,
  getIsActiveTab,
  getMissingInputLanguageString,
  mapLanguageKeyToLanguageText,
} from './resourceUtils';
import type { SupportedLanguage } from 'resourceadm/types/global';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { TestFlaskIcon } from '@navikt/aksel-icons';
import React from 'react';

describe('mapLanguageKeyToLanguageText', () => {
  it('to return Bokmål for nb', () => {
    const translationFunctionMock = (key: string) => {
      if (key === 'language.nb') return 'Bokmål';
      if (key === 'language.nn') return 'Nynorsk';
      if (key === 'language.en') return 'Engelsk';
      return key;
    };

    const result = mapLanguageKeyToLanguageText('nb', translationFunctionMock);
    expect(result).toEqual('Bokmål');
  });
});

describe('getMissingInputLanguageString', () => {
  it('to map a language with 2 non-empty fields to correct string', () => {
    const translationFunctionMock = (key: string) => {
      if (key === 'resourceadm.about_resource_langauge_error_missing_2')
        return 'Du mangler oversettelse for test på Nynorsk og Engelsk.';
      return key;
    };

    const languageStringMock: SupportedLanguage = {
      nb: 'Test tekst',
      nn: '',
      en: '',
    };
    const missingInputLanguageStringTestMock: string =
      'Du mangler oversettelse for test på Nynorsk og Engelsk.';

    const result = getMissingInputLanguageString(
      languageStringMock,
      'test',
      translationFunctionMock,
    );
    expect(result).toEqual(missingInputLanguageStringTestMock);
  });

  describe('getIsActiveTab', () => {
    it('returns true when current page and tab id mathces', () => {
      const isActive = getIsActiveTab('about', 'about');
      expect(isActive).toBeTruthy();
    });

    it('returns false when current page and tab id does not match', () => {
      const isActive = getIsActiveTab('about', 'policy');
      expect(isActive).toBeFalsy();
    });
  });

  describe('createNavigationTab', () => {
    const mockOnClick = jest.fn();

    const mockTo: string = '/about';

    const mockTab: LeftNavigationTab = {
      icon: <TestFlaskIcon />,
      tabName: 'resourceadm.left_nav_bar_about',
      tabId: 'about',
      action: {
        type: 'link',
        onClick: mockOnClick,
        to: mockTo,
      },
      isActiveTab: true,
    };

    it('creates a new tab when the function is called', () => {
      const newTab = createNavigationTab(<TestFlaskIcon />, 'about', mockOnClick, 'about', mockTo);

      expect(newTab).toEqual(mockTab);
    });
  });
});
