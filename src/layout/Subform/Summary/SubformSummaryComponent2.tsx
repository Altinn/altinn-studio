import React, { type PropsWithChildren } from 'react';

import { Heading, Paragraph } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Label } from 'src/components/label/Label';
import { TaskStoreProvider } from 'src/core/contexts/taskStoreContext';
import { FormProvider } from 'src/features/form/FormContext';
import { useDataTypeFromLayoutSet } from 'src/features/form/layout/LayoutsContext';
import { useStrictDataElements } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useDoOverrideSummary } from 'src/layout/Subform/SubformWrapper';
import classes from 'src/layout/Subform/Summary/SubformSummaryComponent2.module.css';
import { SubformSummaryTable } from 'src/layout/Subform/Summary/SubformSummaryTable';
import {
  getSubformEntryDisplayName,
  useExpressionDataSourcesForSubform,
  useSubformFormData,
} from 'src/layout/Subform/utils';
import classes_singlevaluesummary from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary.module.css';
import { LayoutSetSummary } from 'src/layout/Summary2/SummaryComponent2/LayoutSetSummary';
import { NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { IData } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export const SummarySubformWrapper = ({ nodeId }: PropsWithChildren<{ nodeId: string }>) => {
  const node = useNode(nodeId) as LayoutNode<'Subform'>;
  const { layoutSet, id, textResourceBindings, entryDisplayName } = useNodeItem(node);
  const dataType = useDataTypeFromLayoutSet(layoutSet);
  const dataElements = useStrictDataElements(dataType);

  return (
    <>
      {dataElements.length === 0 && (
        <>
          <div className={classes.pageBreak} />
          <Label
            node={node}
            id={`subform-summary2-${id}`}
            renderLabelAs='span'
            weight='regular'
            textResourceBindings={{ title: textResourceBindings?.title }}
            className={classes.summaryLabelMargin}
          />
          <Paragraph asChild>
            <span className={classes.emptyField}>
              <Lang id='general.empty_summary' />
            </span>
          </Paragraph>
        </>
      )}
      {dataElements?.map((element, idx) => (
        <TaskStoreProvider key={element.id + idx}>
          <div className={classes.pageBreak} />
          <DoSummaryWrapper
            dataElement={element}
            layoutSet={layoutSet}
            node={node}
            entryDisplayName={entryDisplayName}
            title={textResourceBindings?.title}
          />
        </TaskStoreProvider>
      ))}
    </>
  );
};

const DoSummaryWrapper = ({
  dataElement,
  layoutSet,
  entryDisplayName,
  title,
  node,
}: React.PropsWithChildren<{
  dataElement: IData;
  layoutSet: string;
  entryDisplayName?: ExprValToActualOrExpr<ExprVal.String>;
  title: string | undefined;
  node: LayoutNode<'Subform'>;
}>) => {
  const isDone = useDoOverrideSummary(dataElement.id, layoutSet, dataElement.dataType);

  const { isSubformDataFetching, subformData, subformDataError } = useSubformFormData(dataElement.id);
  const subformDataSources = useExpressionDataSourcesForSubform(dataElement.dataType, subformData, entryDisplayName);

  if (!isDone || isSubformDataFetching) {
    return null;
  }

  const subformEntryName =
    entryDisplayName && !subformDataError
      ? getSubformEntryDisplayName(entryDisplayName, subformDataSources, { type: 'node', id: node.id })
      : null;

  return (
    <div className={classes.summaryWrapperMargin}>
      <FormProvider>
        <Flex
          container
          spacing={6}
          alignItems='flex-start'
        >
          <Flex item>
            <div className={classes_singlevaluesummary.labelValueWrapper}>
              <Label
                node={node}
                id={`subform-summary2-${dataElement.id}`}
                renderLabelAs='span'
                weight='regular'
                textResourceBindings={{ title }}
              />
              {subformEntryName && (
                <Heading
                  className='no-visual-testing'
                  spacing={false}
                  size='sm'
                  level={2}
                >
                  {subformEntryName}
                </Heading>
              )}
            </div>
          </Flex>
          <LayoutSetSummary />
        </Flex>
      </FormProvider>
    </div>
  );
};

export function SubformSummaryComponent2({
  displayType,
  subformId,
  componentNode,
}: {
  displayType?: string;
  subformId?: string;
  componentNode?: LayoutNode<'Subform'>;
}) {
  const allOrOneSubformId = NodesInternal.useShallowSelector((state) =>
    Object.values(state.nodeData)
      .filter((data) => data.layout.type === 'Subform')
      .filter((data) => {
        if (!subformId) {
          return data;
        }
        return data.layout.id === subformId;
      })
      .map((data) => data.layout.id),
  );

  if (displayType === 'table' && componentNode) {
    return <SubformSummaryTable targetNode={componentNode} />;
  }

  return (
    <>
      {allOrOneSubformId.map((childId, idx) => (
        <SummarySubformWrapper
          key={idx}
          nodeId={childId}
        />
      ))}
    </>
  );
}
