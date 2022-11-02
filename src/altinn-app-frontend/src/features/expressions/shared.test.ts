import dot from 'dot-object';

import { evalExpr } from 'src/features/expressions';
import { NodeNotFoundWithoutContext } from 'src/features/expressions/errors';
import { getSharedTests } from 'src/features/expressions/shared';
import { asExpression } from 'src/features/expressions/validation';
import { getRepeatingGroups, splitDashedKey } from 'src/utils/formLayout';
import {
  LayoutRootNodeCollection,
  nodesInLayout,
} from 'src/utils/layout/hierarchy';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type {
  FunctionTest,
  SharedTestContext,
  SharedTestContextList,
} from 'src/features/expressions/shared';
import type { Expression } from 'src/features/expressions/types';
import type { LayoutNode } from 'src/utils/layout/hierarchy';

import type {
  IApplicationSettings,
  IInstanceContext,
} from 'altinn-shared/types';

function toComponentId({
  component,
  rowIndices,
}: Exclude<FunctionTest['context'], undefined>) {
  return (
    (component || 'no-component') +
    (rowIndices ? `-${rowIndices.join('-')}` : '')
  );
}

describe('Expressions shared function tests', () => {
  const sharedTests = getSharedTests('functions');

  describe.each(sharedTests.content)('Function: $folderName', (folder) => {
    it.each(folder.content)(
      '$name',
      ({
        expression,
        expects,
        expectsFailure,
        context,
        layouts,
        dataModel,
        instanceContext,
        frontendSettings,
      }) => {
        const dataSources: ContextDataSources = {
          formData: dataModel ? dot.dot(dataModel) : {},
          instanceContext: instanceContext || ({} as IInstanceContext),
          applicationSettings: frontendSettings || ({} as IApplicationSettings),
        };

        const asNodes = {};
        const _layouts = layouts || {};
        for (const key of Object.keys(_layouts)) {
          const repeatingGroups = getRepeatingGroups(
            _layouts[key].data.layout,
            dataSources.formData,
          );
          asNodes[key] = nodesInLayout(
            _layouts[key].data.layout,
            repeatingGroups,
          );
        }

        const currentLayout = (context && context.currentLayout) || '';
        const rootCollection = new LayoutRootNodeCollection(
          currentLayout as keyof typeof asNodes,
          asNodes,
        );
        const componentId = context ? toComponentId(context) : 'no-component';
        const component =
          rootCollection.findComponentById(componentId) ||
          new NodeNotFoundWithoutContext(componentId);

        if (expectsFailure) {
          expect(() => {
            const expr = asExpression(expression);
            return evalExpr(expr as Expression, component, dataSources);
          }).toThrow(expectsFailure);
        } else {
          expect(evalExpr(expression, component, dataSources)).toEqual(expects);
        }
      },
    );
  });
});

describe('Expressions shared context tests', () => {
  const sharedTests = getSharedTests('context-lists');

  function contextSorter(
    a: SharedTestContext,
    b: SharedTestContext,
  ): -1 | 0 | 1 {
    if (a.component === b.component) {
      return 0;
    }

    return a.component > b.component ? 1 : -1;
  }

  function recurse(node: LayoutNode<any>, key: string): SharedTestContextList {
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
      ({
        layouts,
        dataModel,
        instanceContext,
        frontendSettings,
        expectedContexts,
      }) => {
        const dataSources: ContextDataSources = {
          formData: dataModel ? dot.dot(dataModel) : {},
          instanceContext: instanceContext || ({} as IInstanceContext),
          applicationSettings: frontendSettings || ({} as IApplicationSettings),
        };

        const foundContexts: SharedTestContextList[] = [];
        const _layouts = layouts || {};
        for (const key of Object.keys(_layouts)) {
          const repeatingGroups = getRepeatingGroups(
            _layouts[key].data.layout,
            dataSources.formData,
          );
          const nodes = nodesInLayout(
            _layouts[key].data.layout,
            repeatingGroups,
          );

          foundContexts.push({
            component: key,
            currentLayout: key,
            children: nodes.children().map((child) => recurse(child, key)),
          });
        }

        expect(foundContexts.sort(contextSorter)).toEqual(
          expectedContexts.sort(contextSorter),
        );
      },
    );
  });
});
