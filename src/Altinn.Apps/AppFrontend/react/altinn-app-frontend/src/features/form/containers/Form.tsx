import Grid from '@material-ui/core/Grid';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { IRuntimeState } from '../../../types';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { Group } from './Group';
import { renderGenericComponent } from '../../../utils/layout';

export function Form() {
  const [filteredLayout, setFilteredLayout] = React.useState<any[]>([]);

  const layout: ILayout = useSelector((state: IRuntimeState) => state.formLayout.layout);
  const hiddenComponents: string[] = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.hiddenFields);

  React.useEffect(() => {
    let componentsToRender: any[] = layout;

    if (layout && hiddenComponents) {
      componentsToRender = layout.filter((component) => !hiddenComponents.includes(component.id));
    }
    setFilteredLayout(componentsToRender);
  }, [layout, hiddenComponents]);

  function RenderGenericComponent(component: ILayoutComponent) {
    return renderGenericComponent(component);
  }

  function renderLayoutComponent(layoutComponent: ILayoutComponent | ILayoutGroup) {
    if (layoutComponent.type && layoutComponent.type.toLowerCase() === 'group') {
      const groupComponents = (layoutComponent as ILayoutGroup).children.map((child) => {
        const result = layout.find((c) => c.id === child) as ILayoutComponent;
        return JSON.parse(JSON.stringify(result));
      });
      return (
        <Group
          id={layoutComponent.id}
          components={groupComponents}
          repeating={(layoutComponent as ILayoutGroup).repeating}
          index={(layoutComponent as ILayoutGroup).index}
          dataModelBinding={(layoutComponent as ILayoutGroup).dataModelBindings.group}
          showAdd={(layoutComponent as ILayoutGroup).showAdd}
        />
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
