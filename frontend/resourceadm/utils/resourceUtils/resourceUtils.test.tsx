import {
  createNavigationTab,
  getIsActiveTab,
  getMissingInputLanguageString,
  getResourcePageTextfieldError,
  mapLanguageKeyToLanguageText,
} from './resourceUtils';
import type { SupportedLanguage } from 'resourceadm/types/global';
import type { SupportedLanguageKey } from 'app-shared/types/ResourceAdm';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import { TestFlaskIcon } from '@navikt/aksel-icons';
import React from 'react';

describe('getResourcePageTextfieldError', () => {
  it('returns false when the field have valid data', () => {
    const resourcePageTextfieldInputMock1: SupportedLanguageKey<string> = {
      nb: 'Valid',
      nn: 'Valid',
      en: 'Valid',
    };
    const hasError: boolean = getResourcePageTextfieldError(resourcePageTextfieldInputMock1);
    expect(hasError).toBeFalsy();
  });

  it('returns true when the a language field is empty', () => {
    const defaultMock = { nb: '', nn: '', en: '' };

    const hasErrorMissingNB: boolean = getResourcePageTextfieldError({
      ...defaultMock,
      nb: 'Valid',
    });
    const hasErrorMissingNN: boolean = getResourcePageTextfieldError({
      ...defaultMock,
      nn: 'Valid',
    });
    const hasErrorMissingEN: boolean = getResourcePageTextfieldError({
      ...defaultMock,
      en: 'Valid',
    });

    expect(hasErrorMissingNB).toBeTruthy();
    expect(hasErrorMissingNN).toBeTruthy();
    expect(hasErrorMissingEN).toBeTruthy();
  });

  it('returns true when the field is undefined or null', () => {
    const hasErrorUndef: boolean = getResourcePageTextfieldError(undefined);
    const hasErrorNull: boolean = getResourcePageTextfieldError(null);
    expect(hasErrorUndef).toBeTruthy();
    expect(hasErrorNull).toBeTruthy();
  });
});

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
      translationFunctionMock
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
