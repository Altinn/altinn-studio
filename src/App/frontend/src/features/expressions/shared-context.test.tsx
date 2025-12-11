import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getSharedTests } from 'src/features/expressions/shared';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { SharedTestContext, SharedTestContextList } from 'src/features/expressions/shared';
import type { NodesContext } from 'src/utils/layout/NodesContext';

function contextSorter(a: SharedTestContext, b: SharedTestContext): -1 | 0 | 1 {
  if (a.component === b.component) {
    return 0;
  }

  return a.component > b.component ? 1 : -1;
}

function recurse(state: NodesContext, nodeId: string, pageKey: string): SharedTestContextList {
  const splitKey = splitDashedKey(nodeId);
  const context: SharedTestContextList = {
    component: splitKey.baseComponentId,
    currentLayout: pageKey,
  };
  const children = Object.values(state.nodeData)
    .filter((n) => n.parentId === nodeId)
    .map((n) => recurse(state, n.id, pageKey));
  if (children.length) {
    context.children = children;
  }
  if (splitKey.depth.length) {
    context.rowIndices = splitKey.depth;
  }

  return context;
}

function TestContexts() {
  const contexts = NodesInternal.useMemoSelector((state) => {
    const contexts: SharedTestContextList[] = [];
    for (const page of Object.values(state.pagesData.pages)) {
      contexts.push({
        component: page.pageKey,
        currentLayout: page.pageKey,
        children: Object.values(state.nodeData)
          .filter((n) => n.pageKey === page.pageKey && n.parentId === undefined)
          .map((n) => recurse(state, n.id, page.pageKey)),
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
        jest.mocked(fetchApplicationMetadata).mockImplementation(async () => applicationMetadata);

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

        await renderWithInstanceAndLayout({
          renderer: () => <TestContexts />,
          queries: {
            fetchLayouts: async () => layouts!,
            // TODO(Datamodels): add support for multiple data models
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
