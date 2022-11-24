import * as React from 'react';

import { GenericComponent } from 'src/components/GenericComponent';
import { GroupContainer } from 'src/features/form/containers/GroupContainer';
import { PanelGroupContainer } from 'src/features/form/containers/PanelGroupContainer';
import { LayoutStyle } from 'src/types';
import { setMappingForRepeatingGroupComponent } from 'src/utils/formLayout';
import type {
  ILayout,
  ILayoutComponent,
  ILayoutComponentOrGroup,
  ILayoutGroup,
  ILayouts,
} from 'src/features/form/layout';
import type { ILayoutSet, ILayoutSets } from 'src/types';

import type { IInstance } from 'altinn-shared/types';

export function getLayoutComponentById(id: string, layouts: ILayouts | null): ILayoutComponentOrGroup | undefined {
  if (!layouts) {
    return undefined;
  }

  let component: ILayoutComponentOrGroup | undefined;
  Object.keys(layouts).forEach((layoutId) => {
    if (!component) {
      component = layouts[layoutId]?.find((element) => {
        // Check against provided id, with potential -{index} postfix.
        const match = matchLayoutComponent(id, element.id);
        return match && match.length > 0;
      });
    }
  });

  return component;
}

export function getLayoutIdForComponent(id: string, layouts: ILayouts): string | undefined {
  let foundLayout: string | undefined;
  Object.keys(layouts).forEach((layoutId) => {
    if (!foundLayout) {
      const component = layouts[layoutId]?.find((element) => {
        // Check against provided id, with potential -{index} postfix.
        const match = matchLayoutComponent(id, element.id);
        return match && match.length > 0;
      });
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
  return providedId.match(`^(${componentId})(-[0-9]+)*$`);
}

interface RenderGenericComponentProps {
  component: ILayoutComponentOrGroup;
  layout?: ILayout | null;
  index?: number;
}

export function renderGenericComponent({ component, layout, index = -1 }: RenderGenericComponentProps) {
  if (component.type === 'Group') {
    return renderLayoutGroup(component, layout || undefined, index);
  }

  return (
    <GenericComponent
      key={component.id}
      {...component}
    />
  );
}

export function renderLayoutGroup(layoutGroup: ILayoutGroup, layout?: ILayout, index?: number) {
  const groupComponents = (layoutGroup.children || [])
    .map((child) => {
      return layout?.find((c) => c.id === child);
    })
    .filter((item) => item !== undefined) as ILayoutComponentOrGroup[];

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

  const deepCopyComponents = setupGroupComponents(groupComponents, layoutGroup.dataModelBindings?.group, index);
  const repeating = layoutGroup.maxCount && layoutGroup.maxCount > 1;
  if (!repeating) {
    // If not repeating, treat as regular components
    return (
      <>
        {deepCopyComponents.map((component: ILayoutComponent) => {
          return renderGenericComponent({ component, layout });
        })}
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

export function setupGroupComponents(
  components: (ILayoutComponent | ILayoutGroup)[],
  groupDataModelBinding: string | undefined,
  index: number | undefined,
): (ILayoutGroup | ILayoutComponent)[] {
  return components.map((component: ILayoutComponent | ILayoutGroup) => {
    if (component.type === 'Group' && component.panel?.groupReference) {
      // Do not treat as a regular group child as this is merely an option to add elements for another group from this group context
      return component;
    }

    if (!groupDataModelBinding) {
      return component;
    }

    const componentDeepCopy: ILayoutComponent = JSON.parse(JSON.stringify(component));
    const dataModelBindings = { ...componentDeepCopy.dataModelBindings };
    Object.keys(dataModelBindings).forEach((key) => {
      const originalGroupBinding = groupDataModelBinding.replace(`[${index}]`, '');
      dataModelBindings[key] = dataModelBindings[key].replace(originalGroupBinding, groupDataModelBinding);
    });

    let mapping;
    if ('mapping' in componentDeepCopy) {
      mapping = setMappingForRepeatingGroupComponent(componentDeepCopy.mapping, index);
    }
    const deepCopyId = `${componentDeepCopy.id}-${index}`;

    return {
      ...componentDeepCopy,
      dataModelBindings,
      id: deepCopyId,
      baseComponentId: componentDeepCopy.id,
      mapping,
    };
  });
}

export function getLayoutsetForDataElement(
  instance: IInstance | undefined | null,
  datatype: string | undefined,
  layoutsets: ILayoutSets,
) {
  const currentTaskId = instance?.process.currentTask?.elementId;
  const foundLayout = layoutsets.sets.find((layoutSet: ILayoutSet) => {
    if (layoutSet.dataType !== datatype) {
      return false;
    }
    return layoutSet.tasks?.find((taskId: string) => taskId === currentTaskId);
  });
  return foundLayout?.id;
}

export function getHiddenFieldsForGroup(hiddenFields: string[], components: (ILayoutGroup | ILayoutComponent)[]) {
  const result: string[] = [];
  hiddenFields.forEach((fieldKey) => {
    const fieldKeyWithoutIndex = fieldKey.replace(/-\d+$/, '');
    if (components.find((component) => component.id === fieldKeyWithoutIndex)) {
      result.push(fieldKey);
    }
  });

  return result;
}

export const shouldUseRowLayout = ({ layout, optionsCount }) => {
  switch (layout) {
    case LayoutStyle.Row:
      return true;
    case LayoutStyle.Column:
      return false;
  }

  return optionsCount < 3;
};
