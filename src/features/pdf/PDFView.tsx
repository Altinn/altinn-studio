import React from 'react';

import cn from 'classnames';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import { DisplayGroupContainer } from 'src/features/form/containers/DisplayGroupContainer';
import { PDF_LAYOUT_NAME } from 'src/features/pdf/data/pdfSlice';
import classes from 'src/features/pdf/PDFView.module.css';
import { ComponentType } from 'src/layout';
import { GenericComponent } from 'src/layout/GenericComponent';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { useExprContext } from 'src/utils/layout/ExprContext';
import type { LayoutNode } from 'src/utils/layout/hierarchy';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

interface PDFViewProps {
  appName: string;
  appOwner?: string;
}

const PDFComponent = ({ node }: { node: LayoutNode }) => {
  if (node.item.type === 'Group') {
    return (
      <DisplayGroupContainer
        groupNode={node}
        renderLayoutNode={(child) => (
          <PDFComponent
            key={child.item.id}
            node={child}
          />
        )}
      />
    );
  } else if (node.item.type === 'Summary') {
    return (
      <SummaryComponent
        summaryNode={node as LayoutNodeFromType<'Summary'>}
        overrides={{
          grid: { xs: 12 },
          display: { hideChangeButton: true, hideValidationMessages: true },
        }}
      />
    );
  } else if (node.getComponent().getComponentType() === ComponentType.Presentation) {
    return (
      <GenericComponent
        node={node}
        overrideItemProps={{
          grid: { xs: 12 },
        }}
      />
    );
  } else {
    console.warn(`Type: "${node.item.type}" is not allowed in PDF.`);
    return null;
  }
};

export const PDFView = ({ appName, appOwner }: PDFViewProps) => {
  const { readyForPrint, method } = useAppSelector((state) => state.pdf);
  const { uiConfig } = useAppSelector((state) => state.formLayout);

  const nodes = useExprContext();
  const pdfLayoutName = method === 'custom' ? uiConfig.pdfLayoutName : method === 'auto' ? PDF_LAYOUT_NAME : undefined;
  const pdfPage = nodes?.findLayout(pdfLayoutName);

  if (!readyForPrint || !pdfPage) {
    return null;
  }

  return (
    <div className={classes['pdf-wrapper']}>
      <h1 className={cn({ [classes['title-margin']]: !appOwner })}>{appName}</h1>
      {appOwner && (
        <p
          role='doc-subtitle'
          className={classes['title-margin']}
        >
          {appOwner}
        </p>
      )}
      {pdfPage.children().map((node) => (
        <div
          key={node.item.id}
          className={classes['component-container']}
        >
          <PDFComponent node={node} />
        </div>
      ))}
      <ReadyForPrint />
    </div>
  );
};
