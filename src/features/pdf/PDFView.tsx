import React from 'react';

import cn from 'classnames';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import { DisplayGroupContainer } from 'src/features/form/containers/DisplayGroupContainer';
import { mapGroupComponents } from 'src/features/form/containers/formUtils';
import { PDF_LAYOUT_NAME } from 'src/features/pdf/data/pdfSlice';
import css from 'src/features/pdf/PDFView.module.css';
import { ComponentType } from 'src/layout';
import { GenericComponent } from 'src/layout/GenericComponent';
import { getLayoutComponentObject } from 'src/layout/LayoutComponent';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { topLevelComponents } from 'src/utils/formLayout';
import type { ComponentExceptGroupAndSummary, ILayout, ILayoutComponentOrGroup } from 'src/layout/layout';

interface PDFViewProps {
  appName: string;
  appOwner?: string;
}

const PDFComponent = ({ component, layout }: { component: ILayoutComponentOrGroup; layout: ILayout }) => {
  const layoutComponent = getLayoutComponentObject(component.type as ComponentExceptGroupAndSummary);

  if (component.type === 'Group') {
    return (
      <DisplayGroupContainer
        container={component}
        components={mapGroupComponents(component, layout)}
        renderLayoutComponent={(child) => (
          <PDFComponent
            key={child.id}
            component={child}
            layout={layout}
          />
        )}
      />
    );
  } else if (component.type === 'Summary') {
    return (
      <SummaryComponent
        {...component}
        display={{ hideChangeButton: true, hideValidationMessages: true }}
        grid={{ xs: 12 }}
      />
    );
  } else if (layoutComponent?.getComponentType() === ComponentType.Presentation) {
    return (
      <GenericComponent
        {...component}
        grid={{ xs: 12 }}
      />
    );
  } else {
    console.warn(`Type: "${component.type}" is not allowed in PDF.`);
    return null;
  }
};

export const PDFView = ({ appName, appOwner }: PDFViewProps) => {
  const { readyForPrint, method } = useAppSelector((state) => state.pdf);
  const { layouts, uiConfig } = useAppSelector((state) => state.formLayout);

  const pdfLayoutName = method === 'custom' ? uiConfig.pdfLayoutName : method === 'auto' ? PDF_LAYOUT_NAME : undefined;
  const pdfLayout = pdfLayoutName && layouts?.[pdfLayoutName];

  if (!readyForPrint || !pdfLayout) {
    return null;
  }

  return (
    <div className={css['pdf-wrapper']}>
      <h1 className={cn({ [css['title-margin']]: !appOwner })}>{appName}</h1>
      {appOwner && (
        <p
          role='doc-subtitle'
          className={css['title-margin']}
        >
          {appOwner}
        </p>
      )}
      {topLevelComponents(pdfLayout).map((component) => (
        <div
          key={component.id}
          className={css['component-container']}
        >
          <PDFComponent
            component={component}
            layout={pdfLayout}
          />
        </div>
      ))}
      <ReadyForPrint />
    </div>
  );
};
