import React from 'react';
import type { PropsWithChildren } from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { DummyPresentation } from 'src/components/presentation/Presentation';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { usePdfLayoutName } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsPayment } from 'src/features/payment/utils';
import classes from 'src/features/pdf/PDFView.module.css';
import { usePdfFormatQuery } from 'src/features/pdf/usePdfFormatQuery';
import { getFeature } from 'src/features/toggles';
import { usePageOrder } from 'src/hooks/useNavigatePage';
import { getComponentDef } from 'src/layout';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { InstanceInformation } from 'src/layout/InstanceInformation/InstanceInformationComponent';
import { SubformSummaryComponent2 } from 'src/layout/Subform/Summary/SubformSummaryComponent2';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { SummaryComponent2 } from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2';
import { isHidden, NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
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
        <SubformSummaryComponent2 />
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
        size='lg'
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
  const children = NodesInternal.useShallowSelector((state) =>
    Object.values(state.nodeData)
      .filter((data) => data.pageKey === pageKey && data.parentId === undefined) // Find top-level nodes
      .map((data) => data.layout.id),
  );

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
        {children.map((nodeId) => (
          <GenericComponentById
            key={nodeId}
            id={nodeId}
          />
        ))}
      </Flex>
    </div>
  );
}

function PdfForPage({ pageKey, pdfSettings }: { pageKey: string; pdfSettings: IPdfFormat | undefined }) {
  const children = NodesInternal.useShallowSelector((state) =>
    Object.values(state.nodeData)
      .filter(
        (data) =>
          data.pageKey === pageKey &&
          data.parentId === undefined &&
          data.layout.type !== 'Subform' &&
          !isHidden(state, 'node', data.layout.id) &&
          !pdfSettings?.excludedComponents.includes(data.layout.id),
      )
      .filter(<T extends CompTypes>(data: NodeData<T>) => {
        const def = getComponentDef(data.layout.type);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return def.shouldRenderInAutomaticPDF(data as any);
      })
      .map((data) => data.layout.id),
  );

  return (
    <div className={classes.page}>
      <Flex
        container
        spacing={6}
        alignItems='flex-start'
      >
        {children.map((nodeId) => (
          <PdfForNode
            key={nodeId}
            nodeId={nodeId}
          />
        ))}
      </Flex>
    </div>
  );
}

function PdfForNode({ nodeId }: { nodeId: string }) {
  const node = useNode(nodeId);
  const target = useNodeItem(node, (i) => (i.type === 'Summary2' ? i.target : undefined));

  if (!node) {
    return null;
  }

  if (node.isType('Summary2') && target?.taskId) {
    return (
      <SummaryComponent2
        key={node.id}
        summaryNode={node}
      />
    );
  }

  const betaEnabled = getFeature('betaPDFenabled');
  if (betaEnabled.value) {
    return <ComponentSummary componentNode={node} />;
  }

  return (
    <SummaryComponent
      summaryNode={undefined}
      overrides={{
        targetNode: node,
        largeGroup: node.isType('Group'),
        display: {
          hideChangeButton: true,
          hideValidationMessages: true,
        },
      }}
    />
  );
}
