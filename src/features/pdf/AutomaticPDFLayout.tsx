import React from 'react';

import type { IPdfFormat } from '.';

import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import css from 'src/features/pdf/PDFView.module.css';
import { ComponentType } from 'src/layout';
import { GenericComponent } from 'src/layout/GenericComponent';
import { getLayoutComponentObject } from 'src/layout/LayoutComponent';
import type { ILayoutCompInstanceInformation } from 'src/layout/InstanceInformation/types';
import type { ComponentExceptGroupAndSummary, RenderableGenericComponent } from 'src/layout/layout';
import type { LayoutNode, LayoutRootNodeCollection } from 'src/utils/layout/hierarchy';

interface IAutomaticPDFLayout {
  layouts: LayoutRootNodeCollection<'resolved'>;
  pdfFormat: IPdfFormat | null;
  pageOrder: string[];
  hidden: string[];
}

const AutomaticPDFSummaryComponent = ({
  node,
  pageRef,
  excludedChildren,
}: {
  node: LayoutNode<'resolved'>;
  pageRef: string;
  excludedChildren: string[];
}) => {
  const layoutComponent = getLayoutComponentObject(node.item.type as ComponentExceptGroupAndSummary);

  if (node.item.type === 'Group' || layoutComponent?.getComponentType() === ComponentType.Form) {
    return (
      <SummaryComponent
        id={`__pdf__${node.item.id}`}
        componentRef={node.item.id}
        pageRef={pageRef}
        display={{ hideChangeButton: true, hideValidationMessages: true }}
        excludedChildren={excludedChildren}
        pageBreak={node.item.pageBreak}
        grid={{ xs: 12 }}
      />
    );
  }
  if (layoutComponent?.getComponentType() === ComponentType.Presentation) {
    return (
      <GenericComponent
        {...(node.item as RenderableGenericComponent)}
        grid={{ xs: 12 }}
      />
    );
  }
  return null;
};

export const AutomaticPDFLayout = ({ layouts, pdfFormat, pageOrder, hidden }: IAutomaticPDFLayout) => {
  const excludedPages = new Set(pdfFormat?.excludedPages);
  const excludedComponents = new Set(pdfFormat?.excludedComponents);
  const hiddenPages = new Set(hidden);

  const pdfLayouts = Object.entries(layouts.all())
    .filter(([pageRef]) => !excludedPages.has(pageRef))
    .filter(([pageRef]) => !hiddenPages.has(pageRef))
    .filter(([pageRef]) => pageOrder.includes(pageRef))
    .sort(([pA], [pB]) => pageOrder.indexOf(pA) - pageOrder.indexOf(pB));

  const instanceInformationProps: ILayoutCompInstanceInformation = {
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

  return (
    <>
      <div className={css['component-container']}>
        <GenericComponent {...instanceInformationProps} />
      </div>
      {pdfLayouts.map(([pageRef, layout]) => {
        return layout.children().map((node) => {
          if (excludedComponents.has(node.item.id)) {
            return null;
          }

          return (
            <div
              key={node.item.id}
              className={css['component-container']}
            >
              <AutomaticPDFSummaryComponent
                node={node}
                pageRef={pageRef}
                excludedChildren={pdfFormat?.excludedComponents || []}
              />
            </div>
          );
        });
      })}
    </>
  );
};
