import { useMemo } from 'react';

import { usePageNavigationConfig } from 'src/features/form/layout/PageNavigationContext';
import { useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { usePdfFormatQuery } from 'src/features/pdf/usePdfFormatQuery';
import { getLayoutComponentObject } from 'src/layout';
import { useExpressionDataSources } from 'src/utils/layout/hierarchy';
import { generateHierarchy } from 'src/utils/layout/HierarchyGenerator';
import { useHiddenComponents, useNodes } from 'src/utils/layout/NodesContext';
import type { PageNavigationConfig } from 'src/features/expressions/ExprContext';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { CompInstanceInformationExternal } from 'src/layout/InstanceInformation/config.generated';
import type { HierarchyDataSources, ILayout } from 'src/layout/layout';
import type { CompSummaryExternal } from 'src/layout/Summary/config.generated';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

const PDF_LAYOUT_NAME = '__pdf__';

export const usePdfPage = (): LayoutPage | null => {
  const layoutPages = useNodes();
  const pageNavigationConfig = usePageNavigationConfig();
  const hidden = useHiddenComponents();
  const dataSources = useExpressionDataSources(hidden);
  const pdfLayoutName = useLayoutSettings().pages.pdfLayoutName;

  const customPdfPage = pdfLayoutName ? layoutPages?.[pdfLayoutName] : undefined;
  const method = customPdfPage ? 'custom' : 'auto';

  const { data: pdfFormat, isLoading: pdfFormatIsLoading } = usePdfFormatQuery(method === 'auto');

  const readyForPrint = !!layoutPages && !pdfFormatIsLoading;

  const automaticPdfPage = useMemo(() => {
    if (readyForPrint && method === 'auto') {
      return generateAutomaticPage(pdfFormat!, pageNavigationConfig!, layoutPages!, dataSources);
    }
    return null;
  }, [readyForPrint, method, pdfFormat, pageNavigationConfig, layoutPages, dataSources]);

  if (!readyForPrint) {
    return null;
  }

  if (method === 'custom') {
    return customPdfPage!;
  } else {
    return automaticPdfPage!;
  }
};

function generateAutomaticPage(
  pdfFormat: IPdfFormat,
  pageNavigationConfig: PageNavigationConfig,
  layoutPages: LayoutPages,
  dataSources: HierarchyDataSources,
): LayoutPage {
  const automaticPdfLayout: ILayout = [];

  // Add instance information
  const instanceInformation: CompInstanceInformationExternal = {
    id: '__pdf__instance-information',
    type: 'InstanceInformation',
    elements: {
      dateSent: true,
      sender: true,
      receiver: true,
      referenceNumber: true,
    },
    pageBreak: {
      breakAfter: 'always',
    },
  };
  automaticPdfLayout.push(instanceInformation);

  const excludedPages = new Set(pdfFormat?.excludedPages);
  const excludedComponents = new Set(pdfFormat?.excludedComponents);
  const hiddenPages = new Set(pageNavigationConfig.hidden);
  const pageOrder = pageNavigationConfig.order;

  // Iterate over all pages, and add all components that should be included in the automatic PDF as summary components
  Object.entries(layoutPages.all())
    .filter(([pageName]) => !excludedPages.has(pageName) && !hiddenPages.has(pageName) && pageOrder?.includes(pageName))
    .sort(([pA], [pB]) => (pageOrder ? pageOrder.indexOf(pA) - pageOrder.indexOf(pB) : 0))
    .flatMap(([_, layoutPage]) => layoutPage.children().filter((node) => !excludedComponents.has(node.item.id)))
    .map((node) => {
      if (node.def.shouldRenderInAutomaticPDF(node as any)) {
        return {
          id: `__pdf__${node.item.id}`,
          type: 'Summary',
          componentRef: node.item.id,
          excludedChildren: pdfFormat?.excludedComponents,
          largeGroup: node.isType('Group') && (node.isNonRepGroup() || node.isNonRepPanelGroup()),
        } as CompSummaryExternal;
      }
      return null;
    })
    .forEach((summaryComponent) => {
      if (summaryComponent !== null) {
        automaticPdfLayout.push(summaryComponent);
      }
    });

  // Generate the hierarchy for the automatic PDF layout
  const pdfPage = generateHierarchy(automaticPdfLayout, dataSources, getLayoutComponentObject);
  pdfPage.top = { myKey: PDF_LAYOUT_NAME, collection: layoutPages };
  return pdfPage;
}
