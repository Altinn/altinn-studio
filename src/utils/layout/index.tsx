import { LayoutStyle } from 'src/types';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutComponentOrGroup, ILayouts } from 'src/layout/layout';
import type { ILayoutSet, ILayoutSets } from 'src/types';
import type { IInstance } from 'src/types/shared';

/**
 * @deprecated
 * @see useExprContext
 * @see useResolvedNode
 * @see ResolvedNodesSelector
 */
export function getLayoutComponentById(
  id: string,
  layouts: ILayouts | null,
): ExprUnresolved<ILayoutComponentOrGroup> | undefined {
  if (!layouts) {
    return undefined;
  }

  let component: ExprUnresolved<ILayoutComponentOrGroup> | undefined;
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

/**
 * @deprecated
 * @see useExprContext
 * @see useResolvedNode
 * @see ResolvedNodesSelector
 */
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

/**
 * Check if provided id matches component id.
 * For repeating groups, component id from formLayout is postfixed with -{index}
 * when rendering, where index is the component's index (number) in the repeating group list.
 * This does not change the component definition in formLayout.
 * Therefore, we must match on component id as well as a potential -{index} postfix
 * when searching through formLayout for the component definition.
 *
 * @deprecated Compare with baseComponentId instead
 */
export function matchLayoutComponent(providedId: string, componentId: string) {
  return providedId.match(`^(${componentId})(-[0-9]+)*$`);
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

export const shouldUseRowLayout = ({ layout, optionsCount }) => {
  switch (layout) {
    case LayoutStyle.Row:
      return true;
    case LayoutStyle.Column:
      return false;
  }

  return optionsCount < 3;
};
