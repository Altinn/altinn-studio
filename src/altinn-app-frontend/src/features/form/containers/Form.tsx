import React from 'react';

import Grid from '@material-ui/core/Grid';

import { useAppSelector } from 'src/common/hooks';
import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import MessageBanner from 'src/features/form/components/MessageBanner';
import { DisplayGroupContainer } from 'src/features/form/containers/DisplayGroupContainer';
import { GroupContainer } from 'src/features/form/containers/GroupContainer';
import { PanelGroupContainer } from 'src/features/form/containers/PanelGroupContainer';
import { hasRequiredFields } from 'src/utils/formLayout';
import { renderGenericComponent } from 'src/utils/layout';
import { missingFieldsInLayoutValidations } from 'src/utils/validation';
import type {
  ILayout,
  ILayoutComponent,
  ILayoutGroup,
} from 'src/features/form/layout';

export function renderLayoutComponent(
  layoutComponent: ILayoutComponent | ILayoutGroup,
  layout: ILayout,
) {
  switch (layoutComponent.type) {
    case 'Group': {
      return RenderLayoutGroup(layoutComponent, layout);
    }
    case 'Summary': {
      return (
        <SummaryComponent
          key={layoutComponent.id}
          {...layoutComponent}
        />
      );
    }
    default: {
      return (
        <RenderGenericComponent
          key={layoutComponent.id}
          {...layoutComponent}
        />
      );
    }
  }
}

function RenderGenericComponent(component: ILayoutComponent, layout: ILayout) {
  return renderGenericComponent(component, layout);
}

function RenderLayoutGroup(
  layoutGroup: ILayoutGroup,
  layout: ILayout,
): JSX.Element {
  const groupComponents = layoutGroup.children.map((child) => {
    let childId = child;
    if (layoutGroup.edit?.multiPage) {
      childId = child.split(':')[1] || child;
    }
    return layout.find((c) => c.id === childId) as ILayoutComponent;
  });

  const repeating = layoutGroup.maxCount > 1;
  if (repeating) {
    return (
      <GroupContainer
        container={layoutGroup}
        id={layoutGroup.id}
        key={layoutGroup.id}
        components={groupComponents}
      />
    );
  }

  const panel = layoutGroup.panel;
  if (panel) {
    return (
      <PanelGroupContainer
        components={groupComponents}
        container={layoutGroup}
        key={layoutGroup.id}
      />
    );
  }

  //treat as regular components
  return (
    <DisplayGroupContainer
      key={layoutGroup.id}
      container={layoutGroup}
      components={groupComponents}
      renderLayoutComponent={renderLayoutComponent}
    />
  );
}

export function Form() {
  const [filteredLayout, setFilteredLayout] = React.useState<any[]>([]);
  const [currentLayout, setCurrentLayout] = React.useState<string>();
  const [requiredFieldsMissing, setRequiredFieldsMissing] =
    React.useState(false);

  const currentView = useAppSelector(
    (state) => state.formLayout.uiConfig.currentView,
  );
  const layout = useAppSelector(
    (state) => state.formLayout.layouts[state.formLayout.uiConfig.currentView],
  );
  const language = useAppSelector((state) => state.language.language);
  const validations = useAppSelector(
    (state) => state.formValidations.validations,
  );

  React.useEffect(() => {
    setCurrentLayout(currentView);
  }, [currentView]);

  React.useEffect(() => {
    if (validations && validations[currentView]) {
      const areRequiredFieldsMissing = missingFieldsInLayoutValidations(
        validations[currentView],
        language,
      );
      setRequiredFieldsMissing(areRequiredFieldsMissing);
    }
  }, [currentView, language, validations]);

  React.useEffect(() => {
    let renderedInGroup: string[] = [];
    if (layout) {
      const groupComponents = layout.filter(
        (component) => component.type === 'Group',
      );
      groupComponents.forEach((component: ILayoutGroup) => {
        let childList = component.children;
        if (component.edit?.multiPage) {
          childList = component.children.map(
            (childId) => childId.split(':')[1] || childId,
          );
        }
        renderedInGroup = renderedInGroup.concat(childList);
      });
      const componentsToRender = layout.filter(
        (component) => !renderedInGroup.includes(component.id),
      );
      setFilteredLayout(componentsToRender);
    }
  }, [layout]);

  return (
    <div>
      {hasRequiredFields(layout) && (
        <MessageBanner
          language={language}
          error={requiredFieldsMissing}
          messageKey={'form_filler.required_description'}
        />
      )}
      <Grid
        container={true}
        spacing={3}
        alignItems='flex-start'
      >
        {currentView === currentLayout &&
          filteredLayout &&
          filteredLayout.map((component) => {
            return renderLayoutComponent(component, layout);
          })}
      </Grid>
    </div>
  );
}

export default Form;
