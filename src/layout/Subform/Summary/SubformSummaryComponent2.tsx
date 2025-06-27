import React, { type PropsWithChildren } from 'react';

import { Heading, Paragraph } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Label, LabelInner } from 'src/components/label/Label';
import { TaskStoreProvider } from 'src/core/contexts/taskStoreContext';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { FormProvider } from 'src/features/form/FormContext';
import { useDataTypeFromLayoutSet, useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
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
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { LayoutSetSummary } from 'src/layout/Summary2/SummaryComponent2/LayoutSetSummary';
import { useSummaryOverrides } from 'src/layout/Summary2/summaryStoreContext';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { IData } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const SummarySubformWrapperInner = ({ nodeId }: PropsWithChildren<{ nodeId: string }>) => {
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

export const SummarySubformWrapper = React.memo(SummarySubformWrapperInner);
SummarySubformWrapper.displayName = 'SummarySubformWrapper';

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
  const item = useNodeItem(node);
  const isDone = useDoOverrideSummary(dataElement.id, layoutSet, dataElement.dataType);

  const { isSubformDataFetching, subformData, subformDataError } = useSubformFormData(dataElement.id);
  const subformDataSources = useExpressionDataSourcesForSubform(dataElement.dataType, subformData, entryDisplayName);

  if (!isDone || isSubformDataFetching) {
    return null;
  }

  const subformEntryName =
    entryDisplayName && !subformDataError
      ? getSubformEntryDisplayName(entryDisplayName, subformDataSources, node.id)
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
              <LabelInner
                item={item}
                nodeId={node.id}
                id={`subform-summary2-${dataElement.id}`}
                renderLabelAs='span'
                weight='regular'
                textResourceBindings={{ title }}
              />
              {subformEntryName && (
                <Heading
                  className='no-visual-testing'
                  data-size='sm'
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

export function AllSubformSummaryComponent2() {
  const lookups = useLayoutLookups();
  const allIds = Object.values(lookups.topLevelComponents)
    .flat()
    .filter((id) => (id ? lookups.allComponents[id]?.type === 'Subform' : false))
    .filter(typedBoolean);

  return (
    <>
      {allIds.map((childId, idx) => (
        <SummarySubformWrapper
          key={idx}
          nodeId={childId}
        />
      ))}
    </>
  );
}

export function SubformSummaryComponent2({ target }: Summary2Props<'Subform'>) {
  const displayType = useSummaryOverrides(target)?.display;
  const layoutSet = useNodeItem(target, (i) => i.layoutSet);
  const dataType = useDataTypeFromLayoutSet(layoutSet);
  const dataElements = useStrictDataElements(dataType);
  const minCount = useApplicationMetadata().dataTypes.find((dt) => dt.id === dataType)?.minCount;
  const hasElements = !!(dataType && dataElements.length > 0);
  const required = useNodeItem(target, (i) => i.required) || (minCount !== undefined && minCount > 0);

  const inner =
    displayType === 'table' && target ? (
      <SubformSummaryTable targetNode={target} />
    ) : (
      <SummarySubformWrapper nodeId={target.id} />
    );

  return (
    <SummaryFlex
      target={target}
      content={
        hasElements
          ? SummaryContains.SomeUserContent
          : required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
      }
    >
      {inner}
    </SummaryFlex>
  );
}
