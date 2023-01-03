import React from 'react';

import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import { DisplayGroupContainer } from 'src/features/form/containers/DisplayGroupContainer';
import { mapGroupComponents } from 'src/features/form/containers/formUtils';
import css from 'src/features/pdf/PDFView.module.css';
import { GenericComponent } from 'src/layout/GenericComponent';
import { topLevelComponents } from 'src/utils/formLayout';
import type { ILayout, ILayoutComponentOrGroup } from 'src/layout/layout';

interface ICustomPDFLayout {
  layout: ILayout;
}

const presentationComponents = new Set(['Header', 'Paragraph', 'Image', 'Panel', 'InstanceInformation']);

const CustomPDFSummaryComponent = ({ component, layout }: { component: ILayoutComponentOrGroup; layout: ILayout }) => {
  if (component.type === 'Group') {
    return (
      <DisplayGroupContainer
        container={component}
        components={mapGroupComponents(component, layout)}
        renderLayoutComponent={(child) => (
          <CustomPDFSummaryComponent
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
  } else if (presentationComponents.has(component.type)) {
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

const CustomPDFLayout = ({ layout }: ICustomPDFLayout) => (
  <>
    {topLevelComponents(layout).map((component) => (
      <div
        key={component.id}
        className={css['component-container']}
      >
        <CustomPDFSummaryComponent
          component={component}
          layout={layout}
        />
      </div>
    ))}
  </>
);
export default CustomPDFLayout;
