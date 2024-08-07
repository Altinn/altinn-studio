import type React from 'react';

import { isAttachmentUploaded } from 'src/features/attachments';
import printStyles from 'src/styles/print.module.css';
import type { IAttachment } from 'src/features/attachments';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type {
  IGridStyling,
  IPageBreakInternal,
  ITableColumnFormatting,
  ITableColumnProperties,
} from 'src/layout/common.generated';
import type { CompInternal, CompTypes, IDataModelBindings, ITextResourceBindings } from 'src/layout/layout';
import type { IDataModelBindingsForList } from 'src/layout/List/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type BindingToValues<B extends IDataModelBindings | undefined> = B extends undefined
  ? { [key: string]: undefined }
  : B extends IDataModelBindingsForList
    ? { list: string[] | undefined }
    : { [key in keyof B]: string | undefined };

export type IComponentFormData<T extends CompTypes> = BindingToValues<CompInternal<T>['dataModelBindings']>;

export const atLeastOneTagExists = (attachments: IAttachment[]): boolean => {
  let totalTagCount = 0;
  for (const attachment of attachments) {
    if (isAttachmentUploaded(attachment)) {
      totalTagCount += attachment.data.tags?.length || 0;
    }
  }

  return totalTagCount >= 1;
};

export function getFieldName(
  textResourceBindings: ITextResourceBindings,
  langTools: IUseLanguage,
  fieldKey?: string,
): string | undefined {
  const { langAsString } = langTools;

  if (fieldKey && fieldKey !== 'simpleBinding') {
    return smartLowerCaseFirst(langAsString(`form_filler.${fieldKey}`));
  }

  if (textResourceBindings && 'shortName' in textResourceBindings && textResourceBindings.shortName) {
    return langAsString(textResourceBindings.shortName);
  }

  if (textResourceBindings && 'title' in textResourceBindings && textResourceBindings.title) {
    return smartLowerCaseFirst(langAsString(textResourceBindings.title));
  }

  return langAsString('validation.generic_field');
}

export function getFieldNameKey(textResourceBindings: ITextResourceBindings, fieldKey?: string): string | undefined {
  if (fieldKey && fieldKey !== 'simpleBinding') {
    return `form_filler.${fieldKey}`;
  }

  if (textResourceBindings && 'shortName' in textResourceBindings && textResourceBindings.shortName) {
    return textResourceBindings.shortName;
  }

  if (textResourceBindings && 'title' in textResourceBindings && textResourceBindings.title) {
    return textResourceBindings.title;
  }

  return 'validation.generic_field';
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
  const { xs, sm, md, lg, xl } = grid ?? {};
  return {
    xs: xs ?? 12,
    ...(sm && { sm }),
    ...(md && { md }),
    ...(lg && { lg }),
    ...(xl && { xl }),
  };
};

export const pageBreakStyles = (pageBreak: IPageBreakInternal | undefined) => {
  if (!pageBreak) {
    return {};
  }

  return {
    [printStyles.breakBeforeAuto]: pageBreak.breakBefore === 'auto',
    [printStyles.breakBeforeAlways]: pageBreak.breakBefore === 'always',
    [printStyles.breakBeforeAvoid]: pageBreak.breakBefore === 'avoid',
    [printStyles.breakAfterAuto]: pageBreak.breakAfter === 'auto',
    [printStyles.breakAfterAlways]: pageBreak.breakAfter === 'always',
    [printStyles.breakAfterAvoid]: pageBreak.breakAfter === 'avoid',
  };
};

export function getTextAlignment(node: LayoutNode): 'left' | 'center' | 'right' {
  if (!node.isType('Input')) {
    return 'left';
  }
  const formatting = node.item.formatting;
  if (formatting && formatting.align) {
    return formatting.align;
  }
  if (formatting && formatting.number) {
    return 'right';
  }
  return 'left';
}

export function getColumnStylesRepeatingGroups(
  tableItem: LayoutNode,
  columnSettings: ITableColumnFormatting | undefined,
) {
  const column = columnSettings && columnSettings[tableItem.item.baseComponentId || tableItem.item.id];
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
