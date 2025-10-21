import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { DummyPresentation } from 'src/components/presentation/Presentation';
import { BlockPrint, ReadyForPrint } from 'src/components/ReadyForPrint';
import { SearchParams } from 'src/core/routing/types';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { usePdfLayoutName } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsPayment } from 'src/features/payment/utils';
import classes from 'src/features/pdf/PDFView.module.css';
import { usePdfFormatQuery } from 'src/features/pdf/usePdfFormatQuery';
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
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemIfType } from 'src/utils/layout/useNodeItem';
import type { IPdfFormat } from 'src/features/pdf/types';

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

  const { data: pdfSettings, isFetching: pdfFormatIsLoading } = usePdfFormatQuery(true);

  if (pdfFormatIsLoading) {
    return <BlockPrint />;
  }

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
        <AllPages pdfSettings={pdfSettings} />
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
            {/* Settings intentionally omitted, as this is new functionality
            and PDF settings are deprecated at this point. */}
            <AllPages pdfSettings={undefined} />
            <AllSubformSummaryComponent2 />
          </TaskSummaryWrapper>
        ))}
      </PdfWrapping>
    </DummyPresentation>
  );
}

function PdfWrapping({ children }: PropsWithChildren) {
  const orgLogoEnabled = Boolean(useApplicationMetadata().logoOptions);
  const appOwner = useAppOwner();
  const appName = useAppName();
  const { langAsString } = useLanguage();
  const isPayment = useIsPayment();

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
      <Heading
        level={1}
        data-size='lg'
      >
        {isPayment ? `${appName} - ${langAsString('payment.receipt.title')}` : appName}
      </Heading>
      {children}
      <ReadyForPrint type='print' />
    </div>
  );
}

function PlainPage({ pageKey }: { pageKey: string }) {
  const pageExists = NodesInternal.useSelector((state) =>
    Object.values(state.pagesData.pages).some((data) => data.pageKey === pageKey),
  );
  const children = useLayoutLookups().topLevelComponents[pageKey] ?? [];

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

function AllPages({ pdfSettings }: { pdfSettings: IPdfFormat | undefined }) {
  const order = usePageOrder();
  const visiblePages = getPdfVisiblePages(order, pdfSettings);

  return (
    <>
      {visiblePages.map((pageKey) => (
        <PdfForPage
          key={pageKey}
          pageKey={pageKey}
          pdfSettings={pdfSettings}
        />
      ))}
    </>
  );
}

function getPdfVisiblePages(pages: string[], pdfSettings: IPdfFormat | undefined): string[] {
  if (!pdfSettings?.excludedPages) {
    return pages;
  }
  return pages.filter((pageKey) => !pdfSettings.excludedPages.includes(pageKey));
}

function PdfForPage({ pageKey, pdfSettings }: { pageKey: string; pdfSettings: IPdfFormat | undefined }) {
  const children = useTopLevelComponentsToAutoRender(pageKey, pdfSettings);
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

function useTopLevelComponentsToAutoRender(pageKey: string, pdfSettings: IPdfFormat | undefined): string[] {
  const lookups = useLayoutLookups();
  return useMemo(() => {
    const topLevel = lookups.topLevelComponents[pageKey] ?? [];
    return topLevel.filter((baseId) => {
      const component = lookups.getComponent(baseId);
      const def = getComponentDef(component.type);
      return (
        component.type !== 'Subform' &&
        !pdfSettings?.excludedComponents.includes(baseId) &&
        def.shouldRenderInAutomaticPDF(component as never)
      );
    });
  }, [lookups, pageKey, pdfSettings?.excludedComponents]);
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
