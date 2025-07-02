import { getComponentCapabilities, getComponentDef } from 'src/layout';
import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal, CompTypes, ILayouts } from 'src/layout/layout';
import type { ChildClaimerProps } from 'src/layout/LayoutComponent';
import type { ChildClaimsMap } from 'src/utils/layout/generator/GeneratorContext';

interface PlainLayoutLookups {
  // Map of all component ids (without row indexes) to component definitions
  allComponents: {
    [componentId: string]: CompExternal | undefined;
  };

  // Map of all page keys, with all the component ids on that page
  allPerPage: {
    [pageKey: string]: string[] | undefined;
  };

  // Map of all component ids to the page key they are on
  componentToPage: {
    [componentId: string]: string | undefined;
  };

  // Map of all data model paths to the component ids that bind to them
  dataModelToComponents: {
    [dataType: string]:
      | {
          [field: string]: string[] | undefined;
        }
      | undefined;
  };
}

interface RelationshipLookups {
  // Map of all component ids to their parent component id
  componentToParent: {
    [componentId: string]: { type: 'page'; id: string } | { type: 'node'; id: string } | undefined;
  };

  // Map of all component ids to their children component ids
  componentToChildren: {
    [componentId: string]: string[] | undefined;
  };

  // Map of all page keys to the top-level component ids on that page
  topLevelComponents: {
    [pageKey: string]: string[] | undefined;
  };

  // Map of all parent component ids to their child claims
  childClaims: ChildClaimsMap;
}

interface LookupFunctions {
  // Get the component config for a given ID and component type, or crash
  getComponent<ID extends string | undefined, T extends CompTypes | undefined = CompTypes>(
    id: ID,
    type?: T | ((type: CompTypes) => boolean),
  ): ID extends undefined ? undefined : CompExternal<T extends CompTypes ? T : CompTypes>;
}

export type LayoutLookups = PlainLayoutLookups & RelationshipLookups & LookupFunctions;

/**
 * Make the simple hash-maps for all components in the layouts. This is used to quickly look up component, and
 * which components are on which pages.
 */
function makePlainLookup(layouts: ILayouts): PlainLayoutLookups {
  const allComponents: PlainLayoutLookups['allComponents'] = {};
  const allPerPage: PlainLayoutLookups['allPerPage'] = {};
  const componentToPage: PlainLayoutLookups['componentToPage'] = {};
  const dataModelToComponents: PlainLayoutLookups['dataModelToComponents'] = {};

  for (const pageKey of Object.keys(layouts)) {
    const page = layouts[pageKey];
    if (!page) {
      continue;
    }

    allPerPage[pageKey] = [];
    for (const component of page) {
      allComponents[component.id] = component;
      allPerPage[pageKey].push(component.id);
      componentToPage[component.id] = pageKey;

      if ('dataModelBindings' in component && component.dataModelBindings) {
        for (const bindingKey of Object.keys(component.dataModelBindings)) {
          const binding = component.dataModelBindings[bindingKey] as IDataModelReference | undefined;
          if (binding) {
            if (!dataModelToComponents[binding.dataType]) {
              dataModelToComponents[binding.dataType] = {};
            }
            if (!dataModelToComponents[binding.dataType]![binding.field]) {
              dataModelToComponents[binding.dataType]![binding.field] = [];
            }
            dataModelToComponents[binding.dataType]![binding.field]!.push(component.id);
          }
        }
      }
    }
  }

  return { allComponents, allPerPage, componentToPage, dataModelToComponents };
}

/**
 * Produces a map of all components in multiple layouts/pages, their parents, the top-level components on each
 * page (in their defined order), and serves as a tool for looking up component definitions by id, along with
 * parent/child relationships.
 */
export function makeLayoutLookups(layouts: ILayouts): LayoutLookups {
  const plainLookups = makePlainLookup(layouts);
  const componentToParent: { [componentId: string]: { type: 'page'; id: string } | { type: 'node'; id: string } } = {};
  const componentToChildren: { [componentId: string]: string[] } = {};
  const topLevelComponents: { [pageKey: string]: string[] } = {};
  const childClaims: ChildClaimsMap = {};

  for (const pageKey of Object.keys(plainLookups.allPerPage)) {
    const claimedIds = new Set<string>();

    if (!topLevelComponents[pageKey]) {
      topLevelComponents[pageKey] = [];
    }

    for (const componentId of plainLookups.allPerPage[pageKey]!) {
      const component = plainLookups.allComponents[componentId]!;
      const def = getComponentDef(component.type);
      if (def instanceof ContainerComponent) {
        const parentId = component.id;
        const props: ChildClaimerProps<CompTypes> = {
          item: component,
          claimChild: (pluginKey, childId) => {
            if (canClaimChild(childId, parentId, plainLookups, childClaims)) {
              childClaims[parentId] = { ...childClaims[parentId], [childId]: { pluginKey } };
              claimedIds.add(childId);
              componentToParent[childId] = { type: 'node', id: parentId };
              if (!componentToChildren[parentId]) {
                componentToChildren[parentId] = [];
              }
              componentToChildren[parentId].push(childId);
            }
          },
          getType: (id) => getType(id, component.id, plainLookups),
          getCapabilities: (type) => getComponentCapabilities(type),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        def.claimChildren(props as any);
      }
    }

    // All non-claimed components on a page are top-level components, and their parent is the page
    for (const componentId of plainLookups.allPerPage[pageKey]!) {
      if (!claimedIds.has(componentId)) {
        componentToParent[componentId] = { type: 'page', id: pageKey };
        topLevelComponents[pageKey].push(componentId);
      }
    }
  }

  const lookups = { ...plainLookups, componentToParent, componentToChildren, topLevelComponents, childClaims };
  return makeLookupFunctions(lookups);
}

function makeLookupFunctions(lookups: PlainLayoutLookups & RelationshipLookups): LayoutLookups {
  const getComponent = ((id, type) => {
    if (id === undefined) {
      return undefined;
    }

    const component = lookups.allComponents[id];
    if (!component) {
      throw new Error(`Component '${id}' does not exist`);
    }
    if (typeof type === 'string' && component.type !== type) {
      throw new Error(`Component '${id}' is of type '${component.type}', not '${type}'`);
    }
    if (typeof type === 'function' && !type(component.type)) {
      throw new Error(`Component '${id}' is of type '${component.type}', not one of the expected types`);
    }
    return component as CompExternal<typeof type extends CompTypes ? typeof type : CompTypes>;
  }) as LayoutLookups['getComponent'];

  return { ...lookups, getComponent };
}

function canClaimChild(childId: string, parentId: string, lookup: PlainLayoutLookups, claims: ChildClaimsMap) {
  const parentPageKey = lookup.componentToPage[parentId];
  const exists = !!lookup.allComponents[childId];
  if (!exists) {
    window.logError(`Component '${childId}' (as referenced by '${parentId}') does not exist`);
    return false;
  }
  const existsOnThisPage = exists && lookup.componentToPage[childId] === parentPageKey;
  if (!existsOnThisPage) {
    const actualPage = lookup.componentToPage[childId];
    window.logError(
      `Component '${childId}' (as referenced by '${parentId}') exists on page '${actualPage}', not '${parentPageKey}'`,
    );
    return false;
  }
  const otherClaims: string[] = [];
  for (const otherParentId in claims) {
    if (claims[otherParentId]?.[childId]) {
      otherClaims.push(otherParentId);
    }
  }
  if (otherClaims.length > 0) {
    const claimsStr = otherClaims.join(', ');
    window.logError(`Component '${childId}' (as referenced by '${parentId}') is already claimed by '${claimsStr}'`);
    return false;
  }

  return true;
}

/**
 * Get the type and capabilities of a component by its id. It might seem like this is easy to refactor by just getting
 * the type and make the code calling this get the capabilities, but the code that needs these capabilities will crash
 * upon importing CSS in the code generator if we do that.
 */
function getType(id: string, requestedBy: string, lookup: PlainLayoutLookups) {
  const type = lookup.allComponents[id]?.type;
  if (type === undefined) {
    window.logError(`Component '${id}' (as referenced by '${requestedBy}') does not exist`);
    return undefined;
  }
  return type;
}
