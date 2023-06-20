import type React from 'react';

import printStyles from 'src/styles/print.module.css';
import { AsciiUnitSeparator } from 'src/utils/attachment';
import type { IAttachment } from 'src/features/attachments';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IGridStyling, ITableColumnFormatting, ITableColumnProperties } from 'src/layout/layout';
import type { IPageBreak } from 'src/layout/layout.d';
import type { IComponentValidations, ITextResourceBindings } from 'src/types';
import type { AnyItem } from 'src/utils/layout/hierarchy.types';

export interface IComponentFormData {
  [binding: string]: string | undefined;
}

export function getFileUploadComponentValidations(
  validationError: 'upload' | 'update' | 'delete' | null,
  langTools: IUseLanguage,
  attachmentId?: string,
): IComponentValidations {
  const { langAsString } = langTools;
  const componentValidations: any = {
    simpleBinding: {
      errors: [],
      warnings: [],
    },
  };
  if (validationError === 'upload') {
    componentValidations.simpleBinding.errors.push(langAsString('form_filler.file_uploader_validation_error_upload'));
  } else if (validationError === 'update') {
    if (attachmentId === undefined || attachmentId === '') {
      componentValidations.simpleBinding.errors.push(langAsString('form_filler.file_uploader_validation_error_update'));
    } else {
      componentValidations.simpleBinding.errors.push(
        // If validation has attachmentId, add to start of message and seperate using ASCII Universal Seperator
        attachmentId + AsciiUnitSeparator + langAsString('form_filler.file_uploader_validation_error_update'),
      );
    }
  } else if (validationError === 'delete') {
    componentValidations.simpleBinding.errors.push(langAsString('form_filler.file_uploader_validation_error_delete'));
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
  langTools: IUseLanguage,
  fieldKey?: string,
): string | undefined {
  const { langAsString } = langTools;

  if (fieldKey) {
    return smartLowerCaseFirst(langAsString(`form_filler.${fieldKey}`));
  }

  if (textResourceBindings?.shortName) {
    return langAsString(textResourceBindings.shortName);
  }

  if (textResourceBindings?.title) {
    return smartLowerCaseFirst(langAsString(textResourceBindings.title));
  }

  return langAsString('validation.generic_field');
}

/**
 * Un-uppercase the first letter of a string
 */
export function lowerCaseFirst(text: string, firstLetterIndex = 0): string {
  if (text.length <= firstLetterIndex) {
    return text;
  }
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

  if (text.length === 0) {
    return text;
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

export function getColumnStylesRepeatingGroups(tableItem: AnyItem, columnSettings: ITableColumnFormatting | undefined) {
  const column = columnSettings && columnSettings[tableItem.baseComponentId || tableItem.id];
  if (!column) {
    return;
  }

  column.alignText = column.alignText ?? getTextAlignment(tableItem);

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
