import React from 'react';
import type { MonthCaptionProps } from 'react-day-picker';

import { DropdownCaption as LibDropdownCaption } from '@app/form-component';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';

type DropdownCaptionProps = MonthCaptionProps & {
  minDate?: Date;
  maxDate?: Date;
};

/**
 * Thin app wrapper around the form-component `DropdownCaption` that injects the current language
 * locale. Used where the caption is passed directly to a date picker control (e.g. AddToList,
 * SimpleTable) and therefore cannot receive the locale from the surrounding component.
 */
export const DropdownCaption = (props: DropdownCaptionProps) => {
  const languageLocale = useCurrentLanguage();
  return (
    <LibDropdownCaption
      {...props}
      locale={languageLocale}
    />
  );
};
