import React from 'react';

import dot from 'dot-object';

import { Flex } from 'src/app-components/Flex/Flex';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import classes from 'src/layout/Checkboxes/MultipleChoiceSummary.module.css';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useNodeFormData } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type Row = Record<string, string | number | boolean>;

export interface IMultipleChoiceSummaryProps {
  targetNode: LayoutNode<'Checkboxes' | 'MultipleSelect'>;
}

export function MultipleChoiceSummary({ targetNode }: IMultipleChoiceSummaryProps) {
  const rawFormData = useNodeFormData(targetNode);
  const dataModelBindings = useDataModelBindingsFor<'Checkboxes' | 'MultipleSelect'>(
    targetNode.baseId,
    (t) => t === 'Checkboxes' || t === 'MultipleSelect',
  );
  const options = useOptionsFor(targetNode.baseId, 'multi').options;
  const { langAsString } = useLanguage();

  const relativeCheckedPath =
    dataModelBindings?.checked && dataModelBindings?.group
      ? dataModelBindings.checked.field.replace(`${dataModelBindings.group.field}.`, '')
      : undefined;

  const relativeSimpleBindingPath =
    dataModelBindings?.simpleBinding && dataModelBindings?.group
      ? dataModelBindings.simpleBinding.field.replace(`${dataModelBindings.group.field}.`, '')
      : undefined;

  const displayRows = (rawFormData?.group as unknown as Row[])
    ?.filter((row) => (!relativeCheckedPath ? true : dot.pick(relativeCheckedPath, row) === true))
    .map((row) => (!relativeSimpleBindingPath ? true : dot.pick(relativeSimpleBindingPath, row)));

  const data = dataModelBindings.group
    ? getCommaSeparatedOptionsToText(displayRows?.join(','), options, langAsString)
    : getCommaSeparatedOptionsToText(rawFormData.simpleBinding, options, langAsString);

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
