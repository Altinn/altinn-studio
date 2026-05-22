import React from 'react';

import { DisplayText } from '@app/form-component';
import cn from 'classnames';

import { getLabelId } from 'src/components/label/Label';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Text/Text.module.css';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const TextComponent = ({ baseComponentId }: PropsFromGenericComponent<'Text'>) => {
  const { id, textResourceBindings, value, icon, direction: _direction } = useItemWhenType(baseComponentId, 'Text');
  const direction = _direction ?? 'horizontal';
  const { langAsString } = useLanguage();

  if (!textResourceBindings?.title) {
    return <DisplayText value={value} />;
  }

  return (
    <ComponentStructureWrapper
      baseComponentId={baseComponentId}
      label={{
        baseComponentId,
        renderLabelAs: 'span',
        className: cn(
          classes.label,
          classes.textComponent,
          direction === 'vertical' ? classes.vertical : classes.horizontal,
        ),
      }}
    >
      <DisplayText
        value={value}
        iconUrl={icon}
        iconAltText={langAsString(textResourceBindings.title)}
        labelId={getLabelId(id)}
      />
    </ComponentStructureWrapper>
  );
};
