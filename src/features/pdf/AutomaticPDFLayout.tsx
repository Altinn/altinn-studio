import React from 'react';

import type { IPdfFormat } from '.';

import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import css from 'src/features/pdf/PDFView.module.css';
import { GenericComponent } from 'src/layout/GenericComponent';
import type { ILayoutCompInstanceInformation } from 'src/layout/InstanceInformation/types';
import type { RenderableGenericComponent } from 'src/layout/layout';
import type { LayoutNode, LayoutRootNodeCollection } from 'src/utils/layout/hierarchy';

const summaryComponents = new Set([
  'AddressComponent',
  'AttachmentList',
  'Checkboxes',
  'Custom',
  'DatePicker',
  'Dropdown',
  'FileUpload',
  'FileUploadWithTag',
  'Group',
  'Input',
  'List',
  'Map',
  'MultipleSelect',
  'RadioButtons',
  'TextArea',
]);

const presentationComponents = new Set(['Header', 'Paragraph', 'Image', 'Panel']);

const renderComponents = new Set([...summaryComponents, ...presentationComponents]);

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
  if (summaryComponents.has(node.item.type)) {
    return (
      <SummaryComponent
        id={`__pdf__${node.item.id}`}
        componentRef={node.item.id}
        pageRef={pageRef}
        display={{ hideChangeButton: true, hideValidationMessages: true }}
        excludedChildren={excludedChildren}
        grid={{ xs: 12 }}
      />
    );
  }
  if (presentationComponents.has(node.item.type)) {
    return (
      <GenericComponent
        {...(node.item as RenderableGenericComponent)}
        grid={{ xs: 12 }}
      />
    );
  }
  return null;
};

const AutomaticPDFLayout = ({ layouts, pdfFormat, pageOrder, hidden }: IAutomaticPDFLayout) => {
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
      breakAfter: true,
    },
  };

  return (
    <>
      <div className={css['component-container']}>
        <GenericComponent {...instanceInformationProps} />
      </div>
      {pdfLayouts.map(([pageRef, layout]) => {
        return layout.children().map((node) => {
          if (excludedComponents.has(node.item.id) || !renderComponents.has(node.item.type)) {
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

export default AutomaticPDFLayout;
