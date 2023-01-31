import React from 'react';

import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import { DisplayGroupContainer } from 'src/features/form/containers/DisplayGroupContainer';
import { mapGroupComponents } from 'src/features/form/containers/formUtils';
import css from 'src/features/pdf/PDFView.module.css';
import { ComponentType } from 'src/layout';
import { GenericComponent } from 'src/layout/GenericComponent';
import { getLayoutComponentObject } from 'src/layout/LayoutComponent';
import { topLevelComponents } from 'src/utils/formLayout';
import type { ComponentExceptGroupAndSummary, ILayout, ILayoutComponentOrGroup } from 'src/layout/layout';

interface ICustomPDFLayout {
  layout: ILayout;
}

const CustomPDFSummaryComponent = ({ component, layout }: { component: ILayoutComponentOrGroup; layout: ILayout }) => {
  const layoutComponent = getLayoutComponentObject(component.type as ComponentExceptGroupAndSummary);

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
