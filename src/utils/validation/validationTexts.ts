import type { ValidLanguageKey } from 'src/hooks/useLanguage';

export type IValidationTextMap = {
  [source: string]:
    | undefined
    | {
        [code: string]: ValidLanguageKey | undefined;
      };
};

export const validationTexts: IValidationTextMap = {
  File: {
    ContentTypeNotAllowed: 'altinn.standard_validation.file_content_type_not_allowed',
  },
};
