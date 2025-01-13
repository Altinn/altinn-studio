import React from 'react';

import cn from 'classnames';

import classes from 'src/app-components/Date/Date.module.css';
import { DisplayDate } from 'src/app-components/Date/DisplayDate';
import { getLabelId } from 'src/components/label/Label';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const DateComponent = ({ node }: PropsFromGenericComponent<'Date'>) => {
  const { textResourceBindings, value, icon, direction, format } = useNodeItem(node);

  if (!textResourceBindings?.title) {
    return (
      <DisplayDate
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
      <DisplayDate
        value={value}
        iconUrl={icon}
        iconAltText={textResourceBindings.title}
        labelId={getLabelId(node.id)}
        format={format}
      />
    </ComponentStructureWrapper>
  );
};
