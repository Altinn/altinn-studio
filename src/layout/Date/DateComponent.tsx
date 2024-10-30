import React from 'react';

import cn from 'classnames';

import { getLabelId } from 'src/components/label/Label';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { Date } from 'src/layout/Date/Date';
import classes from 'src/layout/Date/DateComponent.module.css';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const DateComponent = ({ node }: PropsFromGenericComponent<'Date'>) => {
  const { textResourceBindings, value, icon, direction, format } = useNodeItem(node);

  if (!textResourceBindings?.title) {
    return (
      <Date
        value={value}
        format={format}
      />
    );
  }

  return (
    <ComponentStructureWrapper
      node={node}
      label={{
        node,
        renderLabelAs: 'span',
        className: cn(classes.dateComponent, direction === 'vertical' ? classes.vertical : classes.horizontal),
      }}
    >
      <Date
        value={value}
        iconUrl={icon}
        iconAltText={textResourceBindings.title}
        labelId={getLabelId(node.id)}
        format={format}
      />
    </ComponentStructureWrapper>
  );
};
