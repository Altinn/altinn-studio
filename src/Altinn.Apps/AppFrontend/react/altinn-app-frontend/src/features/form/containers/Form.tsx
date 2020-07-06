import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { IRuntimeState } from '../../../types';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { Group } from './Group';
import { renderGenericComponent } from '../../../utils/layout';
import { IRepeatingGroups } from '../../../types/global';

export function Form() {
  const [filteredLayout, setFilteredLayout] = React.useState<any[]>([]);

  const layout: ILayout = useSelector((state: IRuntimeState) => state.formLayout.layout);
  const repeatingGroups: IRepeatingGroups =
    useSelector((state: IRuntimeState) => state.formLayout.uiConfig.repeatingGroups);
  const hiddenComponents: string[] = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.hiddenFields);

  React.useEffect(() => {
    let componentsToRender: any[] = layout;
    let renderedInGroup: string[] = [];
    if (layout) {
      const groupComponents = layout.filter((component) => component.type === 'group');
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

  const getRepeatingGroupCount = (id: string) => {
    if (repeatingGroups && repeatingGroups[id] && repeatingGroups[id].count) {
      return repeatingGroups[id].count;
    }
    return 0;
  };

  function renderLayoutComponent(layoutComponent: ILayoutComponent | ILayoutGroup) {
    if (layoutComponent.type && layoutComponent.type.toLowerCase() === 'group') {
      const groupComponents = (layoutComponent as ILayoutGroup).children.map((child) => {
        const result = layout.find((c) => c.id === child) as ILayoutComponent;
        return JSON.parse(JSON.stringify(result));
      });
      const repeating = (layoutComponent as ILayoutGroup).maxCount > 1;
      const repeatingGroupCount = getRepeatingGroupCount(layoutComponent.id);
      return (
        <>
          {Array.from(Array(repeatingGroupCount + 1).keys()).map((index) => {
            return (
              <Group
                id={layoutComponent.id}
                key={`${layoutComponent.id}-${index}`}
                components={groupComponents}
                repeating={repeating}
                index={index}
                dataModelBinding={(layoutComponent as ILayoutGroup).dataModelBindings?.group}
                showAdd={
                  repeating
                  && repeatingGroupCount === index
                  && repeatingGroupCount < (layoutComponent as ILayoutGroup).maxCount - 1
                }
                showDelete={repeatingGroupCount > 0}
                showSeparator={repeatingGroupCount > index}
              />
            );
          })}
        </>
      );
    }

    const component: ILayoutComponent = layout.find((c) => c.id === layoutComponent.id) as ILayoutComponent;
    return (
      <RenderGenericComponent {...component} />
    );
  }

  return (
    <Grid container={true}>
      {filteredLayout && filteredLayout.map(renderLayoutComponent)}
    </Grid>
  );
}

export default Form;
