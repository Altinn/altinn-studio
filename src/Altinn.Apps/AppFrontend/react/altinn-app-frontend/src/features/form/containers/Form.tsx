/* eslint-disable no-undef */
import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import { IRuntimeState } from '../../../types';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { GroupContainer } from './GroupContainer';
import { renderGenericComponent } from '../../../utils/layout';
import { DisplayGroupContainer } from './DisplayGroupContainer';
import { DisplayAccordionContainer } from './DisplayAccordionContainer';

export function renderLayoutComponent(layoutComponent: ILayoutComponent | ILayoutGroup, layout: ILayout) {
  switch (layoutComponent.type) {
    case 'group':
    case 'Group': {
      return RenderLayoutGroup(layoutComponent as ILayoutGroup, layout);
    }
    case 'Summary': {
      return (
        <SummaryComponent key={layoutComponent.id} {...(layoutComponent as ILayoutComponent)} />
      );
    }
    default: {
      return (
        <RenderGenericComponent key={layoutComponent.id} {...(layoutComponent as ILayoutComponent)} />
      );
    }
  }
}

function RenderGenericComponent(component: ILayoutComponent, layout: ILayout) {
  return renderGenericComponent(component, layout);
}

function RenderLayoutGroup(layoutGroup: ILayoutGroup, layout: ILayout): JSX.Element {
  const groupComponents = layoutGroup.children.map((child) => {
    let childId = child;
    if (layoutGroup.edit?.multiPage) {
      childId = child.split(':')[1] || child;
    }
    return layout.find((c) => c.id === childId) as ILayoutComponent;
  });
  const repeating = layoutGroup.maxCount > 1;
  if (!repeating) {
    // If not repeating, treat as regular components
    if (layoutGroup.accordion) {
      return (
        <DisplayAccordionContainer
          container={layoutGroup}
          components={groupComponents}
          renderLayoutComponent={renderLayoutComponent}
          iconLabel={layoutGroup.iconLabel}
        />
      );
    }
    return (
      <DisplayGroupContainer
        container={layoutGroup}
        components={groupComponents}
        renderLayoutComponent={renderLayoutComponent}
      />
    );
  }

  return (
    <GroupContainer
      container={layoutGroup}
      id={layoutGroup.id}
      key={layoutGroup.id}
      components={groupComponents}
    />
  );
}

export function Form() {
  const [filteredLayout, setFilteredLayout] = React.useState<any[]>([]);
  const [currentLayout, setCurrentLayout] = React.useState<string>();

  const currentView = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);
  const layout: ILayout =
    useSelector((state: IRuntimeState) => state.formLayout.layouts[state.formLayout.uiConfig.currentView]);

  React.useEffect(() => {
    setCurrentLayout(currentView);
  }, [currentView]);

  React.useEffect(() => {
    let componentsToRender: any[] = layout;
    let renderedInGroup: string[] = [];
    if (layout) {
      const groupComponents = layout.filter((component) => component.type.toLowerCase() === 'group');
      groupComponents.forEach((component: ILayoutGroup) => {
        let childList = component.children;
        if (component.edit?.multiPage) {
          childList = component.children.map((childId) => childId.split(':')[1] || childId);
        }
        renderedInGroup = renderedInGroup.concat(childList);
      });
    }

    if (layout) {
      componentsToRender = layout.filter((component) => {
        return !renderedInGroup.includes(component.id);
      });
    }
    setFilteredLayout(componentsToRender);
  }, [layout]);

  return (
    <Grid
      container={true}
      spacing={3}
      alignItems='flex-start'
    >
      {currentView === currentLayout && filteredLayout && filteredLayout.map((component) => {
        return renderLayoutComponent(component, layout);
      })}
    </Grid>
  );
}

export default Form;
