/* eslint-disable max-len */
import * as React from 'react';
import { Grid } from '@material-ui/core';
import { GroupContainer } from 'src/features/form/containers/GroupContainer';
// eslint-disable-next-line import/no-cycle
import { useSelector } from 'react-redux';
import { IRuntimeState } from 'src/types';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { GenericComponent } from '../../components/GenericComponent';
import { ILayouts, ILayoutComponent, ILayoutGroup, ILayout } from '../../features/form/layout';

export function getLayoutComponentById(id: string, layouts: ILayouts): ILayoutComponent {
  let component: ILayoutComponent;
  Object.keys(layouts).forEach((layoutId) => {
    if (!component) {
      component = layouts[layoutId].find((element) => {
        // Check against provided id, with potential -{index} postfix.
        const match = matchLayoutComponent(id, element.id);
        return match && match.length > 0;
      }) as ILayoutComponent;
    }
  });

  return component;
}

export function getLayoutIdForComponent(id: string, layouts: ILayouts): string {
  let foundLayout: string;
  Object.keys(layouts).forEach((layoutId) => {
    if (!foundLayout) {
      const component = layouts[layoutId].find((element) => {
        // Check against provided id, with potential -{index} postfix.
        const match = matchLayoutComponent(id, element.id);
        return match && match.length > 0;
      }) as ILayoutComponent;
      if (component) {
        foundLayout = layoutId;
      }
    }
  });
  return foundLayout;
}

/*
  Check if provided id matches component id.
  For repeating groups, component id from formLayout is postfixed with -{index}
  when rendering, where index is the component's index (number) in the repeating group list.
  This does not change the component definition in formLayout.
  Therefore, we must match on component id as well as a potential -{index} postfix
  when searching through formLayout for the component definition.
*/
export function matchLayoutComponent(providedId: string, componentId: string) {
  return providedId.match(`${componentId}(-[0-9]*)*$`);
}

export function renderGenericComponent(component: ILayoutComponent, layout: ILayout, index: number = -1) {
  const GetHiddenSelector = makeGetHidden();
  const hidden: boolean = useSelector((state: IRuntimeState) => GetHiddenSelector(state, { id: component.id }));

  if (hidden) {
    return null;
  }

  if (component.type.toLowerCase() === 'group') {
    return renderLayoutGroup(component as unknown as ILayoutGroup, layout, index);
  }
  return (
    <Grid
      item={true}
      xs={12}
      key={`grid-${component.id}`}
    >
      <div key={`form-${component.id}`} className='form-group a-form-group'>
        <GenericComponent
          key={component.id}
          {...component}
        />
      </div>
    </Grid>
  );
}

export function renderLayoutGroup(layoutGroup: ILayoutGroup, layout: ILayout, index?: number) {
  const groupComponents = layoutGroup.children.map((child) => {
    return layout.find((c) => c.id === child) as ILayoutComponent;
  });
  const deepCopyComponents = setupGroupComponents(groupComponents, layoutGroup.dataModelBindings.group, index);
  const repeating = layoutGroup.maxCount > 1;
  if (!repeating) {
    // If not repeating, treat as regular components
    return (
      <>
        {deepCopyComponents.map((component: ILayoutComponent) => { return renderGenericComponent(component, layout); })}
      </>
    );
  }

  return (
    <GroupContainer
      container={layoutGroup}
      id={layoutGroup.id}
      key={layoutGroup.id}
      components={deepCopyComponents}
    />
  );
}

export function setupGroupComponents(components: (ILayoutComponent | ILayoutGroup)[], groupDataModelBinding: string, index: number): (ILayoutGroup | ILayoutComponent)[] {
  const childComponents = components.map((component: ILayoutComponent) => {
    const componentDeepCopy: ILayoutComponent = JSON.parse(JSON.stringify(component));
    const dataModelBindings = { ...componentDeepCopy.dataModelBindings };
    Object.keys(dataModelBindings).forEach((key) => {
      // eslint-disable-next-line no-param-reassign
      const originalGroupBinding = groupDataModelBinding.replace(`[${index}]`, '');
      dataModelBindings[key] = dataModelBindings[key].replace(originalGroupBinding, groupDataModelBinding);
    });
    const deepCopyId = `${componentDeepCopy.id}-${index}`;

    return {
      ...componentDeepCopy,
      dataModelBindings,
      id: deepCopyId,
      baseComponentId: componentDeepCopy.id,
    };
  });
  return childComponents;
}
