import React from 'react';

import { Heading } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsPayment } from 'src/features/payment/utils';
import classes from 'src/features/pdf/PDFView.module.css';
import { usePdfPage } from 'src/hooks/usePdfPage';
import { CompCategory } from 'src/layout/common';
import { GenericComponent } from 'src/layout/GenericComponent';
import { GroupComponent } from 'src/layout/Group/GroupComponent';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const PDFComponent = ({ node }: { node: LayoutNode }) => {
  if (node.isType('Summary') || ('renderAsSummary' in node.item && node.item.renderAsSummary)) {
    return (
      <SummaryComponent
        summaryNode={node as LayoutNode<'Summary'>}
        overrides={{
          display: { hideChangeButton: true, hideValidationMessages: true },
        }}
      />
    );
  } else if (node.isType('Group')) {
    // Support grouping of summary components
    return (
      <GroupComponent
        groupNode={node}
        renderLayoutNode={(child: LayoutNode) => (
          <PDFComponent
            key={child.item.id}
            node={child}
          />
        )}
      />
    );
  } else if (node.isCategory(CompCategory.Presentation)) {
    return (
      <GenericComponent
        node={node}
        overrideItemProps={{
          grid: { xs: 12 },
        }}
      />
    );
  } else {
    window.logWarnOnce(`Component type: "${node.item.type}" is not allowed in PDF. Component id: "${node.item.id}"`);
    return null;
  }
};

export const PDFView = () => {
  const pdfPage = usePdfPage();
  const appName = useAppName();
  const appOwner = useAppOwner();
  const { langAsString } = useLanguage();

  const isPayment = useIsPayment();
  const enableOrgLogo = Boolean(useApplicationMetadata().logoOptions);

  if (!pdfPage) {
    return null;
  }

  return (
    <div
      id='pdfView'
      className={classes.pdfWrapper}
    >
      {appOwner && <span role='doc-subtitle'>{appOwner}</span>}

      <ConditionalWrapper
        condition={isPayment && enableOrgLogo}
        wrapper={(children) => (
          <div className={classes.paymentTitleContainer}>
            {children} <OrganisationLogo></OrganisationLogo>
          </div>
        )}
      >
        <Heading
          spacing={true}
          level={1}
          size='large'
        >
          {isPayment ? `${appName} - ${langAsString('payment.receipt.title')}` : appName}
        </Heading>
      </ConditionalWrapper>

      <Grid
        container={true}
        spacing={3}
        alignItems='flex-start'
      >
        {pdfPage.children().map((node) => (
          <PDFComponent
            key={node.item.id}
            node={node}
          />
        ))}
      </Grid>
      <ReadyForPrint />
    </div>
  );
};
