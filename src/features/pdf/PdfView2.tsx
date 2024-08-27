import React from 'react';
import type { PropsWithChildren } from 'react';

import { Heading } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsPayment } from 'src/features/payment/utils';
import classes from 'src/features/pdf/PDFView.module.css';
import { usePdfFormatQuery } from 'src/features/pdf/usePdfFormatQuery';
import { getFeature } from 'src/features/toggles';
import { usePageOrder } from 'src/hooks/useNavigatePage';
import { GenericComponent } from 'src/layout/GenericComponent';
import { InstanceInformation } from 'src/layout/InstanceInformation/InstanceInformationComponent';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { SummaryComponent2 } from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2';
import { Hidden, NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { useNodeTraversal } from 'src/utils/layout/useNodeTraversal';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export const PDFView2 = () => {
  const order = usePageOrder();
  const { data: pdfSettings, isFetching: pdfFormatIsLoading } = usePdfFormatQuery(true);
  const pdfLayoutName = useLayoutSettings().pages.pdfLayoutName;
  const isHiddenPage = Hidden.useIsHiddenPageSelector();

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
        ?.filter((pageKey) => !isHiddenPage(pageKey))
        .filter((pageKey) => !pdfSettings?.excludedPages.includes(pageKey))
        .map((pageKey) => (
          <PdfForPage
            key={pageKey}
            pageKey={pageKey}
            pdfSettings={pdfSettings}
          />
        ))}
    </PdfWrapping>
  );
};

function PdfWrapping({ children }: PropsWithChildren) {
  const enableOrgLogo = Boolean(useApplicationMetadata().logoOptions);
  const appOwner = useAppOwner();
  const appName = useAppName();
  const { langAsString } = useLanguage();
  const isPayment = useIsPayment();

  return (
    <div
      id={'pdfView'}
      className={classes.pdfWrapper}
    >
      {appOwner && <span role='doc-subtitle'>{appOwner}</span>}

      <ConditionalWrapper
        condition={enableOrgLogo}
        wrapper={(children) => (
          <div
            className={classes.paymentTitleContainer}
            data-testid={'pdf-logo'}
          >
            {children} <OrganisationLogo></OrganisationLogo>
          </div>
        )}
      >
        <Heading
          level={1}
          size={'lg'}
        >
          {isPayment ? `${appName} - ${langAsString('payment.receipt.title')}` : appName}
        </Heading>
      </ConditionalWrapper>
      {children}
      <ReadyForPrint />
    </div>
  );
}

function PlainPage({ pageKey }: { pageKey: string }) {
  const children = useNodeTraversal((t) => {
    const page = t.findPage(pageKey);
    return page ? t.with(page).children() : [];
  });

  return (
    <div className={classes.page}>
      <Grid
        container={true}
        spacing={6}
        alignItems='flex-start'
      >
        {children.map((node) => (
          <GenericComponent
            key={node.id}
            node={node}
          />
        ))}
      </Grid>
    </div>
  );
}

function PdfForPage({ pageKey, pdfSettings }: { pageKey: string; pdfSettings: IPdfFormat | undefined }) {
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  const nodeDataSelector = NodesInternal.useNodeDataSelector();
  const children = useNodeTraversal((t) => {
    const page = t.findPage(pageKey);
    return page
      ? t
          .with(page)
          .children()
          .filter((node) => !isHiddenSelector(node))
          .filter((node) => !pdfSettings?.excludedComponents.includes(node.id))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((node) => node.def.shouldRenderInAutomaticPDF(node as any, nodeDataSelector))
      : [];
  });

  return (
    <div className={classes.page}>
      <Grid
        container={true}
        spacing={6}
        alignItems='flex-start'
      >
        {children.map((node) => (
          <PdfForNode
            key={node.id}
            node={node}
          />
        ))}
      </Grid>
    </div>
  );
}

function PdfForNode({ node }: { node: LayoutNode }) {
  const target = useNodeItem(node, (i) => (i.type === 'Summary2' ? i.target : undefined));
  if (node.isType('Summary2') && target?.taskId) {
    return (
      <SummaryComponent2
        key={node.id}
        summaryNode={node}
      />
    );
  }

  const betaEnabled = getFeature('betaPDFenabled');
  if (betaEnabled.value && node.def.renderSummary2) {
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
