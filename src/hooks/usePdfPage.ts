import { useMemo } from 'react';

import { usePdfFormatQuery } from 'src/hooks/queries/usePdfFormatQuery';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLayoutComponentObject } from 'src/layout';
import { useExprContext } from 'src/utils/layout/ExprContext';
import { dataSourcesFromState } from 'src/utils/layout/hierarchy';
import { generateHierarchy } from 'src/utils/layout/HierarchyGenerator';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { CompInstanceInformationExternal } from 'src/layout/InstanceInformation/config.generated';
import type { HierarchyDataSources, ILayout } from 'src/layout/layout';
import type { CompSummaryExternal } from 'src/layout/Summary/config.generated';
import type { IRepeatingGroups, ITracks } from 'src/types';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

const PDF_LAYOUT_NAME = '__pdf__';

export const usePdfPage = (): LayoutPage | null => {
  const layoutPages = useExprContext();
  const dataSources = useAppSelector(dataSourcesFromState);
  const tracks = useAppSelector((state) => state.formLayout.uiConfig.tracks);
  const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
  const pdfLayoutName = useAppSelector((state) => state.formLayout.uiConfig.pdfLayoutName);

  const customPdfPage = pdfLayoutName ? layoutPages?.[pdfLayoutName] : undefined;
  const method = customPdfPage ? 'custom' : 'auto';

  const { data: pdfFormat, isLoading: pdfFormatIsLoading } = usePdfFormatQuery(method === 'auto');

  const readyForPrint = !!layoutPages && !pdfFormatIsLoading;

  const automaticPdfPage = useMemo(() => {
    if (readyForPrint && method === 'auto') {
      return generateAutomaticPage(pdfFormat!, tracks!, layoutPages!, dataSources, repeatingGroups!);
    }
    return null;
  }, [readyForPrint, method, pdfFormat, tracks, layoutPages, dataSources, repeatingGroups]);

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
  tracks: ITracks,
  layoutPages: LayoutPages,
  dataSources: HierarchyDataSources,
  repeatingGroups: IRepeatingGroups,
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
  const hiddenPages = new Set(tracks.hidden);
  const pageOrder = tracks.order;

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
  const pdfPage = generateHierarchy(automaticPdfLayout, repeatingGroups, dataSources, getLayoutComponentObject);
  pdfPage.top = { myKey: PDF_LAYOUT_NAME, collection: layoutPages };
  return pdfPage;
}
