import React from 'react';

import cn from 'classnames';

import { DisplayText } from 'src/app-components/Text/DisplayText';
import classes from 'src/app-components/Text/Text.module.css';
import { getLabelId } from 'src/components/label/Label';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const TextComponent = ({ node }: PropsFromGenericComponent<'Text'>) => {
  const { textResourceBindings, value, icon, direction } = useNodeItem(node);

  if (!textResourceBindings?.title) {
    return <DisplayText value={value} />;
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
      <DisplayText
        value={value}
        iconUrl={icon}
        iconAltText={textResourceBindings.title}
        labelId={getLabelId(node.id)}
      />
    </ComponentStructureWrapper>
  );
};
