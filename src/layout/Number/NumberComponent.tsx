import React from 'react';

import { formatNumericText } from '@digdir/design-system-react';
import cn from 'classnames';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Number/NumberComponent.module.css';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const NumberComponent = ({ node }: PropsFromGenericComponent<'Number'>) => {
  const { textResourceBindings, value, icon, direction, formatting } = useNodeItem(node);
  const currentLanguage = useCurrentLanguage();

  const numberFormatting = getMapToReactNumberConfig(formatting, value.toString(), currentLanguage);
  const displayData = numberFormatting?.number ? formatNumericText(value.toString(), numberFormatting.number) : value;

  if (isNaN(value)) {
    return null;
  }

  if (!textResourceBindings?.title) {
    return <span>{displayData}</span>;
  }

  return (
    <ComponentStructureWrapper
      node={node}
      label={{
        node,
        renderLabelAs: 'span',
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
      <span aria-labelledby={`label-${node.id}`}>{displayData}</span>
    </ComponentStructureWrapper>
  );
};
