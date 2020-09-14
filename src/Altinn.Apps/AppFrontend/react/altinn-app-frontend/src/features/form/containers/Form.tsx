import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { IRepeatingGroups, ITextResource } from 'src/types';
import { IRuntimeState } from '../../../types';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { GroupContainer } from './GroupContainer';
import { renderGenericComponent } from '../../../utils/layout';

export function Form() {
  const [filteredLayout, setFilteredLayout] = React.useState<any[]>([]);

  const layout: ILayout = useSelector((state: IRuntimeState) => state.formLayout.layout);
  const repeatingGroups: IRepeatingGroups =
    useSelector((state: IRuntimeState) => state.formLayout.uiConfig.repeatingGroups);
  const hiddenComponents: string[] = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.hiddenFields);
  const textResources: ITextResource[] = useSelector((state: IRuntimeState) => state.textResources.resources);

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
  }, [layout, hiddenComponents, repeatingGroups]);

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
        textResources={textResources}
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
      {filteredLayout && filteredLayout.map(renderLayoutComponent)}
    </Grid>
  );
}

export default Form;
