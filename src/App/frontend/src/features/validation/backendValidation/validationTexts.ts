import type { ValidLanguageKey } from 'src/features/language/useLanguage';
import type { BuiltInValidationIssueSources } from 'src/features/validation';

export type IValidationTextMap = {
  [source in BuiltInValidationIssueSources]?: {
    [code: string]: ValidLanguageKey | undefined;
  };
};

/**
 * This maps source and code from IValidationIssue objects from the backend into language keys
 * used for standard validation messages from the backend.
 * @see mapValidationIssues
 */
export const validationTexts: IValidationTextMap = {
  File: {
    ContentTypeNotAllowed: 'altinn.standard_validation.file_content_type_not_allowed',
  },
  MimeTypeValidator: {
    ContentTypeNotAllowed: 'altinn.standard_validation.file_content_type_not_allowed',
  },
};
