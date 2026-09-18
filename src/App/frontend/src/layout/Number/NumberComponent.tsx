import React from 'react';

import { DisplayNumber, getLabelId } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import cn from 'classnames';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useResolvedFormatting } from 'src/layout/Input/formatting';
import classes from 'src/layout/Number/Number.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const NumberComponent = ({ baseComponentId }: PropsFromGenericComponent<'Number'>) => {
  const config = useComponentConfig(baseComponentId, 'Number');
  const value = useEvalExpression(config.value, Expressions.Number.value);
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Number.textResourceBindings.title);

  const direction = config.direction ?? 'horizontal';
  const currentLanguage = useCurrentLanguage();
  const { langAsString } = useLanguage();
  const indexedId = useIndexedId(baseComponentId);
  const resolvedFormatting = useResolvedFormatting(config.formatting);
  if (isNaN(value)) {
    return null;
  }
  const numberFormatting = getMapToReactNumberConfig(resolvedFormatting, value.toString(), currentLanguage);
  if (!title) {
    return (
      <DisplayNumber
        value={value}
        formatting={numberFormatting}
      />
    );
  }
  return (
    <ComponentStructureWrapper
      baseComponentId={baseComponentId}
      label={{
        baseComponentId,
        renderLabelAs: 'span',
        className: cn(
          classes.label,
          classes.numberComponent,
          direction === 'vertical' ? classes.vertical : classes.horizontal,
        ),
      }}
    >
      <DisplayNumber
        value={value}
        iconUrl={config.icon}
        iconAltText={langAsString(title)}
        labelId={getLabelId(indexedId)}
        formatting={numberFormatting}
      />
    </ComponentStructureWrapper>
  );
};
