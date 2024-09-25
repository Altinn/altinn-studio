import React from 'react';

import { ErrorMessage, Heading } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import classes from 'src/layout/Likert/Summary2/LikertSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export type LikertSummaryProps = {
  componentNode: LayoutNode<'Likert'>;
  isCompact?: boolean;
  emptyFieldText?: string;
};

export function LikertSummary({ componentNode, emptyFieldText, isCompact }: LikertSummaryProps) {
  const likertNodeItem = useNodeItem(componentNode);
  const readOnly = useNodeItem(componentNode, (item) => item.readOnly);

  const validations = useUnifiedValidationsForNode(componentNode);
  const errors = validationsOfSeverity(validations, 'error');
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);

  const rows = likertNodeItem.rows;

  if (!rows.length || rows.length <= 0) {
    return (
      <SingleValueSummary
        title={title}
        componentNode={componentNode}
        errors={errors}
        hideEditButton={readOnly}
        isCompact={isCompact}
        emptyFieldText={emptyFieldText}
      />
    );
  }

  return (
    <div className={classes.summaryItemWrapper}>
      <div className={classes.summaryItem}>
        <Heading
          size='xs'
          level={4}
        >
          <Lang id={title} />
        </Heading>
      </div>
      {rows.map((row) => (
        <LikertRowSummary
          key={row?.uuid}
          rowNode={row?.itemNode}
          emptyFieldText={emptyFieldText}
          readOnly={readOnly}
        />
      ))}
      {errors?.map(({ message }) => (
        <ErrorMessage key={message.key}>
          <Lang
            id={message.key}
            params={message.params}
            node={componentNode}
          ></Lang>
        </ErrorMessage>
      ))}
    </div>
  );
}

type LikertRowSummaryProps = {
  rowNode?: LayoutNode<'LikertItem'>;
  emptyFieldText?: string;
  readOnly?: boolean;
};

function LikertRowSummary({ rowNode, emptyFieldText, readOnly }: LikertRowSummaryProps) {
  const title = useNodeItem(rowNode, (i) => i.textResourceBindings?.title);
  const displayData = rowNode?.def.useDisplayData(rowNode);
  const validations = useUnifiedValidationsForNode(rowNode);
  const errors = validationsOfSeverity(validations, 'error');

  if (!rowNode) {
    return null;
  }

  return (
    <SingleValueSummary
      title={
        <Lang
          id={title}
          node={rowNode}
        />
      }
      componentNode={rowNode}
      displayData={displayData}
      errors={errors}
      hideEditButton={readOnly}
      emptyFieldText={emptyFieldText}
    />
  );
}
