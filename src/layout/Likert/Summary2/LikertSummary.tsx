import React from 'react';

import { ErrorMessage, Heading } from '@digdir/designsystemet-react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import classes from 'src/layout/Likert/Summary2/LikertSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function LikertSummary({ target }: Summary2Props<'Likert'>) {
  const emptyFieldText = useSummaryOverrides(target)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const likertNodeItem = useNodeItem(target);
  const readOnly = useNodeItem(target, (item) => item.readOnly);

  const validations = useUnifiedValidationsForNode(target);
  const errors = validationsOfSeverity(validations, 'error');
  const title = useNodeItem(target, (i) => i.textResourceBindings?.title);

  const rows = likertNodeItem.rows;

  if (!rows.length || rows.length <= 0) {
    return (
      <SingleValueSummary
        title={
          <Lang
            id={title}
            node={target}
          />
        }
        componentNode={target}
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
          <Lang
            id={title}
            node={target}
          />
        </Heading>
      </div>
      {rows.map((row) => (
        <LikertRowSummary
          key={row?.uuid}
          rowNodeId={row?.itemNodeId}
          emptyFieldText={emptyFieldText}
          readOnly={readOnly}
          isCompact={isCompact}
        />
      ))}
      {errors?.map(({ message }) => (
        <ErrorMessage key={message.key}>
          <Lang
            id={message.key}
            params={message.params}
            node={target}
          />
        </ErrorMessage>
      ))}
    </div>
  );
}

type LikertRowSummaryProps = {
  rowNodeId?: string;
  emptyFieldText?: string;
  readOnly?: boolean;
  isCompact?: boolean;
};

function LikertRowSummary(props: LikertRowSummaryProps) {
  const rowNode = useNode(props.rowNodeId) as LayoutNode | undefined;

  if (!rowNode || !rowNode.isType('LikertItem')) {
    return null;
  }

  return (
    <LikertRowSummaryInner
      node={rowNode}
      {...props}
    />
  );
}

function LikertRowSummaryInner({
  node,
  emptyFieldText,
  readOnly,
  isCompact,
}: LikertRowSummaryProps & {
  node: LayoutNode<'LikertItem'>;
}) {
  const title = useNodeItem(node, (i) => i.textResourceBindings?.title);
  const displayData = useDisplayData(node);
  const validations = useUnifiedValidationsForNode(node);
  const errors = validationsOfSeverity(validations, 'error');

  return (
    <SingleValueSummary
      title={
        <Lang
          id={title}
          node={node}
        />
      }
      isCompact={isCompact}
      componentNode={node}
      displayData={displayData}
      errors={errors}
      hideEditButton={readOnly}
      emptyFieldText={emptyFieldText}
    />
  );
}
