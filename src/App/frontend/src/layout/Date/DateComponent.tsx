import React from 'react';

import { Date } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { isValid, parseISO } from 'date-fns';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { formatDateLocale } from 'src/utils/dateUtils';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const DateComponent = ({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Date'>) => {
  const config = useComponentConfig(baseComponentId, 'Date');
  const value = useEvalExpression(config.value, Expressions.Date.value);
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Date.textResourceBindings.title);
  const description = useEvalOptionalText(
    config.textResourceBindings?.description,
    Expressions.Date.textResourceBindings.description,
  );
  const help = useEvalOptionalText(config.textResourceBindings?.help, Expressions.Date.textResourceBindings.help);

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  const language = useCurrentLanguage();
  const renderLabel = overrideDisplay?.renderLabel ?? true;
  const inTable = overrideDisplay?.renderedInTable === true;
  const showLabel = renderLabel && !inTable;
  let displayData: string | null = null;
  try {
    const parsedValue = parseISO(value);
    displayData = isValid(parsedValue) ? formatDateLocale(language, parsedValue, config.format) : null;
    if (displayData?.includes('Unsupported: ')) {
      displayData = null;
      window.logErrorOnce(
        `Date component "${baseComponentId}" failed to format using "${config.format}": Unsupported token(s)`,
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
      title={title}
      description={showLabel ? description : undefined}
      help={showLabel ? help : undefined}
      hideLabel={!showLabel}
      icon={config.icon}
      direction={config.direction ?? 'horizontal'}
      labelGrid={config.grid?.labelGrid}
      innerGrid={innerGrid}
    />
  );
};
