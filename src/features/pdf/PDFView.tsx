import React from 'react';

import { Heading } from '@digdir/design-system-react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { PDF_LAYOUT_NAME } from 'src/features/pdf/data/pdfSlice';
import classes from 'src/features/pdf/PDFView.module.css';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { GenericComponent } from 'src/layout/GenericComponent';
import { DisplayGroupContainer } from 'src/layout/Group/DisplayGroupContainer';
import { ComponentType } from 'src/layout/LayoutComponent';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { useExprContext } from 'src/utils/layout/ExprContext';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface PDFViewProps {
  appName: string;
  appOwner?: string;
}

const PDFComponent = ({ node }: { node: LayoutNode }) => {
  if (node.isType('Summary') || node.item.renderAsSummary) {
    return (
      <SummaryComponent
        summaryNode={node as LayoutNodeFromType<'Summary'>}
        overrides={{
          grid: { xs: 12 },
          display: { hideChangeButton: true, hideValidationMessages: true },
        }}
      />
    );
  } else if (node.isNonRepGroup()) {
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
  } else if (node.isComponentType(ComponentType.Presentation)) {
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
    <div
      id='pdfView'
      className={classes['pdf-wrapper']}
    >
      {appOwner && <span role='doc-subtitle'>{appOwner}</span>}
      <Heading
        spacing={true}
        level={1}
        size='large'
      >
        {appName}
      </Heading>
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
