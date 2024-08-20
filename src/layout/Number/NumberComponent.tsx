import React from 'react';

import { formatNumericText } from '@digdir/design-system-react';
import cn from 'classnames';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Number/NumberComponent.module.css';
import type { PropsFromGenericComponent } from 'src/layout';

export const NumberComponent = ({ node }: PropsFromGenericComponent<'Number'>) => {
  const { textResourceBindings, value, icon, direction, id } = node.item;
  const currentLanguage = useCurrentLanguage();

  const numberFormatting = getMapToReactNumberConfig(node.item.formatting, value.toString(), currentLanguage);
  const displayData = numberFormatting?.number ? formatNumericText(value.toString(), numberFormatting.number) : value;

  if (icon) {
    const imgType = icon.split('.').at(-1);

    if (!imgType) {
      throw new Error('Image source is missing file type. Are you sure the image source is correct?');
    }
  }

  if (!textResourceBindings?.title) {
    return <span>{displayData}</span>;
  }

  return (
    <ComponentStructureWrapper
      node={node}
      label={{
        textResourceBindings,
        renderLabelAs: 'span',
        id,
        className: cn(classes.numberComponent, direction === 'vertical' ? classes.vertical : classes.horizontal),
      }}
    >
      {!!icon && (
        <img
          src={icon}
          className={classes.icon}
          alt={textResourceBindings.title}
        />
      )}
      <span aria-labelledby={`label-${id}`}>{displayData}</span>
    </ComponentStructureWrapper>
  );
};
