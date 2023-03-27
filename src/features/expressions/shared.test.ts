import dot from 'dot-object';

import { evalExpr } from 'src/features/expressions';
import { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { convertLayouts, getSharedTests } from 'src/features/expressions/shared';
import { asExpression } from 'src/features/expressions/validation';
import { getRepeatingGroups, splitDashedKey } from 'src/utils/formLayout';
import { buildInstanceContext } from 'src/utils/instanceContext';
import { _private } from 'src/utils/layout/hierarchy';
import type { FunctionTest, SharedTestContext, SharedTestContextList } from 'src/features/expressions/shared';
import type { Expression } from 'src/features/expressions/types';
import type { IRepeatingGroups } from 'src/types';
import type { IApplicationSettings } from 'src/types/shared';
import type { LayoutNode, LayoutPages } from 'src/utils/layout/hierarchy';
import type { HierarchyDataSources } from 'src/utils/layout/hierarchy.types';

const { nodesInLayouts, resolvedNodesInLayouts } = _private;

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
    if (foundMaybeGroup && foundMaybeGroup.isRepGroup()) {
      // Special case for using a group component with a row index, looking up within the
      // group context, but actually pointing to a row inside the group. This is supported
      // in useExpressions() itself, but evalExpr() requires the context of an actual component
      // inside the group.
      const rowIndex = [...rowIndices].pop();
      return foundMaybeGroup.children(undefined, rowIndex)[0];
    }
  }

  return new NodeNotFoundWithoutContext(componentId);
}

describe('Expressions shared function tests', () => {
  const sharedTests = getSharedTests('functions');

  describe.each(sharedTests.content)('Function: $folderName', (folder) => {
    it.each(folder.content)(
      '$name',
      ({ expression, expects, expectsFailure, context, layouts, dataModel, instance, frontendSettings }) => {
        const dataSources: HierarchyDataSources = {
          formData: dataModel ? dot.dot(dataModel) : {},
          instanceContext: buildInstanceContext(instance),
          applicationSettings: frontendSettings || ({} as IApplicationSettings),
          hiddenFields: new Set<string>(),
          validations: {},
        };

        const _layouts = convertLayouts(layouts);
        let repeatingGroups: IRepeatingGroups = {};
        for (const key of Object.keys(_layouts)) {
          repeatingGroups = {
            ...repeatingGroups,
            ...getRepeatingGroups(_layouts[key] || [], dataSources.formData),
          };
        }

        const currentLayout = (context && context.currentLayout) || '';
        const rootCollection = expectsFailure
          ? nodesInLayouts(_layouts, currentLayout, repeatingGroups, dataSources)
          : resolvedNodesInLayouts(_layouts, currentLayout, repeatingGroups, dataSources);
        const component = findComponent(context, rootCollection);

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
                dataSources.hiddenFields.add(node.item.id);
              }
            }
            if (layouts && layouts[layoutKey].data.hidden) {
              const hiddenExpr = asExpression(layouts[layoutKey].data.hidden) as Expression;
              const isHidden = evalExpr(hiddenExpr, layout, dataSources);
              if (isHidden) {
                for (const hiddenComponent of layout.flat(true)) {
                  dataSources.hiddenFields.add(hiddenComponent.item.id);
                }
              }
            }
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
    it.each(folder.content)('$name', ({ layouts, dataModel, instance, frontendSettings, expectedContexts }) => {
      const dataSources: HierarchyDataSources = {
        formData: dataModel ? dot.dot(dataModel) : {},
        instanceContext: buildInstanceContext(instance),
        applicationSettings: frontendSettings || ({} as IApplicationSettings),
        hiddenFields: new Set(),
        validations: {},
      };

      const foundContexts: SharedTestContextList[] = [];
      const _layouts = layouts || {};
      for (const key of Object.keys(_layouts)) {
        const repeatingGroups = getRepeatingGroups(_layouts[key].data.layout, dataSources.formData);
        const nodes = nodesInLayouts(
          { FormLayout: _layouts[key].data.layout },
          'FormLayout',
          repeatingGroups,
          dataSources,
        );
        const layout = nodes.current();
        if (!layout) {
          throw new Error('No layout found - check your test data!');
        }

        foundContexts.push({
          component: key,
          currentLayout: key,
          children: layout.children().map((child) => recurse(child, key)),
        });
      }

      expect(foundContexts.sort(contextSorter)).toEqual(expectedContexts.sort(contextSorter));
    });
  });
});
