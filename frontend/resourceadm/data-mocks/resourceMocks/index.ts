import type { ResourceTypeOption, SupportedLanguageKey } from "app-shared/types/ResourceAdm";
import { SupportedLanguage } from "resourceadm/types/global";

export const resourcePageTextfieldInputMock1: SupportedLanguageKey<string> = { nb: 'Valid', nn: 'Valid', en: 'Valid' };
export const resourcePageTextfieldInputMock2: SupportedLanguageKey<string> = undefined;
export const resourcePageTextfieldInputMock3: SupportedLanguageKey<string> = null;

export const resourceTypeOptionDefaultMock: ResourceTypeOption = 'Default';
export const resourceTypeOptionIncorrectMock: any = 'Incorrect';

export const nbLanguageMock = 'nb';

export const languageStringMock: SupportedLanguage = {
  nb: 'Test tekst',
  nn: '',
  en: ''
}
export const missingInputLanguageStringTestMock: string = 'Du mangler oversettelse for test på Nynorsk og Engelsk.'
