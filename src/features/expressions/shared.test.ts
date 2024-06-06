import dot from 'dot-object';

import { getHierarchyDataSourcesMock } from 'src/__mocks__/getHierarchyDataSourcesMock';
import { evalExpr } from 'src/features/expressions';
import { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { convertInstanceDataToAttachments, convertLayouts, getSharedTests } from 'src/features/expressions/shared';
import { asExpression } from 'src/features/expressions/validation';
import { resourcesAsMap } from 'src/features/language/textResources/resourcesAsMap';
import { staticUseLanguageForTests } from 'src/features/language/useLanguage';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { getLayoutComponentObject } from 'src/layout';
import { buildAuthContext } from 'src/utils/authContext';
import { splitDashedKey } from 'src/utils/formLayout';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import { _private } from 'src/utils/layout/hierarchy';
import { generateEntireHierarchy, generateHierarchy } from 'src/utils/layout/HierarchyGenerator';
import type { FunctionTest, SharedTestContext, SharedTestContextList } from 'src/features/expressions/shared';
import type { Expression } from 'src/features/expressions/types';
import type { AllOptionsMap } from 'src/features/options/useAllOptions';
import type { HierarchyDataSources } from 'src/layout/layout';
import type { IApplicationSettings } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

const { resolvedNodesInLayouts } = _private;

function findComponent(context: FunctionTest['context'], collection: LayoutPages<any>) {
  const { component, rowIndices } = context || { component: 'no-component' };
  const componentId = (component || 'no-component') + (rowIndices ? `-${rowIndices.join('-')}` : '');
  const found = collection.findById(componentId);
  if (found) {
    return found;
  }

  if (component && rowIndices && rowIndices.length) {
    const componentId2 = `${component}-${rowIndices.slice(0, rowIndices.length - 1).join('-')}`.replace(/-+$/, '');
    const foundMaybeGroup = collection.findById(componentId2);
    if (foundMaybeGroup && foundMaybeGroup.isType('RepeatingGroup')) {
      // Special case for using a group component with a row index, looking up within the
      // group context, but actually pointing to a row inside the group. This is supported
      // in useExpressions() itself, but evalExpr() requires the context of an actual component
      // inside the group.
      const rowIndex = [...rowIndices].pop()!;
      return foundMaybeGroup.children(undefined, { onlyInRowIndex: rowIndex })[0];
    }
  }

  return new NodeNotFoundWithoutContext(componentId);
}

describe('Expressions shared function tests', () => {
  let preHash;
  beforeAll(() => {
    preHash = window.location.hash;
    window.location.hash = '#/instance/510001/d00ce51c-800b-416a-a906-ccab55f597e9/Task_3/grid';
  });
  afterAll(() => {
    window.location.hash = preHash;
  });

  const sharedTests = getSharedTests('functions');

  describe.each(sharedTests.content)('Function: $folderName', (folder) => {
    it.each(folder.content)(
      '$name',
      ({
        disabledFrontend,
        expression,
        expects,
        expectsFailure,
        context,
        layouts,
        dataModel,
        instanceDataElements,
        instance,
        process,
        permissions,
        frontendSettings,
        textResources,
        profileSettings,
      }) => {
        if (disabledFrontend) {
          // Skipped tests usually means that the frontend does not support the feature yet
          return;
        }

        const hidden = new Set<string>();
        const options: AllOptionsMap = {};
        const dataSources: HierarchyDataSources = {
          ...getHierarchyDataSourcesMock(),
          formDataSelector: (path) => dot.pick(path, dataModel ?? {}),
          attachments: convertInstanceDataToAttachments(instanceDataElements),
          instanceDataSources: buildInstanceDataSources(instance),
          applicationSettings: frontendSettings || ({} as IApplicationSettings),
          authContext: buildAuthContext(permissions),
          langToolsSelector: () =>
            staticUseLanguageForTests({
              textResources: textResources ? resourcesAsMap(textResources) : {},
            }),
          process,
          currentLanguage: profileSettings?.language || 'nb',
          options: (nodeId) => options[nodeId] || [],
          isHidden: (nodeId: string) => hidden.has(nodeId),
        };

        const _layouts = convertLayouts(layouts);
        const currentLayout = (context && context.currentLayout) || '';
        const rootCollection = expectsFailure
          ? generateEntireHierarchy(_layouts, currentLayout, dataSources, getLayoutComponentObject)
          : resolvedNodesInLayouts(_layouts, currentLayout, dataSources);
        const component = findComponent(context, rootCollection);

        for (const node of rootCollection.allNodes()) {
          if ('options' in node.item) {
            // Extremely simple mock of useGetOptions() and useAllOptions(), assuming
            // all components use plain static options
            options[node.item.id] = castOptionsToStrings(node.item.options);
          }
        }

        if (expectsFailure) {
          expect(() => {
            const expr = asExpression(expression);
            return evalExpr(expr as Expression, component, dataSources);
          }).toThrow(expectsFailure);
        } else {
          // Simulate what happens in checkIfConditionalRulesShouldRunSaga()
          for (const layoutKey of Object.keys(rootCollection.all())) {
            const layout = rootCollection.findLayout(layoutKey);
            if (!layout) {
              throw new Error('No layout found - check your test data!');
            }

            for (const node of layout.flat(true)) {
              if (node.isHidden()) {
                hidden.add(node.item.id);
              }
            }
            if (layouts && layouts[layoutKey].data.hidden) {
              const hiddenExpr = asExpression(layouts[layoutKey].data.hidden) as Expression;
              const isHidden = evalExpr(hiddenExpr, layout, dataSources);
              if (isHidden) {
                for (const hiddenComponent of layout.flat(true)) {
                  hidden.add(hiddenComponent.item.id);
                }
              }
            }
          }

          // We've manipulated internal state, so we need to reset the cache for hidden to work again
          for (const n of rootCollection.allNodes()) {
            n.hiddenCache = {};
          }

          const expr = asExpression(expression) as Expression;
          expect(evalExpr(expr, component, dataSources)).toEqual(expects);
        }
      },
    );
  });
});

describe('Expressions shared context tests', () => {
  const sharedTests = getSharedTests('context-lists');

  function contextSorter(a: SharedTestContext, b: SharedTestContext): -1 | 0 | 1 {
    if (a.component === b.component) {
      return 0;
    }

    return a.component > b.component ? 1 : -1;
  }

  function recurse(node: LayoutNode, key: string): SharedTestContextList {
    const splitKey = splitDashedKey(node.item.id);
    const context: SharedTestContextList = {
      component: splitKey.baseComponentId,
      currentLayout: key,
    };
    const children = node.children().map((child) => recurse(child, key));
    if (children.length) {
      context.children = children;
    }
    if (splitKey.depth.length) {
      context.rowIndices = splitKey.depth;
    }

    return context;
  }

  describe.each(sharedTests.content)('$folderName', (folder) => {
    it.each(folder.content)(
      '$name',
      ({ layouts, dataModel, instanceDataElements, instance, frontendSettings, permissions, expectedContexts }) => {
        const dataSources: HierarchyDataSources = {
          ...getHierarchyDataSourcesMock(),
          formDataSelector: (path) => dot.pick(path, dataModel ?? {}),
          attachments: convertInstanceDataToAttachments(instanceDataElements),
          instanceDataSources: buildInstanceDataSources(instance),
          applicationSettings: frontendSettings || ({} as IApplicationSettings),
          authContext: buildAuthContext(permissions),
        };

        const foundContexts: SharedTestContextList[] = [];
        const _layouts = layouts || {};
        for (const key of Object.keys(_layouts)) {
          const layout = generateHierarchy(_layouts[key].data.layout, dataSources, getLayoutComponentObject);

          foundContexts.push({
            component: key,
            currentLayout: key,
            children: layout.children().map((child) => recurse(child, key)),
          });
        }

        expect(foundContexts.sort(contextSorter)).toEqual(expectedContexts.sort(contextSorter));
      },
    );
  });
});
