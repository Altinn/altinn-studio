import React from 'react';

import { jest } from '@jest/globals';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { SummaryGroupComponent } from 'src/layout/Group/SummaryGroupComponent';
import { renderWithNode } from 'src/test/renderWithProviders';
import { useNode } from 'src/utils/layout/NodesContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

describe('SummaryGroupComponent', () => {
  let mockHandleDataChange: () => void;

  beforeEach(() => {
    mockHandleDataChange = jest.fn();
  });

  test('SummaryGroupComponent -- should match snapshot', async () => {
    const { asFragment } = await render();
    expect(asFragment()).toMatchSnapshot();
  });

  function TestComponent({ groupId }: { groupId: string }) {
    const groupNode = useNode(groupId);
    if (!groupNode || !groupNode.isType('Group')) {
      throw new Error('Group node not found or wrong type');
    }

    return (
      <SummaryGroupComponent
        changeText='Change'
        onChangeClick={mockHandleDataChange}
        targetNode={groupNode}
      />
    );
  }

  async function render() {
    return await renderWithNode<true, LayoutNode<'Summary'>>({
      nodeId: 'mySummary',
      inInstance: true,
      renderer: () => <TestComponent groupId='groupComponent' />,
      queries: {
        fetchFormData: async () => ({
          mockGroup: {
            mockDataBinding1: '1',
            mockDataBinding2: '2',
          },
        }),
        fetchLayouts: async () => ({
          FormLayout: {
            data: {
              layout: [
                {
                  type: 'Group',
                  id: 'groupComponent',
                  textResourceBindings: {
                    title: 'mockGroupTitle',
                  },
                  children: ['mockId1', 'mockId2'],
                },
                {
                  type: 'Input',
                  id: 'mockId1',
                  dataModelBindings: {
                    simpleBinding: { dataType: defaultDataTypeMock, field: 'mockGroup.mockDataBinding1' },
                  },
                  readOnly: false,
                  required: false,
                  textResourceBindings: {
                    title: 'mockField1',
                  },
                },
                {
                  type: 'Input',
                  id: 'mockId2',
                  dataModelBindings: {
                    simpleBinding: { dataType: defaultDataTypeMock, field: 'mockGroup.mockDataBinding2' },
                  },
                  readOnly: false,
                  required: false,
                  textResourceBindings: {
                    title: 'mockField2',
                  },
                },
                {
                  type: 'Summary',
                  id: 'mySummary',
                  componentRef: 'groupComponent',
                  largeGroup: false,
                },
              ],
            },
          },
        }),
        fetchTextResources: () =>
          Promise.resolve({
            language: 'nb',
            resources: [
              { id: 'mockGroupTitle', value: 'Mock group' },
              { id: 'mockField1', value: 'Mock field 1' },
              { id: 'mockField2', value: 'Mock field 2' },
            ],
          }),
      },
    });
  }
});
