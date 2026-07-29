import React from 'react';

import { Date } from '@app/form-component';
import { isValid, parseISO } from 'date-fns';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { formatDateLocale } from 'src/utils/dateUtils';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const DateComponent = ({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Date'>) => {
  const { textResourceBindings, direction, value, icon, format } = useItemWhenType(baseComponentId, 'Date');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const language = useCurrentLanguage();

  const renderLabel = overrideDisplay?.renderLabel ?? true;
  const inTable = overrideDisplay?.renderedInTable === true;
  const showLabel = renderLabel && !inTable;

  let displayData: string | null = null;
  try {
    const parsedValue = parseISO(value);
    displayData = isValid(parsedValue) ? formatDateLocale(language, parsedValue, format) : null;
    if (displayData?.includes('Unsupported: ')) {
      displayData = null;
      window.logErrorOnce(
        `Date component "${baseComponentId}" failed to format using "${format}": Unsupported token(s)`,
      );
    }
  } catch (err) {
    if (value?.trim() !== '') {
      window.logErrorOnce(`Date component "${baseComponentId}" failed to parse date "${value}":`, err);
    }
  }

  return (
    <Date
      componentId={componentId}
      value={displayData}
      title={showLabel ? textResourceBindings?.title : undefined}
      description={showLabel ? textResourceBindings?.description : undefined}
      help={showLabel ? textResourceBindings?.help : undefined}
      icon={icon}
      direction={direction ?? 'horizontal'}
      innerGrid={innerGrid}
    />
  );
};
