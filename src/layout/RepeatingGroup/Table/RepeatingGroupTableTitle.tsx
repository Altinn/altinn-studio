import React from 'react';

import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface IProps {
  node: LayoutNode;
  columnSettings: ITableColumnFormatting;
}

export const RepeatingGroupTableTitle = ({ node, columnSettings }: IProps) => {
  const style = useColumnStylesRepeatingGroups(node, columnSettings);
  const tableTitle = useTableTitle(node);
  return (
    <span
      className={classes.contentFormatting}
      style={style}
    >
      <Lang id={tableTitle} />
    </span>
  );
};

function useTableTitle(node: LayoutNode) {
  const textResourceBindings = useNodeItem(node, (i) => i.textResourceBindings);

  if (!textResourceBindings) {
    return '';
  }

  if ('tableTitle' in textResourceBindings && textResourceBindings.tableTitle) {
    return textResourceBindings?.tableTitle;
  }
  if ('title' in textResourceBindings && textResourceBindings.title) {
    return textResourceBindings?.title;
  }
  return '';
}
