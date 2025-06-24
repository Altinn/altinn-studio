import React from 'react';

import { Heading, ValidationMessage } from '@digdir/designsystemet-react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { makeLikertChildId } from 'src/layout/Likert/Generator/makeLikertChildId';
import { useLikertRows } from 'src/layout/Likert/rowUtils';
import classes from 'src/layout/Likert/Summary2/LikertSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { EmptyChildrenBoundary, useReportSummaryRender } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import {
  SummaryContains,
  SummaryFlex,
  SummaryFlexForContainer,
} from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { DataModelLocationProvider } from 'src/utils/layout/DataModelLocation';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function LikertSummary({ target }: Summary2Props<'Likert'>) {
  const emptyFieldText = useSummaryOverrides(target)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const rows = useLikertRows(target);
  const groupBinding = useNodeItem(target, (i) => i.dataModelBindings.questions);
  const readOnly = useNodeItem(target, (item) => item.readOnly);

  const validations = useUnifiedValidationsForNode(target);
  const errors = validationsOfSeverity(validations, 'error');
  const title = useNodeItem(target, (i) => i.textResourceBindings?.title);
  const required = useNodeItem(target, (i) => i.required);
  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  if (!rows.length || rows.length <= 0) {
    return (
      <SummaryFlex
        target={target}
        content={required ? SummaryContains.EmptyValueRequired : SummaryContains.EmptyValueNotRequired}
      >
        <SingleValueSummary
          title={<Lang id={title} />}
          componentNode={target}
          errors={errors}
          hideEditButton={readOnly}
          isCompact={isCompact}
          emptyFieldText={emptyFieldText}
        />
      </SummaryFlex>
    );
  }

  return (
    <EmptyChildrenBoundary>
      <SummaryFlexForContainer
        target={target}
        hideWhen={hideEmptyFields}
      >
        <div className={classes.summaryItemWrapper}>
          <div className={classes.summaryItem}>
            <Heading
              data-size='xs'
              level={4}
            >
              <Lang id={title} />
            </Heading>
          </div>
          {rows.filter(typedBoolean).map((row) => (
            <DataModelLocationProvider
              key={row.index}
              groupBinding={groupBinding}
              rowIndex={row.index}
            >
              <LikertRowSummary
                rowNodeId={makeLikertChildId(target.id, row.index)}
                emptyFieldText={emptyFieldText}
                readOnly={readOnly}
                isCompact={isCompact}
              />
            </DataModelLocationProvider>
          ))}
          {errors?.map(({ message }) => (
            <ValidationMessage key={message.key}>
              <Lang
                id={message.key}
                params={message.params}
              />
            </ValidationMessage>
          ))}
        </div>
      </SummaryFlexForContainer>
    </EmptyChildrenBoundary>
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
  const required = useNodeItem(node, (i) => i.required);
  const displayData = useDisplayData(node);
  const validations = useUnifiedValidationsForNode(node);
  const errors = validationsOfSeverity(validations, 'error');

  useReportSummaryRender(
    displayData.trim() === ''
      ? required
        ? SummaryContains.EmptyValueRequired
        : SummaryContains.EmptyValueNotRequired
      : SummaryContains.SomeUserContent,
  );

  return (
    <SingleValueSummary
      title={<Lang id={title} />}
      isCompact={isCompact}
      componentNode={node}
      displayData={displayData}
      errors={errors}
      hideEditButton={readOnly}
      emptyFieldText={emptyFieldText}
    />
  );
}
