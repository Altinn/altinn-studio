import React from 'react';

import cn from 'classnames';
import { isValid, parseISO } from 'date-fns';

import classes from 'src/app-components/Date/Date.module.css';
import { DisplayDate } from 'src/app-components/Date/DisplayDate';
import { getLabelId } from 'src/components/label/Label';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { formatDateLocale } from 'src/utils/dateUtils';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const DateComponent = ({ node }: PropsFromGenericComponent<'Date'>) => {
  const textResourceBindings = useNodeItem(node, (i) => i.textResourceBindings);
  const direction = useNodeItem(node, (i) => i.direction) ?? 'horizontal';
  const value = useNodeItem(node, (i) => i.value);
  const icon = useNodeItem(node, (i) => i.icon);
  const format = useNodeItem(node, (i) => i.format);
  const { langAsString } = useLanguage(node);
  const language = useCurrentLanguage();
  const parsedValue = parseISO(value);

  let displayData: string | null = null;
  try {
    displayData = isValid(parsedValue) ? formatDateLocale(language, parsedValue, format) : null;
    if (displayData?.includes('Unsupported: ')) {
      displayData = null;
      window.logErrorOnce(`Date component "${node.id}" failed to format using "${format}": Unsupported token(s)`);
    }
  } catch (err) {
    if (value?.trim() !== '') {
      window.logErrorOnce(`Date component "${node.id}" failed to parse date "${value}":`, err);
    }
  }

  if (!textResourceBindings?.title) {
    return <DisplayDate value={displayData} />;
  }

  return (
    <ComponentStructureWrapper
      node={node}
      label={{
        node,
        renderLabelAs: 'span',
        className: cn(
          classes.label,
          classes.dateComponent,
          direction === 'vertical' ? classes.vertical : classes.horizontal,
        ),
      }}
    >
      <DisplayDate
        value={displayData}
        iconUrl={icon}
        iconAltText={langAsString(textResourceBindings.title)}
        labelId={getLabelId(node.id)}
      />
    </ComponentStructureWrapper>
  );
};
