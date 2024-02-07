import React from 'react';

import { Heading } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
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
