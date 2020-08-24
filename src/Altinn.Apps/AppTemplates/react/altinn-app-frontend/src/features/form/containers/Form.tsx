import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { IRepeatingGroups } from 'src/types';
import { IRuntimeState } from '../../../types';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { Group } from './Group';
import { renderGenericComponent } from '../../../utils/layout';

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

  function RenderLayoutGroup(layoutGroup: ILayoutGroup): JSX.Element[] {
    const groupComponents = layoutGroup.children.map((child) => {
      return layout.find((c) => c.id === child) as ILayoutComponent;
    });
    const repeating = layoutGroup.maxCount > 1;
    const repeatingGroupCount = getRepeatingGroupCount(layoutGroup.id);
    const renderGroup: JSX.Element[] = [];

    for (let i = 0; i <= repeatingGroupCount; i++) {
      const childComponents = groupComponents.map((component: ILayoutComponent) => {
        const componentDeepCopy: ILayoutComponent = JSON.parse(JSON.stringify(component));
        const dataModelBindings = { ...componentDeepCopy.dataModelBindings };
        let id = componentDeepCopy.id;

        if (repeating) {
          const groupDataModelBinding = layoutGroup.dataModelBindings.group;
          Object.keys(dataModelBindings).forEach((key) => {
            // eslint-disable-next-line no-param-reassign
            dataModelBindings[key] = dataModelBindings[key].replace(groupDataModelBinding, `${groupDataModelBinding}[${i}]`);
          });
          id = `${componentDeepCopy.id}-${i}`;
        }

        return {
          ...componentDeepCopy,
          dataModelBindings,
          id,
          baseComponentId: componentDeepCopy.id,
        };
      });
      const groupElement = (
        <Group
          id={layoutGroup.id}
          key={`${layoutGroup.id}-${i}`}
          components={childComponents}
          repeating={repeating}
          index={i}
          showAdd={
            repeating
            && repeatingGroupCount === i
            && repeatingGroupCount < layoutGroup.maxCount - 1
          }
          showDelete={repeatingGroupCount > 0}
          showSeparator={repeatingGroupCount > i}
        />
      );
      renderGroup.push(groupElement);
    }
    return renderGroup;
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
