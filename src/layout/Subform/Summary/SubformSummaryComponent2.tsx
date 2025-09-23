import React, { Fragment, type PropsWithChildren } from 'react';

import { Heading, Paragraph } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Label, LabelInner } from 'src/components/label/Label';
import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { FormProvider } from 'src/features/form/FormContext';
import { useDataTypeFromLayoutSet, useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useInstanceDataElements } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
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
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { IData } from 'src/types/shared';

const SummarySubformWrapperInner = ({
  targetBaseComponentId,
}: PropsWithChildren<{ targetBaseComponentId: string }>) => {
  const { layoutSet, id, textResourceBindings, entryDisplayName } = useItemWhenType(targetBaseComponentId, 'Subform');
  const dataType = useDataTypeFromLayoutSet(layoutSet);
  const dataElements = useInstanceDataElements(dataType);

  return (
    <>
      {dataElements.length === 0 && (
        <>
          <div className={classes.pageBreak} />
          <Label
            baseComponentId={targetBaseComponentId}
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
        <Fragment key={idx}>
          <div className={classes.pageBreak} />
          <DoSummaryWrapper
            dataElement={element}
            layoutSet={layoutSet}
            baseComponentId={targetBaseComponentId}
            entryDisplayName={entryDisplayName}
            title={textResourceBindings?.title}
          />
        </Fragment>
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
  baseComponentId,
}: React.PropsWithChildren<{
  dataElement: IData;
  layoutSet: string;
  entryDisplayName?: ExprValToActualOrExpr<ExprVal.String>;
  title: string | undefined;
  baseComponentId: string;
}>) => {
  const item = useItemWhenType(baseComponentId, 'Subform');

  const { isSubformDataFetching, subformData, subformDataError } = useSubformFormData(dataElement.id);
  const subformDataSources = useExpressionDataSourcesForSubform(dataElement.dataType, subformData, entryDisplayName);

  if (isSubformDataFetching) {
    return null;
  }

  const subformEntryName =
    entryDisplayName && !subformDataError
      ? getSubformEntryDisplayName(entryDisplayName, subformDataSources, baseComponentId)
      : null;

  return (
    <div className={classes.summaryWrapperMargin}>
      <TaskOverrides
        dataModelElementId={dataElement.id}
        dataModelType={dataElement.dataType}
        layoutSetId={layoutSet}
      >
        <FormProvider readOnly={true}>
          <Flex
            container
            spacing={6}
            alignItems='flex-start'
          >
            <Flex item>
              <div className={classes_singlevaluesummary.labelValueWrapper}>
                <LabelInner
                  item={item}
                  baseComponentId={baseComponentId}
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
      </TaskOverrides>
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
          targetBaseComponentId={childId}
        />
      ))}
    </>
  );
}

export function SubformSummaryComponent2({ targetBaseComponentId }: Summary2Props) {
  const displayType = useSummaryOverrides<'Subform'>(targetBaseComponentId)?.display;
  const { layoutSet } = useItemWhenType(targetBaseComponentId, 'Subform');
  const dataType = useDataTypeFromLayoutSet(layoutSet);
  const dataElements = useInstanceDataElements(dataType);
  const minCount = useApplicationMetadata().dataTypes.find((dt) => dt.id === dataType)?.minCount;
  const hasElements = !!(dataType && dataElements.length > 0);
  const required =
    useItemWhenType(targetBaseComponentId, 'Subform').required || (minCount !== undefined && minCount > 0);

  const inner =
    displayType === 'table' ? (
      <SubformSummaryTable targetBaseComponentId={targetBaseComponentId} />
    ) : (
      <SummarySubformWrapper targetBaseComponentId={targetBaseComponentId} />
    );

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
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
