import React from 'react';
import type { PropsWithChildren } from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { DummyPresentation } from 'src/components/presentation/Presentation';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
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
import { useIsHiddenMulti } from 'src/utils/layout/hidden';
import { useExternalItem } from 'src/utils/layout/hooks';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useItemIfType } from 'src/utils/layout/useNodeItem';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { CompTypes } from 'src/layout/layout';
import type { NodeData } from 'src/utils/layout/types';

export const PDFView2 = () => {
  const order = usePageOrder();
  const { data: pdfSettings, isFetching: pdfFormatIsLoading } = usePdfFormatQuery(true);
  const pdfLayoutName = usePdfLayoutName();

  if (pdfFormatIsLoading) {
    return null;
  }

  if (pdfLayoutName) {
    // Render all components directly if given a separate PDF layout
    return (
      <PdfWrapping>
        <PlainPage pageKey={pdfLayoutName} />
      </PdfWrapping>
    );
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
        {order
          .filter((pageKey) => !pdfSettings?.excludedPages.includes(pageKey))
          .map((pageKey) => (
            <PdfForPage
              key={pageKey}
              pageKey={pageKey}
              pdfSettings={pdfSettings}
            />
          ))}
        <AllSubformSummaryComponent2 />
      </PdfWrapping>
    </DummyPresentation>
  );
};

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

function PdfForPage({ pageKey, pdfSettings }: { pageKey: string; pdfSettings: IPdfFormat | undefined }) {
  const lookups = useLayoutLookups();
  const children = NodesInternal.useShallowSelector((state) =>
    Object.values(state.nodeData)
      .filter(
        (data) =>
          data.pageKey === pageKey &&
          data.parentId === undefined &&
          data.nodeType !== 'Subform' &&
          !pdfSettings?.excludedComponents.includes(data.id),
      )
      .filter(<T extends CompTypes>(data: NodeData<T>) =>
        getComponentDef(data.nodeType).shouldRenderInAutomaticPDF(lookups.getComponent(data.baseId) as never),
      )
      .map((data) => data.id),
  );
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
