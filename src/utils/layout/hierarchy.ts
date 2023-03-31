import { useMemo } from 'react';

import { evalExprInObj, ExprConfigForComponent, ExprConfigForGroup } from 'src/features/expressions';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { INDEX_KEY_INDICATOR_REGEX } from 'src/utils/databindings';
import { getRepeatingGroupStartStopIndex } from 'src/utils/formLayout';
import { buildInstanceContext } from 'src/utils/instanceContext';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { ExprResolved, ExprUnresolved } from 'src/features/expressions/types';
import type { ILayout, ILayoutComponent, ILayoutComponentOrGroup, ILayouts } from 'src/layout/layout';
import type { IMapping, IRepeatingGroups, IRuntimeState, ITextResource } from 'src/types';
import type {
  AnyItem,
  HComponent,
  HComponentInRepGroup,
  HierarchyDataSources,
  HNonRepGroup,
  HRepGroup,
  HRepGroupChild,
  HRepGroupExtensions,
  ParentNode,
} from 'src/utils/layout/hierarchy.types';

/**
 * Takes a flat layout and turns it into a hierarchy. That means, each group component will not have
 * references to each component inside the group, it will have the component definitions themselves
 * nested inside the 'childComponents' property.
 *
 * If this abstraction level is not fine enough for you, you might want to look into these utils:
 *    layoutAsHierarchyWithRows() takes this further by giving you a all the components as a hierarchy,
 *        but also includes every component in a repeating group multiple times (for each row in the group).
 *        It will also give you proper componentIds and dataModelBindings for the component so you
 *        can reference validations, attachments, formData, etc.
 *    nodesInLayout() takes it even further, but also simplifies the structure by giving you
 *        a flat list. This list includes all components (multiple instances of them for rows in
 *        repeating groups), but wraps them in a class which is aware of the component location
 *        inside the whole layout, allowing you to, for example, find a sibling instance of a
 *        component inside a repeating group - complete with proper componentId and dataModelBindings.
 *
 * Note: This strips away multiPage functionality and treats every component of a multiPage group
 * as if every component is on the same page.
 */
function layoutAsHierarchy(originalLayout: ILayout): (ILayoutComponent | HNonRepGroup)[] {
  const layoutAsMap: { [id: string]: ExprUnresolved<ILayoutComponentOrGroup> } = {};
  const layoutCopy = JSON.parse(JSON.stringify(originalLayout)) as ILayout;
  for (const component of layoutCopy) {
    layoutAsMap[component.id] = component;
  }

  const idsInGroups = new Set<string>();
  for (const component of layoutCopy) {
    if (component.type !== 'Group') {
      continue;
    }

    const children: { id: string; index?: number }[] = component.edit?.multiPage
      ? component.children.map((compoundId) => {
          const [multiPageIndex, id] = compoundId.split(':');
          return { id, index: parseInt(multiPageIndex) };
        })
      : component.children.map((id) => ({ id }));

    const childComponents = children
      .map((child) => {
        const component = layoutAsMap[child.id];
        if (component) {
          idsInGroups.add(child.id);

          if (typeof child.index === 'number') {
            component['multiPageIndex'] = child.index;
          }

          return component;
        }

        return false;
      })
      .filter((child) => !!child) as (ILayoutComponent | HNonRepGroup)[];

    delete (component as any)['children'];
    component['childComponents'] = childComponents;
  }

  const out = layoutCopy.filter((c) => !idsInGroups.has(c.id));
  return out as (ILayoutComponent | HNonRepGroup)[];
}

interface HierarchyParent {
  index: number;
  binding?: string;
}

/**
 * Types of possible components on the top level of a repeating group hierarchy with rows
 */
type HierarchyWithRows = HComponent | HNonRepGroup | HRepGroup;

/**
 * This function takes the logic from layoutAsHierarchy() further by giving you a all the components as a hierarchy,
 * but it also includes every component in a repeating group multiple times (for each row in the group). It will also
 * give you proper componentIds and dataModelBindings for the component so you can reference validations, attachments,
 * formData, etc.
 *
 * If this abstraction level is not the right one for your needs, you might want to look into these utils:
 *    layoutAsHierarchy() is a bit simpler, as it converts a simple flat layout into a hierarchy
 *        of components - although it doesn't know anything about repeating groups and their rows.
 *    nodesInLayout() takes it even further, but also simplifies the structure by giving you
 *        a flat list. This list includes all components (multiple instances of them for rows in
 *        repeating groups), but wraps them in a class which is aware of the component location
 *        inside the whole layout, allowing you to, for example, find a sibling instance of a
 *        component inside a repeating group - complete with proper componentId and dataModelBindings.
 *
 * Note: This strips away multiPage functionality and treats every component of a multiPage group
 * as if every component is on the same page.
 */
function layoutAsHierarchyWithRows(formLayout: ILayout, repeatingGroups: IRepeatingGroups | null): HierarchyWithRows[] {
  const rewriteDataModelBindings = (
    main: HNonRepGroup | HRepGroup,
    child: HNonRepGroup | HComponent,
    newChild: HComponentInRepGroup,
    parent: HierarchyParent | undefined,
    index: number,
  ) => {
    const baseGroupBinding =
      (main as HRepGroupExtensions).baseDataModelBindings?.group || main.dataModelBindings?.group;

    let binding = main.dataModelBindings?.group;
    if (binding && parent && baseGroupBinding) {
      binding = binding.replace(baseGroupBinding, `${parent.binding}`);
    }

    newChild.baseDataModelBindings = { ...child.dataModelBindings };
    if (child.dataModelBindings && newChild.dataModelBindings) {
      for (const key of Object.keys(child.dataModelBindings)) {
        newChild.dataModelBindings[key] = child.dataModelBindings[key].replace(
          baseGroupBinding,
          `${binding}[${index}]`,
        );
      }
    }
  };

  const rewriteMappingReferences = (
    newChild: HComponentInRepGroup,
    parent: HierarchyParent | undefined,
    index: number,
  ) => {
    if (!('mapping' in newChild) || !newChild.mapping) {
      return;
    }

    const indexes = parent ? [parent.index, index] : [index];
    const mappingKeys = Object.keys(newChild.mapping);
    const newMapping: IMapping = {};
    for (const oldKey of mappingKeys) {
      let newKey = oldKey;
      for (const i of indexes) {
        newKey = newKey.replace(INDEX_KEY_INDICATOR_REGEX, `[${i}]`);
      }
      newMapping[newKey] = newChild.mapping[oldKey];
    }

    newChild.mapping = newMapping;
  };

  const repGroups: { [id: string]: HRepGroup } = {};
  const groupReferences: HNonRepGroup[] = [];
  const recurse = (main: ILayoutComponent | HNonRepGroup | HComponentInRepGroup, parent?: HierarchyParent) => {
    if (main.type === 'Group' && main.maxCount && main.maxCount > 1) {
      const rows: HRepGroup['rows'] = [];
      const { startIndex, stopIndex } = getRepeatingGroupStartStopIndex(
        (repeatingGroups || {})[main.id]?.index,
        main.edit,
      );
      for (let index = startIndex; index <= stopIndex; index++) {
        const items = main.childComponents.map((child) => {
          const suffix = parent ? `-${parent.index}-${index}` : `-${index}`;
          const newId = `${child.id}${suffix}`;
          const newChild: HComponentInRepGroup = {
            ...JSON.parse(JSON.stringify(child)),
            id: newId,
            baseComponentId: child.id,
          };

          if (child.dataModelBindings) {
            rewriteDataModelBindings(main, child, newChild, parent, index);
          }

          rewriteMappingReferences(newChild, parent, index);

          return recurse(newChild, {
            index,
            binding: main.dataModelBindings?.group,
          });
        });
        rows.push({ items, index });
      }

      const out: HRepGroup = { ...main, rows };
      delete out['childComponents'];
      repGroups[main.id] = out;
      return out;
    } else if (main.type === 'Group' && main.panel && main.panel.groupReference?.group) {
      // We need to iterate once more for group references to work, as we don't know if the references group has had
      // their data model bindings mapped yet.
      groupReferences.push(main);
    }

    return main as HComponentInRepGroup;
  };

  const resolveGroupReferences = () => {
    for (const main of groupReferences) {
      const reference = main.panel?.groupReference?.group;
      const referencedGroup = reference ? repGroups[reference] : undefined;
      const referencedGroupState = reference && repeatingGroups ? repeatingGroups[reference] : undefined;
      if (!reference || !referencedGroup || !referencedGroupState) {
        // TODO: Show validations like these to the app developers more clearly
        console.warn(
          'Found panel with groupReference (',
          main.id,
          ') that references a non-existing or non-repeating group (',
          main.panel?.groupReference?.group,
          ')',
        );
        continue;
      }
      main.childComponents = main.childComponents.map((child) => {
        const nextIndex = referencedGroupState.index + 1;
        const newChild: HComponentInRepGroup = {
          ...JSON.parse(JSON.stringify(child)),
          id: `${child.id}-${nextIndex}`,
          baseComponentId: child.id,
        };

        if (child.dataModelBindings) {
          rewriteDataModelBindings(referencedGroup, child, newChild, undefined, nextIndex);
        }

        rewriteMappingReferences(newChild, undefined, nextIndex);

        return newChild;
      });
    }
  };

  const out = layoutAsHierarchy(formLayout).map((child) => recurse(child));
  groupReferences.length && resolveGroupReferences();
  return out;
}

/**
 * Takes the layoutAsHierarchyWithRows() tool a bit further, but returns a flat list. This list includes all components
 * (multiple instances of them for rows in repeating groups), but wraps them in a LayoutNode object which is aware of the
 * component location inside the whole layout, allowing you to, for example, find a sibling instance of a component
 * inside a repeating group - complete with proper componentId and dataModelBindings.
 *
 * If this abstraction level is overkill for you, you might want to look into these utils:
 *    layoutAsHierarchy() is much simpler, as it converts a simple flat layout into a hierarchy
 *        of components - although it doesn't know anything about repeating groups and their rows.
 *    layoutAsHierarchyWithRows() is a bit simpler by giving you a all the components as a hierarchy,
 *        but also includes every component in a repeating group multiple times (for each row in the group).
 *        It will also give you proper componentIds and dataModelBindings for the component so you
 *        can reference validations, attachments, formData, etc. However, it might be harder to
 *        use if you know exactly which component you're looking for, if recursive iteration makes
 *        things more difficult, or if you need to traverse through the layout more than once.
 *
 * Note: This strips away multiPage functionality and treats every component of a multiPage group
 * as if every component is on the same page.
 */
function nodesInLayout(
  formLayout: ILayout | undefined | null,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: HierarchyDataSources,
): LayoutPage {
  const root = new LayoutPage();

  const recurse = (
    // The typing here is a lie. We don't have resolved expressions yet, that will happen later.
    list: (ExprResolved<ILayoutComponent> | HNonRepGroup | HRepGroup | HRepGroupChild)[],
    parent: ParentNode,
    rowIndex?: number,
  ) => {
    for (const component of list) {
      if (component.type === 'Group' && 'rows' in component) {
        const group: ParentNode = new LayoutNode(component, parent, root, dataSources, rowIndex);
        component.rows.forEach((row) => row && recurse(row.items, group, row.index));
        root._addChild(group);
      } else if (component.type === 'Group' && 'childComponents' in component) {
        const group = new LayoutNode(component, parent, root, dataSources, rowIndex);
        recurse(component.childComponents, group);
        root._addChild(group);
      } else {
        const node = new LayoutNode(component as AnyItem, parent, root, dataSources, rowIndex);
        root._addChild(node);
      }
    }
  };

  if (formLayout) {
    recurse(layoutAsHierarchyWithRows(formLayout, repeatingGroups), root);
  }

  return root;
}

/**
 * The same as the function above, but takes multiple layouts and returns a collection
 */
function nodesInLayouts(
  layouts: ILayouts | undefined | null,
  currentView: string,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: HierarchyDataSources,
): LayoutPages {
  const nodes = {};

  const _layouts = layouts || {};
  for (const key of Object.keys(_layouts)) {
    nodes[key] = nodesInLayout(_layouts[key], repeatingGroups, dataSources);
  }

  return new LayoutPages(currentView as keyof typeof nodes, nodes);
}

/**
 * This is the same tool as the one above, but additionally it will iterate each component/group in the layout
 * and resolve all expressions for it.
 */
function resolvedNodesInLayouts(
  layouts: ILayouts | null,
  currentLayout: string,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: HierarchyDataSources,
) {
  // A full copy is needed here because formLayout comes from the redux store, and in production code (not the
  // development server!) the properties are not mutable (but we have to mutate them below).
  const layoutsCopy: ILayouts = structuredClone(layouts || {});
  const unresolved = nodesInLayouts(layoutsCopy, currentLayout, repeatingGroups, dataSources);

  const config = {
    ...ExprConfigForComponent,
    ...ExprConfigForGroup,
  } as any;

  for (const layout of Object.values(unresolved.all())) {
    for (const node of layout.flat(true)) {
      const input = { ...node.item };
      delete input['children'];
      delete input['rows'];
      delete input['childComponents'];

      const resolvedItem = evalExprInObj({
        input,
        node,
        dataSources,
        config,
        resolvingPerRow: false,
      }) as unknown as AnyItem;

      if (node.item.type === 'Group' && 'rows' in node.item) {
        for (const row of node.item.rows) {
          if (!row) {
            continue;
          }
          const firstItem = row.items[0];
          if (!firstItem) {
            continue;
          }
          const firstItemNode = unresolved.findById(firstItem.id);
          if (firstItemNode) {
            row.groupExpressions = evalExprInObj({
              input,
              node: firstItemNode,
              dataSources,
              config,
              resolvingPerRow: true,
              deleteNonExpressions: true,
            }) as any;
          }
        }
      }

      for (const key of Object.keys(resolvedItem)) {
        // Mutates node.item directly - this also mutates references to it and makes sure
        // we resolve expressions deep inside recursive structures.
        node.item[key] = resolvedItem[key];
      }
    }
  }

  return unresolved as unknown as LayoutPages;
}

/**
 * This updates the textResourceBindings for each node to match the new one made in replaceTextResourcesSaga.
 * It must be run _after_ resolving expressions, as that may decide to use other text resource bindings.
 *
 * @see replaceTextResourcesSaga
 * @see replaceTextResourceParams
 * @ßee getVariableTextKeysForRepeatingGroupComponent
 */
function rewriteTextResourceBindings(collection: LayoutPages, textResources: ITextResource[]) {
  for (const layout of Object.values(collection.all())) {
    for (const node of layout.flat(true)) {
      if (!node.item.textResourceBindings || node.rowIndex === undefined) {
        continue;
      }

      if (node.parent instanceof LayoutPage || !(node.parent.parent instanceof LayoutPage)) {
        // This only works in row items on the first level (not for nested repeating groups)
        continue;
      }

      const rewrittenItems = { ...node.item.textResourceBindings };
      if (textResources && node.item.textResourceBindings) {
        const bindingsWithVariablesForRepeatingGroups = Object.keys(rewrittenItems).filter((key) => {
          const textKey = rewrittenItems[key];
          const textResource = textResources.find((text) => text.id === textKey);
          return (
            textResource && textResource.variables && textResource.variables.find((v) => v.key.indexOf('[{0}]') > -1)
          );
        });

        bindingsWithVariablesForRepeatingGroups.forEach((key) => {
          rewrittenItems[key] = `${rewrittenItems[key]}-${node.rowIndex}`;
        });
      }

      node.item.textResourceBindings = { ...rewrittenItems };
    }
  }
}

export function dataSourcesFromState(state: IRuntimeState): HierarchyDataSources {
  return {
    formData: state.formData.formData,
    applicationSettings: state.applicationSettings.applicationSettings,
    instanceContext: buildInstanceContext(state.instanceData?.instance),
    hiddenFields: new Set(state.formLayout.uiConfig.hiddenFields),
    validations: state.formValidations.validations,
  };
}

function innerResolvedLayoutsFromState(
  layouts: ILayouts | null,
  currentView: string | undefined,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: HierarchyDataSources,
  textResources: ITextResource[],
): LayoutPages | undefined {
  if (!layouts || !currentView || !repeatingGroups) {
    return undefined;
  }

  const resolved = resolvedNodesInLayouts(layouts, currentView, repeatingGroups, dataSources);
  rewriteTextResourceBindings(resolved, textResources);

  return resolved;
}

export function resolvedLayoutsFromState(state: IRuntimeState) {
  return innerResolvedLayoutsFromState(
    state.formLayout.layouts,
    state.formLayout.uiConfig.currentView,
    state.formLayout.uiConfig.repeatingGroups,
    dataSourcesFromState(state),
    state.textResources.resources,
  );
}

/**
 * This is a more efficient, memoized version of what happens above. This will only be used from ExprContext,
 * and trades verbosity and code duplication for performance and caching.
 */
function useResolvedExpressions() {
  const state = useAppSelector((state) => state);
  const instance = state.instanceData?.instance;
  const formData = state.formData.formData;
  const applicationSettings = state.applicationSettings.applicationSettings;
  const hiddenFields = state.formLayout.uiConfig.hiddenFields;
  const validations = state.formValidations.validations;
  const layouts = state.formLayout.layouts;
  const currentView = state.formLayout.uiConfig.currentView;
  const repeatingGroups = state.formLayout.uiConfig.repeatingGroups;
  const textResources = state.textResources.resources;

  const dataSources: HierarchyDataSources = useMemo(
    () => ({
      formData,
      applicationSettings,
      instanceContext: buildInstanceContext(instance),
      hiddenFields: new Set(hiddenFields),
      validations,
    }),
    [formData, applicationSettings, instance, hiddenFields, validations],
  );

  return useMemo(
    () => innerResolvedLayoutsFromState(layouts, currentView, repeatingGroups, dataSources, textResources),
    [layouts, currentView, repeatingGroups, dataSources, textResources],
  );
}

/**
 * Selector for use in redux sagas. Will return a fully resolved layouts tree.
 * Specify manually that the returned value from this is `LayoutPages`
 */
export const ResolvedNodesSelector = (state: IRuntimeState) => resolvedLayoutsFromState(state);

/**
 * Exported only for testing. Please do not use!
 */
export const _private = {
  layoutAsHierarchy,
  layoutAsHierarchyWithRows,
  nodesInLayout,
  nodesInLayouts,
  resolvedNodesInLayouts,
  useResolvedExpressions,
};
