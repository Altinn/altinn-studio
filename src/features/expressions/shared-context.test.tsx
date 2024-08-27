import React from 'react';

import { screen } from '@testing-library/react';
import type { jest } from '@jest/globals';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getSharedTests } from 'src/features/expressions/shared';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import { useNodeTraversal } from 'src/utils/layout/useNodeTraversal';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { SharedTestContext, SharedTestContextList } from 'src/features/expressions/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeTraversalFromRoot } from 'src/utils/layout/useNodeTraversal';

function contextSorter(a: SharedTestContext, b: SharedTestContext): -1 | 0 | 1 {
  if (a.component === b.component) {
    return 0;
  }

  return a.component > b.component ? 1 : -1;
}

function recurse(t: NodeTraversalFromRoot, node: LayoutNode, key: string): SharedTestContextList {
  const splitKey = splitDashedKey(node.id);
  const context: SharedTestContextList = {
    component: splitKey.baseComponentId,
    currentLayout: key,
  };
  const children = t
    .with(node)
    .children()
    .map((child) => recurse(t, child, key));
  if (children.length) {
    context.children = children;
  }
  if (splitKey.depth.length) {
    context.rowIndices = splitKey.depth;
  }

  return context;
}

function TestContexts() {
  const contexts = useNodeTraversal((t) => {
    const contexts: SharedTestContextList[] = [];
    const pages = t.children();
    for (const page of pages) {
      const layout = t
        .with(page)
        .children()
        .map((child) => recurse(t, child, page.pageKey));
      contexts.push({
        component: page.pageKey,
        currentLayout: page.pageKey,
        children: layout,
      });
    }

    return contexts;
  });

  return <div data-testid='test-contexts'>{JSON.stringify(contexts)}</div>;
}

describe('Expressions shared context tests', () => {
  const sharedTests = getSharedTests('context-lists');

  describe.each(sharedTests.content)('$folderName', (folder) => {
    it.each(folder.content)(
      '$name',
      async ({
        layouts,
        dataModel,
        instanceDataElements,
        instance: _instance,
        frontendSettings,
        permissions,
        expectedContexts,
      }) => {
        const hasInstance = Boolean(_instance || instanceDataElements || permissions);

        const instance =
          _instance && instanceDataElements
            ? { ..._instance, data: [..._instance.data, ...instanceDataElements] }
            : !_instance && instanceDataElements
              ? getInstanceDataMock((i) => {
                  i.data = [...i.data, ...instanceDataElements];
                })
              : hasInstance
                ? getInstanceDataMock((i) => {
                    for (const key of Object.keys(_instance || {})) {
                      i[key] = _instance![key];
                    }
                  })
                : undefined;

        const applicationMetadata = getApplicationMetadataMock(instance ? {} : { onEntry: { show: 'stateless' } });
        if (instanceDataElements) {
          for (const element of instanceDataElements) {
            if (!applicationMetadata.dataTypes!.find((dt) => dt.id === element.dataType)) {
              applicationMetadata.dataTypes!.push({
                id: element.dataType,
                allowedContentTypes: null,
                minCount: 0,
                maxCount: 5,
              });
            }
          }
        }

        (fetchApplicationMetadata as jest.Mock<typeof fetchApplicationMetadata>).mockImplementation(() =>
          Promise.resolve(applicationMetadata),
        );

        await renderWithInstanceAndLayout({
          renderer: () => <TestContexts />,
          queries: {
            fetchLayouts: async () => layouts!,
            fetchFormData: async () => dataModel ?? {},
            ...(instance ? { fetchInstanceData: async () => instance } : {}),
            ...(frontendSettings ? { fetchApplicationSettings: async () => frontendSettings } : {}),
          },
        });

        const foundContexts = JSON.parse(screen.getByTestId('test-contexts').textContent!);
        expect(foundContexts.sort(contextSorter)).toEqual(expectedContexts.sort(contextSorter));
      },
    );
  });
});
