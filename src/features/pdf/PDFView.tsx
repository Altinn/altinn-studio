import React from 'react';

import { Heading } from '@digdir/design-system-react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import classes from 'src/features/pdf/PDFView.module.css';
import { usePdfPage } from 'src/hooks/usePdfPage';
import { CompCategory } from 'src/layout/common';
import { GenericComponent } from 'src/layout/GenericComponent';
import { GroupComponent } from 'src/layout/Group/GroupComponent';
import { LargeLikertSummaryContainer } from 'src/layout/Likert/Summary/LargeLikertSummaryContainer';
import { LargeGroupSummaryContainer } from 'src/layout/RepeatingGroup/Summary/LargeGroupSummaryContainer';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const PDFComponent = ({ node }: { node: LayoutNode }) => {
  const commonProps = <T extends LayoutNode>(node: T) => ({
    groupNode: node,
    renderLayoutNode: (child: LayoutNode) => (
      <PDFComponent
        key={child.item.id}
        node={child}
      />
    ),
  });

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
  } else if (node.isType('Group')) {
    return <GroupComponent {...commonProps(node)} />;
  } else if (node.isType('RepeatingGroup')) {
    return <LargeGroupSummaryContainer {...commonProps(node)} />;
  } else if (node.isType('Likert')) {
    return <LargeLikertSummaryContainer {...commonProps(node)} />;
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
