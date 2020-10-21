/* eslint-disable no-undef */
import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { IRuntimeState } from '../../../types';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { GroupContainer } from './GroupContainer';
import { renderGenericComponent } from '../../../utils/layout';

export function Form() {
  const [filteredLayout, setFilteredLayout] = React.useState<any[]>([]);
  const [currentLayout, setCurrentLayout] = React.useState<string>();

  const currentView = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);
  const layout: ILayout =
    useSelector((state: IRuntimeState) => state.formLayout.layouts[state.formLayout.uiConfig.currentView]);
  const hiddenComponents: string[] = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.hiddenFields);

  React.useEffect(() => {
    setCurrentLayout(currentView);
  }, [currentView]);

  React.useEffect(() => {
    let componentsToRender: any[] = layout;
    let renderedInGroup: string[] = [];
    if (layout) {
      const groupComponents = layout.filter((component) => component.type.toLowerCase() === 'group');
      groupComponents.forEach((component: ILayoutGroup) => {
        renderedInGroup = renderedInGroup.concat(component.children);
      });
    }

    if (layout && hiddenComponents) {
      componentsToRender = layout.filter((component) => {
        return !hiddenComponents.includes(component.id) && !renderedInGroup.includes(component.id);
      });
    }
    setFilteredLayout(componentsToRender);
  }, [layout, hiddenComponents]);

  function RenderGenericComponent(component: ILayoutComponent) {
    return renderGenericComponent(component);
  }

  function RenderLayoutGroup(layoutGroup: ILayoutGroup): JSX.Element {
    const groupComponents = layoutGroup.children.map((child) => {
      return layout.find((c) => c.id === child) as ILayoutComponent;
    });
    const repeating = layoutGroup.maxCount > 1;
    if (!repeating) {
      // If not repeating, treat as regular components
      return (
        <>
          {groupComponents.map(renderLayoutComponent)}
        </>
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

  function renderLayoutComponent(layoutComponent: ILayoutComponent | ILayoutGroup) {
    if (layoutComponent.type && layoutComponent.type.toLowerCase() === 'group') {
      return RenderLayoutGroup(layoutComponent as ILayoutGroup);
    }

    const component: ILayoutComponent = layout.find((c) => c.id === layoutComponent.id) as ILayoutComponent;
    return (
      <RenderGenericComponent key={layoutComponent.id} {...component} />
    );
  }

  return (
    <Grid container={true}>
      {currentView === currentLayout && filteredLayout && filteredLayout.map(renderLayoutComponent)}
    </Grid>
  );
}

export default Form;
