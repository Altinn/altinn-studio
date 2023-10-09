import React from 'react';

import { Heading } from '@digdir/design-system-react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import classes from 'src/features/pdf/PDFView.module.css';
import { usePdfPage } from 'src/hooks/usePdfPage';
import { CompCategory } from 'src/layout/common';
import { GenericComponent } from 'src/layout/GenericComponent';
import { DisplayGroupContainer } from 'src/layout/Group/DisplayGroupContainer';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface PDFViewProps {
  appName: string;
  appOwner?: string;
}

const PDFComponent = ({ node }: { node: LayoutNode }) => {
  if (node.isType('Summary') || ('renderAsSummary' in node.item && node.item.renderAsSummary)) {
    return (
      <SummaryComponent
        summaryNode={node as LayoutNode<'Summary'>}
        overrides={{
          grid: { xs: 12 },
          display: { hideChangeButton: true, hideValidationMessages: true },
        }}
      />
    );
  } else if (node.isType('Group') && node.isNonRepGroup()) {
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

export const PDFView = ({ appName, appOwner }: PDFViewProps) => {
  const pdfPage = usePdfPage();

  if (!pdfPage) {
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
