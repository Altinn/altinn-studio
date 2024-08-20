import React from 'react';

import cn from 'classnames';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Text/TextComponent.module.css';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const TextComponent = ({ node }: PropsFromGenericComponent<'Text'>) => {
  const { textResourceBindings, value, icon, direction } = useNodeItem(node);

  if (!textResourceBindings?.title) {
    return <span>{value}</span>;
  }

  return (
    <ComponentStructureWrapper
      node={node}
      label={{
        node,
        renderLabelAs: 'span',
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
      <span aria-labelledby={`label-${node.id}`}>{value}</span>
    </ComponentStructureWrapper>
  );
};
