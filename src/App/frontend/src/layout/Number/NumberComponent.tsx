import React from 'react';

import cn from 'classnames';

import { DisplayNumber } from 'src/app-components/Number/DisplayNumber';
import classes from 'src/app-components/Number/Number.module.css';
import { translationKey } from 'src/AppComponentsBridge';
import { getLabelId } from 'src/components/label/Label';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const NumberComponent = ({ baseComponentId }: PropsFromGenericComponent<'Number'>) => {
  const {
    textResourceBindings,
    value,
    icon,
    direction: _direction,
    formatting,
  } = useItemWhenType(baseComponentId, 'Number');
  const direction = _direction ?? 'horizontal';
  const currentLanguage = useCurrentLanguage();
  const indexedId = useIndexedId(baseComponentId);

  if (isNaN(value)) {
    return null;
  }

  const numberFormatting = getMapToReactNumberConfig(formatting, value.toString(), currentLanguage);

  if (!textResourceBindings?.title) {
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
        iconUrl={icon}
        iconAltText={translationKey(textResourceBindings.title)}
        labelId={getLabelId(indexedId)}
        formatting={numberFormatting}
      />
    </ComponentStructureWrapper>
  );
};
