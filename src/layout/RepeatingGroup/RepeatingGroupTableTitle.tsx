import React from 'react';

import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { getColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface IProps {
  node: LayoutNode;
  columnSettings: ITableColumnFormatting;
}

export const RepeatingGroupTableTitle = ({ node, columnSettings }: IProps) => (
  <span
    className={classes.contentFormatting}
    style={getColumnStylesRepeatingGroups(node, columnSettings)}
  >
    <Lang id={getTableTitle('textResourceBindings' in node.item ? node.item.textResourceBindings : {})} />
  </span>
);

function getTableTitle(textResourceBindings: ITextResourceBindings) {
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
