import React from 'react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useNodeOptions } from 'src/features/options/useNodeOptions';
import classes from 'src/layout/Checkboxes/MultipleChoiceSummary.module.css';
import { useNodeFormData } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface IMultipleChoiceSummaryProps {
  targetNode: LayoutNode<'Checkboxes' | 'MultipleSelect'>;
}

export function MultipleChoiceSummary({ targetNode }: IMultipleChoiceSummaryProps) {
  const rawFormData = useNodeFormData(targetNode);
  const options = useNodeOptions(targetNode).options;
  const { langAsString } = useLanguage();
  const data = getCommaSeparatedOptionsToText(rawFormData.simpleBinding, options, langAsString);

  return (
    <Flex
      item
      size={{ xs: 12 }}
      data-testid='multiple-choice-summary'
    >
      {Object.keys(data).length === 0 ? (
        <span className={classes.emptyField}>
          <Lang id='general.empty_summary' />
        </span>
      ) : (
        <ul className={classes.list}>
          {Object.keys(data).map((key) => (
            <li
              key={key}
              className={classes.listItem}
            >
              <div className={classes.data}>{data[key]}</div>
            </li>
          ))}
        </ul>
      )}
    </Flex>
  );
}
