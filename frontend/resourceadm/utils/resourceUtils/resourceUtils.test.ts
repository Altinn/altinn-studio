import { convertResourceTypeToDisplayString, getMissingInputLanguageString, getResourcePageTextfieldError, mapLanguageKeyToLanguageText } from "./resourceUtils";
import type { SupportedLanguage } from "resourceadm/types/global";
import type { ResourceTypeOption, SupportedLanguageKey } from "app-shared/types/ResourceAdm";

describe('getResourcePageTextfieldError', () => {
  it('returns false when the field have valid data', () => {
    const resourcePageTextfieldInputMock1: SupportedLanguageKey<string> = { nb: 'Valid', nn: 'Valid', en: 'Valid' };
    const hasError: boolean = getResourcePageTextfieldError(resourcePageTextfieldInputMock1);
    expect(hasError).toBeFalsy();
  });

  it('returns true when the a language field is empty', () => {
    const defaultMock = { nb: '', nn: '', en: '' }

    const hasErrorMissingNB: boolean = getResourcePageTextfieldError({ ...defaultMock, nb: 'Valid' });
    const hasErrorMissingNN: boolean = getResourcePageTextfieldError({ ...defaultMock, nn: 'Valid' });
    const hasErrorMissingEN: boolean = getResourcePageTextfieldError({ ...defaultMock, en: 'Valid' });

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

describe('convertResourceTypeToDisplayString', () => {
  it ('converts the type to the correct display string', () => {
    const resourceTypeOptionDefaultMock: ResourceTypeOption = 'Default';
    const result = convertResourceTypeToDisplayString(resourceTypeOptionDefaultMock);
    expect(result).toEqual('Standard');
  })

  it('to return undefined for incorrect type', () => {
    const resourceTypeOptionIncorrectMock: any = 'Incorrect';
    const result = convertResourceTypeToDisplayString(resourceTypeOptionIncorrectMock);
    expect(result).toBeUndefined();
  })
})

describe('mapLanguageKeyToLanguageText', () => {
  it ('to return Bokmål for nb', () => {
    const result = mapLanguageKeyToLanguageText('nb');
    expect(result).toEqual('Bokmål');
  })
})

describe('getMissingInputLanguageString', () => {
  it ('to map a language with 2 non-empty fields to correct string', () => {
    const languageStringMock: SupportedLanguage = {
      nb: 'Test tekst',
      nn: '',
      en: ''
    }
    const missingInputLanguageStringTestMock: string = 'Du mangler oversettelse for test på Nynorsk og Engelsk.'

    const result = getMissingInputLanguageString(languageStringMock, 'test');
    expect(result).toEqual(missingInputLanguageStringTestMock)
  })
})
