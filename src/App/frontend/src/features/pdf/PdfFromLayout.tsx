import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { PropsWithChildren } from 'react';

import { Flex } from '@app/form-component';
import { Heading } from '@digdir/designsystemet-react';

import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { DummyPresentation } from 'src/components/presentation/Presentation';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { SearchParams } from 'src/core/routing/types';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { ExprVal } from 'src/features/expressions/types';
import { FormStore } from 'src/features/form/FormContext';
import {
  usePageSettings,
  usePdfExclusions,
  usePdfLayoutName,
} from 'src/features/form/layoutSettings/processLayoutSettings';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsPayment } from 'src/features/payment/utils';
import classes from 'src/features/pdf/PDFView.module.css';
import { getFeature } from 'src/features/toggles';
import { usePageOrder } from 'src/hooks/useNavigatePage';
import { getComponentDef } from 'src/layout';
import { GenericComponent } from 'src/layout/GenericComponent';
import { InstanceInformation } from 'src/layout/InstanceInformation/InstanceInformationComponent';
import { AllSubformSummaryComponent2 } from 'src/layout/Subform/Summary/SubformSummaryComponent2';
import { SummaryComponentFor } from 'src/layout/Summary/SummaryComponent';
import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { SummaryComponent2 } from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2';
import { TaskSummaryWrapper } from 'src/layout/Summary2/SummaryComponent2/TaskSummaryWrapper';
import { useIsHiddenMulti } from 'src/utils/layout/hidden';
import { useExternalItem } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import { useItemIfType } from 'src/utils/layout/useNodeItem';
import type { PdfExclusions } from 'src/features/form/layoutSettings/processLayoutSettings';

export function PdfFromLayout() {
  const pdfLayoutName = usePdfLayoutName();
  if (pdfLayoutName) {
    return (
      <PdfWrapping>
        <PlainPage pageKey={pdfLayoutName} />
      </PdfWrapping>
    );
  }

  return <AutoGeneratePdfFromLayout />;
}

function AutoGeneratePdfFromLayout() {
  const [params] = useSearchParams();
  const taskIds = params.getAll(SearchParams.PdfForTask);
  if (taskIds.length > 0) {
    throw new Error(
      `Unexpected search param ${SearchParams.PdfForTask} provided. This mode does not support passing ` +
        `${SearchParams.PdfForTask} as a search param, but will auto-generate a PDF from the ` +
        `current layout-set instead. To use the multi-task mode, you cannot have a layout-set ` +
        `set up for the current task.`,
    );
  }

  const pdfExclusions = usePdfExclusions();

  return (
    <DummyPresentation>
      <PdfWrapping>
        <div className={classes.instanceInfo}>
          <InstanceInformation
            elements={{
              dateSent: true,
              sender: true,
              receiver: true,
              referenceNumber: true,
            }}
          />
        </div>
        <AllPages pdfExclusions={pdfExclusions} />
        <AllSubformSummaryComponent2 />
      </PdfWrapping>
    </DummyPresentation>
  );
}

export function PdfForServiceTask() {
  const [params] = useSearchParams();
  const taskIds = params.getAll(SearchParams.PdfForTask);
  if (taskIds.length === 0) {
    throw new Error(
      `No task ids provided (this mode requires passing one or multiple ${SearchParams.PdfForTask} as a search param)`,
    );
  }

  return <AutoGeneratePdfFromTasks taskIds={taskIds} />;
}

function AutoGeneratePdfFromTasks({ taskIds }: { taskIds: string[] }) {
  return (
    <DummyPresentation>
      <PdfWrapping>
        <div className={classes.instanceInfo}>
          <InstanceInformation
            elements={{
              dateSent: true,
              sender: true,
              receiver: true,
              referenceNumber: true,
            }}
          />
        </div>
        {taskIds.map((taskId, idx) => (
          <TaskSummaryWrapper
            key={taskId}
            taskId={taskId}
          >
            {idx > 0 && <div className={classes.pageBreak} />}
            <AllPages pdfExclusions={noPdfExclusions} />
            <AllSubformSummaryComponent2 />
          </TaskSummaryWrapper>
        ))}
      </PdfWrapping>
    </DummyPresentation>
  );
}

function PdfWrapping({ children }: PropsWithChildren) {
  const orgLogoEnabled = Boolean(getApplicationMetadata().logo);
  const appOwner = useAppOwner();
  const appName = useAppName();
  const { langAsString } = useLanguage();
  const isPayment = useIsPayment();
  const { hideAppNameInPdf: hideAppNameInPdfExpr } = usePageSettings();
  const hideAppNameInPdf = useEvalExpression(hideAppNameInPdfExpr, {
    returnType: ExprVal.Boolean,
    defaultValue: false,
    errorIntroText: 'Invalid expression for hideAppNameInPdf in Settings.json',
  });

  return (
    <div
      id='pdfView'
      className={classes.pdfWrapper}
    >
      {orgLogoEnabled && (
        <div
          className={classes.pdfLogoContainer}
          data-testid='pdf-logo'
        >
          <OrganisationLogo />
        </div>
      )}
      {appOwner && <span role='doc-subtitle'>{appOwner}</span>}
      {!hideAppNameInPdf && (
        <Heading
          level={1}
          data-size='lg'
        >
          {isPayment ? `${appName} - ${langAsString('payment.receipt.title')}` : appName}
        </Heading>
      )}
      {children}
      <ReadyForPrint type='print' />
    </div>
  );
}

function PlainPage({ pageKey }: { pageKey: string }) {
  const lookups = FormStore.bootstrap.useLayoutLookups();
  const pageExists = lookups.allPerPage[pageKey] ?? false;
  const children = lookups.topLevelComponents[pageKey] ?? [];

  if (!pageExists) {
    const message = `Error using: "pdfLayoutName": ${JSON.stringify(pageKey)}, could not find a layout with that name.`;
    window.logErrorOnce(message);
    throw new Error(message);
  }

  return (
    <div className={classes.page}>
      <Flex
        container
        spacing={6}
        alignItems='flex-start'
      >
        {children.map((baseId) => (
          <GenericComponent
            key={baseId}
            baseComponentId={baseId}
          />
        ))}
      </Flex>
    </div>
  );
}

const noPdfExclusions: PdfExclusions = { pages: [], components: [] };

function AllPages({ pdfExclusions }: { pdfExclusions: PdfExclusions }) {
  const order = usePageOrder();
  const visiblePages = order.filter((pageKey) => !pdfExclusions.pages.includes(pageKey));

  return (
    <>
      {visiblePages.map((pageKey) => (
        <PdfForPage
          key={pageKey}
          pageKey={pageKey}
          pdfExclusions={pdfExclusions}
        />
      ))}
    </>
  );
}

function PdfForPage({ pageKey, pdfExclusions }: { pageKey: string; pdfExclusions: PdfExclusions }) {
  const children = useTopLevelComponentsToAutoRender(pageKey, pdfExclusions);
  const hidden = useIsHiddenMulti(children);

  return (
    <div className={classes.page}>
      <Flex
        container
        spacing={6}
        alignItems='flex-start'
      >
        {children.map((baseComponentId) => {
          if (hidden[baseComponentId]) {
            return null;
          }

          return (
            <PdfForNode
              key={baseComponentId}
              baseComponentId={baseComponentId}
            />
          );
        })}
      </Flex>
    </div>
  );
}

function useTopLevelComponentsToAutoRender(pageKey: string, pdfExclusions: PdfExclusions): string[] {
  const lookups = FormStore.bootstrap.useLayoutLookups();
  return useMemo(() => {
    const topLevel = lookups.topLevelComponents[pageKey] ?? [];
    return topLevel.filter((baseId) => {
      const component = lookups.getComponent(baseId);
      const def = getComponentDef(component.type);
      return (
        component.type !== 'Subform' &&
        !pdfExclusions.components.includes(baseId) &&
        def.shouldRenderInAutomaticPDF(component as never)
      );
    });
  }, [lookups, pageKey, pdfExclusions.components]);
}

function PdfForNode({ baseComponentId }: { baseComponentId: string }) {
  const component = useExternalItem(baseComponentId);
  const item = useItemIfType(baseComponentId, 'Summary2');

  if (item?.target?.taskId) {
    return <SummaryComponent2 baseComponentId={baseComponentId} />;
  }

  const betaEnabled = getFeature('betaPDFenabled');
  if (betaEnabled.value) {
    return <ComponentSummary targetBaseComponentId={baseComponentId} />;
  }

  return (
    <SummaryComponentFor
      targetBaseComponentId={baseComponentId}
      overrides={{
        largeGroup: component.type === 'Group',
        display: {
          hideChangeButton: true,
          hideValidationMessages: true,
        },
      }}
    />
  );
}
