import type React from 'react';

import { getLanguageFromKey, getParsedLanguageFromText, getTextResourceByKey } from 'src/language/sharedLanguage';
import printStyles from 'src/styles/print.module.css';
import { AsciiUnitSeparator } from 'src/utils/attachment';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { IAttachment } from 'src/features/attachments';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IGridStyling, ITableColumnFormatting, ITableColumnProperties } from 'src/layout/layout';
import type { IPageBreak } from 'src/layout/layout.d';
import type { IComponentValidations, ITextResource, ITextResourceBindings } from 'src/types';
import type { ILanguage } from 'src/types/shared';
import type { AnyItem } from 'src/utils/layout/hierarchy.types';

export interface IComponentFormData {
  [binding: string]: string | undefined;
}

export const getTextResource = (resourceKey: string | undefined, textResources: ITextResource[]): React.ReactNode => {
  const textResourceValue = getTextResourceByKey(resourceKey, textResources);
  if (textResourceValue === resourceKey) {
    // No match in text resources
    return resourceKey;
  }
  if (!textResourceValue) {
    return undefined;
  }

  return getParsedLanguageFromText(textResourceValue);
};

export function selectComponentTexts(
  textResources: ITextResource[],
  textResourceBindings: ITextResourceBindings | undefined,
) {
  const result: { [textResourceKey: string]: React.ReactNode } = {};

  if (textResourceBindings) {
    Object.keys(textResourceBindings).forEach((key) => {
      result[key] = getTextResource(textResourceBindings[key], textResources);
    });
  }
  return result;
}

export function getFileUploadComponentValidations(
  validationError: 'upload' | 'update' | 'delete' | null,
  language: ILanguage,
  attachmentId?: string,
): IComponentValidations {
  const componentValidations: any = {
    simpleBinding: {
      errors: [],
      warnings: [],
    },
  };
  if (validationError === 'upload') {
    componentValidations.simpleBinding.errors.push(
      getLanguageFromKey('form_filler.file_uploader_validation_error_upload', language),
    );
  } else if (validationError === 'update') {
    if (attachmentId === undefined || attachmentId === '') {
      componentValidations.simpleBinding.errors.push(
        getLanguageFromKey('form_filler.file_uploader_validation_error_update', language),
      );
    } else {
      componentValidations.simpleBinding.errors.push(
        // If validation has attachmentId, add to start of message and seperate using ASCII Universal Seperator
        attachmentId +
          AsciiUnitSeparator +
          getLanguageFromKey('form_filler.file_uploader_validation_error_update', language),
      );
    }
  } else if (validationError === 'delete') {
    componentValidations.simpleBinding.errors.push(
      getLanguageFromKey('form_filler.file_uploader_validation_error_delete', language),
    );
  }
  return componentValidations;
}

export function getFileUploadWithTagComponentValidations(
  validationMessages: IComponentValidations | undefined,
  validationState: Array<{ id: string; message: string }>,
): Array<{ id: string; message: string }> {
  const result: Array<{ id: string; message: string }> = [];
  validationMessages = validationMessages && JSON.parse(JSON.stringify(validationMessages));

  if (!validationMessages || !validationMessages.simpleBinding) {
    validationMessages = {
      simpleBinding: {
        errors: [],
        warnings: [],
      },
    };
  }
  if (
    validationMessages.simpleBinding !== undefined &&
    validationMessages.simpleBinding.errors &&
    validationMessages.simpleBinding.errors.length > 0
  ) {
    parseFileUploadComponentWithTagValidationObject(validationMessages.simpleBinding.errors as string[]).forEach(
      (validation) => {
        result.push(validation);
      },
    );
  }
  validationState.forEach((validation) => {
    result.push(validation);
  });
  return result;
}

export const parseFileUploadComponentWithTagValidationObject = (
  validationArray: string[],
): Array<{ id: string; message: string }> => {
  if (validationArray === undefined || validationArray.length === 0) {
    return [];
  }
  const obj: Array<{ id: string; message: string }> = [];
  validationArray.forEach((validation) => {
    const val = validation.toString().split(AsciiUnitSeparator);
    if (val.length === 2) {
      obj.push({ id: val[0], message: val[1] });
    } else {
      obj.push({ id: '', message: validation });
    }
  });
  return obj;
};

export const isAttachmentError = (error: { id: string | null; message: string }): boolean => !!error.id;

export const isNotAttachmentError = (error: { id: string | null; message: string }): boolean => !error.id;

export const atleastOneTagExists = (attachments: IAttachment[]): boolean => {
  const totalTagCount: number = attachments
    .map((attachment: IAttachment) => (attachment.tags?.length ? attachment.tags.length : 0))
    .reduce((total, current) => total + current, 0);

  return totalTagCount !== undefined && totalTagCount >= 1;
};

export function getFieldName(
  textResourceBindings: ITextResourceBindings | undefined,
  textResources: ITextResource[],
  language: ILanguage,
  fieldKey?: string,
): string | undefined {
  if (fieldKey) {
    return smartLowerCaseFirst(
      getTextFromAppOrDefault(`form_filler.${fieldKey}`, textResources, language, undefined, true),
    );
  }

  if (textResourceBindings?.shortName) {
    return getTextResourceByKey(textResourceBindings.shortName, textResources);
  }

  if (textResourceBindings?.title) {
    return smartLowerCaseFirst(getTextResourceByKey(textResourceBindings.title, textResources));
  }

  return getLanguageFromKey('validation.generic_field', language);
}

/**
 * Un-uppercase the first letter of a string
 */
export function lowerCaseFirst(text: string, firstLetterIndex = 0): string {
  if (firstLetterIndex > 0) {
    return (
      text.substring(0, firstLetterIndex) + text[firstLetterIndex].toLowerCase() + text.substring(firstLetterIndex + 1)
    );
  }
  return text[firstLetterIndex].toLowerCase() + text.substring(1);
}

/**
 * Un-uppercase the first letter of a string, but be smart about it (avoiding it when the string is an
 * uppercase abbreviation, etc).
 */
export function smartLowerCaseFirst(text: string | undefined): string | undefined {
  if (text === undefined) {
    return undefined;
  }

  const uc = text.toUpperCase();
  const lc = text.toLowerCase();

  let letters = 0;
  let firstLetterIdx = 0;
  for (let i = 0; i < text.length; i++) {
    if (uc[i] === lc[i]) {
      // This is not a letter, or could not be case-converted, skip it
      continue;
    }
    letters++;

    if (letters === 1) {
      if (text[i] === lc[i]) {
        // First letter is lower case already, return early
        return text;
      }

      firstLetterIdx = i;
      continue;
    }

    if (text[i] !== lc[i]) {
      return text;
    }

    if (letters >= 5) {
      // We've seen enough, looks like normal text with an uppercase first letter
      return lowerCaseFirst(text, firstLetterIdx);
    }
  }

  return lowerCaseFirst(text, firstLetterIdx);
}

export const gridBreakpoints = (grid?: IGridStyling) => {
  const { xs, sm, md, lg, xl } = grid || {};
  return {
    xs: xs || 12,
    ...(sm && { sm }),
    ...(md && { md }),
    ...(lg && { lg }),
    ...(xl && { xl }),
  };
};

export const pageBreakStyles = (pageBreak: ExprResolved<IPageBreak> | undefined) => {
  if (!pageBreak) {
    return {};
  }

  return {
    [printStyles['break-before-auto']]: pageBreak.breakBefore === 'auto',
    [printStyles['break-before-always']]: pageBreak.breakBefore === 'always',
    [printStyles['break-before-avoid']]: pageBreak.breakBefore === 'avoid',
    [printStyles['break-after-auto']]: pageBreak.breakAfter === 'auto',
    [printStyles['break-after-always']]: pageBreak.breakAfter === 'always',
    [printStyles['break-after-avoid']]: pageBreak.breakAfter === 'avoid',
  };
};

export function getTextAlignment(component: AnyItem): 'left' | 'center' | 'right' {
  if (component.type !== 'Input') {
    return 'left';
  }
  const formatting = component.formatting;
  if (formatting && formatting.align) {
    return formatting.align;
  }
  if (formatting && formatting.number) {
    return 'right';
  }
  return 'left';
}

export function getColumnStylesRepeatingGroups(tableHeader, columnSettings: ITableColumnFormatting) {
  const column = columnSettings && columnSettings[tableHeader.baseComponentId];
  if (!column) {
    return;
  }

  const textAlignment = column.alignText ?? getTextAlignment(tableHeader);
  column.alignText = textAlignment;

  return getColumnStyles(column);
}

export function getColumnStyles(columnSettings: ITableColumnProperties) {
  const lineClampToggle =
    columnSettings.textOverflow?.lineWrap || columnSettings.textOverflow?.lineWrap === undefined ? 1 : 0;

  let width: string | number | undefined = columnSettings.width ?? 'auto';
  const widthPercentage = Number(width.substring(0, width.length - 1));
  if (width.charAt(width.length - 1) === '%' && widthPercentage) {
    // 16.3% of the tables width is dedicated to padding. Therefore we need multiply every configured
    // width with 0.837 in order to allow the user to specify column widths that sum up to 100% without
    // the total width exceeding 100% of the tables width in css.
    width = `${widthPercentage * 0.837}%`;
  }

  const columnStyleVariables = {
    '--cell-max-number-of-lines': (columnSettings.textOverflow?.maxHeight ?? 2) * lineClampToggle,
    '--cell-text-alignment': columnSettings.alignText,
    '--cell-width': width,
  };

  return columnStyleVariables as React.CSSProperties;
}
