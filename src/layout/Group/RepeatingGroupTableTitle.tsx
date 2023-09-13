import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Group/RepeatingGroup.module.css';
import { getColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import type { ITableColumnFormatting } from 'src/layout/common.generated';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface IProps {
  node: LayoutNode;
  columnSettings: ITableColumnFormatting;
}

export const RepeatingGroupTableTitle = ({ node, columnSettings }: IProps) => {
  const { lang } = useLanguage(node);

  return (
    <span
      className={classes.contentFormatting}
      style={getColumnStylesRepeatingGroups(node, columnSettings)}
    >
      {lang(getTableTitle('textResourceBindings' in node.item ? node.item.textResourceBindings : {}))}
    </span>
  );
};

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
