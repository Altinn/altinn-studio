import React from 'react';

import cn from 'classnames';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Text/TextComponent.module.css';
import type { PropsFromGenericComponent } from 'src/layout';

export const TextComponent = ({ node }: PropsFromGenericComponent<'Text'>) => {
  const { textResourceBindings, value, icon, direction, id } = node.item;

  if (!textResourceBindings?.title) {
    return <span>{value}</span>;
  }

  return (
    <ComponentStructureWrapper
      node={node}
      label={{
        textResourceBindings,
        renderLabelAs: 'span',
        id,
        className: cn(classes.textComponent, direction === 'vertical' ? classes.vertical : classes.horizontal),
      }}
    >
      {!!icon && (
        <img
          src={icon}
          className={classes.icon}
          alt={textResourceBindings.title}
        />
      )}
      <span aria-labelledby={`label-${id}`}>{value}</span>
    </ComponentStructureWrapper>
  );
};
