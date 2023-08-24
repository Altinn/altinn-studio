import {
  languageStringMock,
  missingInputLanguageStringTestMock,
  nbLanguageMock,
  resourcePageTextfieldInputMock1,
  resourcePageTextfieldInputMock2,
  resourcePageTextfieldInputMock3,
  resourcePageTextfieldInputMock4,
  resourcePageTextfieldInputMock5,
  resourcePageTextfieldInputMock6,
  resourceTypeOptionDefaultMock,
  resourceTypeOptionIncorrectMock
} from "resourceadm/data-mocks/resourceMocks";
import { convertResourceTypeToDisplayString, getMissingInputLanguageString, getResourcePageTextfieldError, mapLanguageKeyToLanguageText } from "./resourceUtils";

describe('getResourcePageTextfieldError', () => {
  it('returns false when the field have valid data', () => {
    const hasError: boolean = getResourcePageTextfieldError(resourcePageTextfieldInputMock1);
    expect(hasError).toBeFalsy();
  });

  it('returns true when the a language field is empty', () => {
    const hasErrorMissingNB: boolean = getResourcePageTextfieldError(resourcePageTextfieldInputMock2);
    const hasErrorMissingNN: boolean = getResourcePageTextfieldError(resourcePageTextfieldInputMock3);
    const hasErrorMissingEN: boolean = getResourcePageTextfieldError(resourcePageTextfieldInputMock4);
    expect(hasErrorMissingNB).toBeTruthy();
    expect(hasErrorMissingNN).toBeTruthy();
    expect(hasErrorMissingEN).toBeTruthy();
  });

  it('returns true when the field is undefined or null', () => {
    const hasErrorUndef: boolean = getResourcePageTextfieldError(resourcePageTextfieldInputMock5);
    const hasErrorNull: boolean = getResourcePageTextfieldError(resourcePageTextfieldInputMock6);
    expect(hasErrorUndef).toBeTruthy();
    expect(hasErrorNull).toBeTruthy();
  });
});

describe('convertResourceTypeToDisplayString', () => {
  it ('converts the type to the correct display string', () => {
    const result = convertResourceTypeToDisplayString(resourceTypeOptionDefaultMock);
    expect(result).toEqual('Standard');
  })

  it('to return undefined for incorrect type', () => {
    const result = convertResourceTypeToDisplayString(resourceTypeOptionIncorrectMock);
    expect(result).toBeUndefined();
  })
})

describe('mapLanguageKeyToLanguageText', () => {
  it ('to return Bokmål for nb', () => {
    const result = mapLanguageKeyToLanguageText(nbLanguageMock);
    expect(result).toEqual('Bokmål');
  })
})

describe('getMissingInputLanguageString', () => {
  it ('to map a language with 2 non-empty fields to correct string', () => {
    const result = getMissingInputLanguageString(languageStringMock, 'test');
    expect(result).toEqual(missingInputLanguageStringTestMock)
  })
})
