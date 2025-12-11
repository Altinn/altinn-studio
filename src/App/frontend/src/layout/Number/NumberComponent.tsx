import React from 'react';

import cn from 'classnames';

import { DisplayNumber } from 'src/app-components/Number/DisplayNumber';
import classes from 'src/app-components/Number/Number.module.css';
import { getLabelId } from 'src/components/label/Label';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
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
  const { langAsString } = useLanguage();
  const currentLanguage = useCurrentLanguage();
  const indexedId = useIndexedId(baseComponentId);

  if (isNaN(value)) {
    return null;
  }

  if (!textResourceBindings?.title) {
    return (
      <DisplayNumber
        value={value}
        currentLanguage={currentLanguage}
        formatting={formatting}
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
        currentLanguage={currentLanguage}
        iconUrl={icon}
        iconAltText={langAsString(textResourceBindings.title)}
        labelId={getLabelId(indexedId)}
        formatting={formatting}
      />
    </ComponentStructureWrapper>
  );
};
