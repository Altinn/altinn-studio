import React from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { usePageNavigationConfig } from 'src/features/form/layout/PageNavigationContext';
import { useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsPayment } from 'src/features/payment/utils';
import classes from 'src/features/pdf/PDFView.module.css';
import { usePdfFormatQuery } from 'src/features/pdf/usePdfFormatQuery';
import { InstanceInformation } from 'src/layout/InstanceInformation/InstanceInformationComponent';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { SummaryComponent2 } from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2';
import { useNodes } from 'src/utils/layout/NodesContext';
import type { CompSummary2Internal } from 'src/layout/Summary2/config.generated';
import type { BaseLayoutNode, LayoutNode } from 'src/utils/layout/LayoutNode';

export const PDFView2 = () => {
  const nodes = useNodes();
  const pageNavigationConfig = usePageNavigationConfig();
  const { data: pdfSettings, isFetching: pdfFormatIsLoading } = usePdfFormatQuery(true);
  const pdfLayoutName = useLayoutSettings().pages.pdfLayoutName;
  const enableOrgLogo = Boolean(useApplicationMetadata().logoOptions);
  const appOwner = useAppOwner();
  const appName = useAppName();
  const { langAsString } = useLanguage();
  const pagesToRender = pdfLayoutName ? [pdfLayoutName] : pageNavigationConfig.order;
  const isPayment = useIsPayment();

  if (pdfFormatIsLoading) {
    return null;
  }

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
      <InstanceInformation
        type={'InstanceInformation'}
        id={'__pdf__instance-information'}
        elements={{
          dateSent: true,
          sender: true,
          receiver: true,
          referenceNumber: true,
        }}
        pageBreak={{
          breakAfter: 'always',
        }}
        textResourceBindings={undefined}
      />

      {pagesToRender
        ?.filter((pageKey) => (!pdfLayoutName ? pageKey : pageKey === pdfLayoutName))
        .filter((pageKey) => !pageNavigationConfig.isHiddenPage(pageKey))
        .filter((pageKey) => !pdfSettings?.excludedPages.includes(pageKey))
        .map((layoutPageKey) => {
          const layoutPage = nodes.findLayout(layoutPageKey);

          const allComponents = layoutPage
            ?.children()
            .filter((node) => !pdfSettings?.excludedComponents.includes(node.item.id))
            .filter((node) => node.def.shouldRenderInAutomaticPDF(node as any))
            .map((node) => {
              if (node.item.type === 'Summary2' && node.item.target?.taskId) {
                return (
                  <SummaryComponent2
                    key={node.item.id}
                    summaryNode={node as BaseLayoutNode<CompSummary2Internal, 'Summary2'>}
                  />
                );
              }

              if (node.def.renderSummary2) {
                return (
                  <ComponentSummary
                    key={node.item.id}
                    componentNode={node}
                  />
                );
              }
              return (
                <SummaryComponent
                  key={node.item.id}
                  summaryNode={node as LayoutNode<'Summary'>}
                  overrides={{
                    display: { hideChangeButton: true, hideValidationMessages: true },
                  }}
                />
              );
            });
          return (
            <div
              key={layoutPageKey}
              className={classes.page}
            >
              {allComponents}
            </div>
          );
        })}
      <ReadyForPrint />
    </div>
  );
};
