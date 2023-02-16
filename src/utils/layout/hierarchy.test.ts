import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { getRepeatingGroups } from 'src/utils/formLayout';
import {
  layoutAsHierarchy,
  layoutAsHierarchyWithRows,
  LayoutNode,
  LayoutRootNode,
  LayoutRootNodeCollection,
  nodesInLayout,
  resolvedLayoutsFromState,
  resolvedNodesInLayouts,
} from 'src/utils/layout/hierarchy';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayoutCompHeader } from 'src/layout/Header/types';
import type { ILayoutCompInput } from 'src/layout/Input/types';
import type { ILayout } from 'src/layout/layout';
import type { IRepeatingGroups } from 'src/types';
import type { AnyNode } from 'src/utils/layout/hierarchy.types';

describe('Hierarchical layout tools', () => {
  const header: Omit<ILayoutCompHeader, 'id'> = { type: 'Header', size: 'L' };
  const input: Omit<ILayoutCompInput, 'id'> = {
    type: 'Input',
    hidden: ['equals', ['dataModel', 'Model.ShouldBeTrue'], 'true'],
  };
  const group: Omit<ILayoutGroup, 'id' | 'children'> = { type: 'Group' };
  const repGroup: Omit<ILayoutGroup, 'id' | 'children'> = {
    type: 'Group',
    maxCount: 3,
    hidden: ['equals', ['dataModel', 'Model.ShouldBeFalse'], 'false'],
  };
  const components = {
    top1: { id: 'top1', ...header },
    top2: { id: 'top2', ...input },
    group1: { id: 'group1', ...group },
    group1h: { id: 'group1_header', ...header },
    group1i: { id: 'group1_input', ...input },
    group2: {
      id: 'group2',
      dataModelBindings: {
        group: 'MyModel.Group2',
      },
      ...repGroup,
    },
    group2h: { id: 'group2_header', ...header },
    group2i: {
      id: 'group2_input',
      ...input,
      dataModelBindings: {
        simpleBinding: 'MyModel.Group2.Input',
      },
    },
    group2n: {
      id: 'group2nested',
      ...repGroup,
      dataModelBindings: {
        group: 'MyModel.Group2.Nested',
      },
    },
    group2nh: { id: 'group2nested_header', ...header },
    group2ni: {
      id: 'group2nested_input',
      ...input,
      dataModelBindings: {
        simpleBinding: 'MyModel.Group2.Nested.Input',
      },
    },
    group3: {
      id: 'group3',
      ...repGroup,
      edit: {
        multiPage: true,
        filter: [
          { key: 'start', value: '1' },
          { key: 'stop', value: '2' },
        ],
      },
    } as Omit<ILayoutGroup, 'children'>,
    group3h: { id: 'group3_header', ...header },
    group3i: { id: 'group3_input', ...input },
    group3n: { id: 'group3nested', ...repGroup },
    group3nh: { id: 'group3nested_header', ...header },
    group3ni: { id: 'group3nested_input', ...input },
  };

  const layout: ILayout = [
    components.top1,
    components.top2,
    {
      ...components.group1,
      children: [components.group1h.id, components.group1i.id],
    },
    components.group1h,
    components.group1i,
    {
      ...components.group2,
      children: [components.group2h.id, components.group2i.id, components.group2n.id],
    },
    components.group2h,
    components.group2i,
    {
      ...components.group2n,
      children: [components.group2nh.id, components.group2ni.id],
    },
    components.group2nh,
    components.group2ni,
    {
      ...components.group3,
      children: [`0:${components.group3h.id}`, `1:${components.group3i.id}`, `2:${components.group3n.id}`],
    },
    components.group3h,
    components.group3i,
    {
      ...components.group3n,
      children: [components.group3nh.id, components.group3ni.id],
    },
    components.group3nh,
    components.group3ni,
  ];
  const layouts = { FormLayout: layout };

  describe('layoutAsHierarchy', () => {
    it('should turn a layout into a hierarchy', () => {
      const result = layoutAsHierarchy(layout);
      expect(result).toEqual([
        components.top1,
        components.top2,
        {
          ...components.group1,
          childComponents: [components.group1h, components.group1i],
        },
        {
          ...components.group2,
          childComponents: [
            components.group2h,
            components.group2i,
            {
              ...components.group2n,
              childComponents: [components.group2nh, components.group2ni],
            },
          ],
        },
        {
          ...components.group3,
          childComponents: [
            {
              ...components.group3h,
              multiPageIndex: 0,
            },
            {
              ...components.group3i,
              multiPageIndex: 1,
            },
            {
              ...components.group3n,
              childComponents: [components.group3nh, components.group3ni],
              multiPageIndex: 2,
            },
          ],
        },
      ]);
    });
  });

  const repeatingGroups: IRepeatingGroups = {
    [components.group2.id]: {
      index: 1,
      baseGroupId: components.group2.id,
    },
    [`${components.group2n.id}-0`]: {
      index: 1,
      baseGroupId: components.group2n.id,
    },
    [`${components.group2n.id}-1`]: {
      index: 0,
      baseGroupId: components.group2n.id,
    },
  };

  const manyRepeatingGroups: IRepeatingGroups = {
    [components.group2.id]: {
      index: 3,
      baseGroupId: components.group2.id,
    },
    [`${components.group2n.id}-0`]: {
      index: 3,
      baseGroupId: components.group2n.id,
    },
    [`${components.group2n.id}-1`]: {
      index: 3,
      baseGroupId: components.group2n.id,
    },
    [`${components.group2n.id}-2`]: {
      index: 3,
      baseGroupId: components.group2n.id,
    },
    [`${components.group2n.id}-3`]: {
      index: 3,
      baseGroupId: components.group2n.id,
    },
    [components.group3.id]: {
      index: 4,
    },
    [`${components.group3n.id}-0`]: {
      index: 4,
      baseGroupId: components.group3n.id,
    },
    [`${components.group3n.id}-1`]: {
      index: 4,
      baseGroupId: components.group3n.id,
    },
    [`${components.group3n.id}-2`]: {
      index: 4,
      baseGroupId: components.group3n.id,
    },
    [`${components.group3n.id}-3`]: {
      index: 4,
      baseGroupId: components.group3n.id,
    },
  };

  describe('layoutAsHierarchyWithRows', () => {
    it('should generate a hierarchy for a simple layout', () => {
      const commonComponents = (row: number) => [
        {
          ...components.group2h,
          id: `${components.group2h.id}-${row}`,
          baseComponentId: components.group2h.id,
        },
        {
          ...components.group2i,
          id: `${components.group2i.id}-${row}`,
          baseComponentId: components.group2i.id,
          dataModelBindings: {
            simpleBinding: `MyModel.Group2[${row}].Input`,
          },
          baseDataModelBindings: components.group2i.dataModelBindings,
        },
      ];

      const nestedComponents = (row: number, nestedRow: number) => [
        {
          ...components.group2nh,
          id: `${components.group2nh.id}-${row}-${nestedRow}`,
          baseComponentId: components.group2nh.id,
        },
        {
          ...components.group2ni,
          id: `${components.group2ni.id}-${row}-${nestedRow}`,
          baseComponentId: components.group2ni.id,
          dataModelBindings: {
            simpleBinding: `MyModel.Group2[${row}].Nested[${nestedRow}].Input`,
          },
          baseDataModelBindings: components.group2ni.dataModelBindings,
        },
      ];

      const result = layoutAsHierarchyWithRows(layout, repeatingGroups);
      expect(result).toEqual([
        components.top1,
        components.top2,
        {
          ...components.group1,
          // This group is not repeating, so it should not output any rows:
          childComponents: [components.group1h, components.group1i],
        },
        {
          ...components.group2,
          rows: [
            {
              index: 0,
              items: [
                ...commonComponents(0),
                {
                  ...components.group2n,
                  id: `${components.group2n.id}-0`,
                  baseComponentId: components.group2n.id,
                  baseDataModelBindings: components.group2n.dataModelBindings,
                  dataModelBindings: { group: 'MyModel.Group2[0].Nested' },
                  rows: [
                    {
                      index: 0,
                      items: nestedComponents(0, 0),
                    },
                    {
                      index: 1,
                      items: nestedComponents(0, 1),
                    },
                  ],
                },
              ],
            },
            {
              index: 1,
              items: [
                ...commonComponents(1),
                {
                  ...components.group2n,
                  id: `${components.group2n.id}-1`,
                  baseComponentId: components.group2n.id,
                  baseDataModelBindings: components.group2n.dataModelBindings,
                  dataModelBindings: { group: 'MyModel.Group2[1].Nested' },
                  rows: [
                    {
                      index: 0,
                      items: nestedComponents(1, 0),
                    },
                  ],
                },
              ],
            },
          ],
        },
        { ...components.group3, rows: [] },
      ]);
    });
  });

  describe('nodesInLayout', () => {
    it('should resolve a very simple layout', () => {
      const root = new LayoutRootNode();
      const top1 = new LayoutNode(components.top1, root, root);
      const top2 = new LayoutNode(components.top2, root, root);
      root._addChild(top1);
      root._addChild(top2);

      const result = nodesInLayout([components.top1, components.top2], {});
      expect(result).toEqual(root);
    });

    it('should resolve a complex layout without groups', () => {
      const nodes = nodesInLayout(layout, repeatingGroups);
      const flatNoGroups = nodes.flat(false);
      expect(flatNoGroups.map((n) => n.item.id)).toEqual([
        // Top-level nodes:
        components.top1.id,
        components.top2.id,
        components.group1h.id,
        components.group1i.id,

        // First row in group2
        `${components.group2h.id}-0`,
        `${components.group2i.id}-0`,
        `${components.group2nh.id}-0-0`,
        `${components.group2ni.id}-0-0`,
        `${components.group2nh.id}-0-1`,
        `${components.group2ni.id}-0-1`,

        // Second row in group2
        `${components.group2h.id}-1`,
        `${components.group2i.id}-1`,
        `${components.group2nh.id}-1-0`,
        `${components.group2ni.id}-1-0`,

        // Note: No group components
        // Note: No rows in group 3
      ]);
    });

    it('should resolve a complex layout with groups', () => {
      const nodes = nodesInLayout(layout, repeatingGroups);
      const flatWithGroups = nodes.flat(true);
      expect(flatWithGroups.map((n) => n.item.id)).toEqual([
        // Top-level nodes:
        components.top1.id,
        components.top2.id,
        components.group1h.id,
        components.group1i.id,
        components.group1.id,

        // First row in group2
        `${components.group2h.id}-0`,
        `${components.group2i.id}-0`,
        `${components.group2nh.id}-0-0`,
        `${components.group2ni.id}-0-0`,
        `${components.group2nh.id}-0-1`,
        `${components.group2ni.id}-0-1`,
        `${components.group2n.id}-0`,

        // Second row in group2
        `${components.group2h.id}-1`,
        `${components.group2i.id}-1`,
        `${components.group2nh.id}-1-0`,
        `${components.group2ni.id}-1-0`,
        `${components.group2n.id}-1`,

        components.group2.id,
        components.group3.id,
      ]);
    });

    it('should enable traversal of layout', () => {
      const nodes = nodesInLayout(layout, manyRepeatingGroups);
      const flatWithGroups = nodes.flat(true);
      const deepComponent = flatWithGroups.find((node) => node.item.id === `${components.group2nh.id}-2-2`);
      expect(deepComponent?.item.id).toEqual(`${components.group2nh.id}-2-2`);
      expect(deepComponent?.parent?.item?.id).toEqual(`${components.group2n.id}-2`);
      expect(deepComponent?.parent?.item.type).toEqual(`Group`);
      expect(deepComponent?.closest((c) => c.type === 'Input')?.item.id).toEqual(`${components.group2ni.id}-2-2`);

      expect(nodes.findAllById(components.group2ni.id).map((c) => c.item.id)).toEqual([
        `${components.group2ni.id}-0-0`,
        `${components.group2ni.id}-0-1`,
        `${components.group2ni.id}-0-2`,
        `${components.group2ni.id}-0-3`,
        `${components.group2ni.id}-1-0`,
        `${components.group2ni.id}-1-1`,
        `${components.group2ni.id}-1-2`,
        `${components.group2ni.id}-1-3`,
        `${components.group2ni.id}-2-0`,
        `${components.group2ni.id}-2-1`,
        `${components.group2ni.id}-2-2`,
        `${components.group2ni.id}-2-3`,
        `${components.group2ni.id}-3-0`,
        `${components.group2ni.id}-3-1`,
        `${components.group2ni.id}-3-2`,
        `${components.group2ni.id}-3-3`,
      ]);

      expect(nodes.findAllById(components.group3ni.id).map((c) => c.item.id)).toEqual([
        `${components.group3ni.id}-1-0`,
        `${components.group3ni.id}-1-1`,
        `${components.group3ni.id}-1-2`,
        `${components.group3ni.id}-1-3`,
        `${components.group3ni.id}-1-4`,
      ]);

      expect(nodes.findById(components.group2ni.id)?.item.id).toEqual(`${components.group2ni.id}-0-0`);
      expect(nodes.findById(`${components.group2ni.id}-1-1`)?.item.id).toEqual(`${components.group2ni.id}-1-1`);

      const otherDeepComponent = nodes.findById(`${components.group2nh.id}-3-3`);
      expect(otherDeepComponent?.closest((c) => c.type === 'Input')?.item.id).toEqual(`${components.group2ni.id}-3-3`);
      expect(otherDeepComponent?.closest((c) => c.type === 'Group')?.item.id).toEqual(`${components.group2n.id}-3`);
      expect(otherDeepComponent?.closest((c) => c.baseComponentId === components.group2i.id)?.item.id).toEqual(
        `${components.group2i.id}-3`,
      );
      expect(otherDeepComponent?.closest((c) => c.id === components.top1.id)?.item.id).toEqual(components.top1.id);

      const insideNonRepeatingGroup = nodes.findById(components.group1i.id);
      expect(insideNonRepeatingGroup?.closest((n) => n.id === components.group1h.id)?.item.id).toEqual(
        components.group1h.id,
      );

      const group2 = flatWithGroups.find((node) => node.item.id === components.group2.id);
      expect(group2?.children((n) => n.type === 'Input')?.item.id).toEqual(`${components.group2i.id}-0`);
      expect(group2?.children((n) => n.type === 'Input', 1)?.item.id).toEqual(`${components.group2i.id}-1`);

      expect(otherDeepComponent?.closest((c) => c.id === 'not-found')).toBeUndefined();
    });

    it('should support indexes when using start/stop in groups', () => {
      const dataModel = {
        'Group[0].Title': 'title0',
        'Group[1].Title': 'title1',
        'Group[2].Title': 'title2',
        'Group[3].Title': 'title3',
        'Group[4].Title': 'title4',
        'Group[5].Title': 'title5',
        'Group[6].Title': 'title6',
        'Group[7].Title': 'title7',
        'Group[8].Title': 'title8',
      };
      const layout: ILayout = [
        {
          id: 'g1',
          type: 'Group',
          maxCount: 99,
          children: ['g1c'],
          dataModelBindings: { group: 'Group' },
          edit: {
            filter: [
              { key: 'start', value: '0' },
              { key: 'stop', value: '3' },
            ],
          },
        },
        {
          id: 'g1c',
          type: 'Input',
          dataModelBindings: { simpleBinding: 'Group.Title' },
        },
        {
          id: 'g2',
          type: 'Group',
          maxCount: 99,
          children: ['g2c'],
          dataModelBindings: { group: 'Group' },
          edit: {
            filter: [
              { key: 'start', value: '3' },
              { key: 'stop', value: '6' },
            ],
          },
        },
        {
          id: 'g2c',
          type: 'Input',
          dataModelBindings: { simpleBinding: 'Group.Title' },
        },
      ];
      const nodes = nodesInLayout(layout, getRepeatingGroups(layout, dataModel));

      expect(nodes.findAllById('g1c').length).toEqual(3);
      expect(nodes.findAllById('g2c').length).toEqual(3);

      expect(nodes.findById('g1c-0')?.rowIndex).toEqual(0);
      expect(nodes.findById('g2c-3')?.rowIndex).toEqual(3);
    });
  });

  describe('resolvedNodesInLayout', () => {
    const dataSources: ContextDataSources = {
      formData: {
        'Model.ShouldBeTrue': 'true',
        'Model.ShouldBeFalse': 'false',
      },
      instanceContext: {
        instanceId: 'test',
        instanceOwnerPartyId: 'test',
        appId: 'test',
        instanceOwnerPartyType: 'unknown',
      },
      applicationSettings: {},
      hiddenFields: new Set(),
    };

    const nodes = resolvedNodesInLayouts(layouts, 'FormLayout', repeatingGroups, dataSources);

    const topInput = nodes.findById(components.top2.id);
    const group2 = nodes.findById(components.group2.id);
    const group2i = nodes.findById(`${components.group2i.id}-0`);
    const group2ni = nodes.findById(`${components.group2ni.id}-0-1`);

    function uniqueHidden(nodes: AnyNode<any>[] | undefined): any[] | undefined {
      if (!nodes) {
        return undefined;
      }

      return [...new Set(nodes.map((n) => n.item.hidden))].sort();
    }
    const plain = [true, undefined];

    // Tests to make sure all children also have their expressions resolved
    expect(topInput?.item.hidden).toEqual(true);
    expect(group2i?.item.hidden).toEqual(true);
    expect(group2ni?.item.hidden).toEqual(true);
    expect(group2i?.parent.item.hidden).toEqual(true);
    expect(group2ni?.parent.parent.item.hidden).toEqual(true);
    expect(uniqueHidden(group2?.children())).toEqual(plain);
    expect(uniqueHidden(group2i?.parent.children())).toEqual(plain);
    expect(uniqueHidden(group2ni?.parent.children())).toEqual(plain);
    expect(uniqueHidden(group2ni?.parent.parent.children())).toEqual(plain);
    expect(uniqueHidden(group2?.flat(true))).toEqual(plain);
    expect(uniqueHidden(group2?.flat(false))).toEqual(plain);
    expect(uniqueHidden(nodes.current()?.flat(true))).toEqual(plain);
    expect(uniqueHidden(nodes.current()?.children())).toEqual(plain);

    if (group2?.item.type === 'Group' && 'rows' in group2.item) {
      expect(group2.item.rows[0]?.items[1].hidden).toEqual(true);
      expect(group2.item.rows[0]?.items[2].hidden).toEqual(true);
      const group2n = group2.item.rows[0]?.items[2];
      if (group2n?.type === 'Group' && 'rows' in group2n) {
        expect(group2n.rows[0]?.items[1].hidden).toEqual(true);
      } else {
        expect(false).toEqual(true);
      }
    } else {
      expect(false).toEqual(true);
    }
  });

  describe('LayoutRootNodeCollection', () => {
    const layout1: ILayout = [components.top1, components.top2];

    const layout2: ILayout = [
      { ...components.top1, readOnly: true },
      { ...components.top2, readOnly: true },
    ];

    const layouts = {
      l1: nodesInLayout(layout1, {}),
      l2: nodesInLayout(layout2, {}),
    };

    const collection1 = new LayoutRootNodeCollection('l1', layouts);
    const collection2 = new LayoutRootNodeCollection('l2', layouts);

    it('should find the component in the current layout first', () => {
      expect(collection1?.findById(components.top1.id)?.item.readOnly).toBeUndefined();
      expect(collection2?.findById(components.top1.id)?.item.readOnly).toEqual(true);
    });

    it('should find the current layout', () => {
      expect(collection1.current()).toEqual(layouts['l1']);
      expect(collection2.current()).toEqual(layouts['l2']);
    });

    it('should find a named layout', () => {
      expect(collection1.findLayout('l1')).toEqual(layouts['l1']);
      expect(collection1.findLayout('l2')).toEqual(layouts['l2']);
    });

    it('should find all components in multiple layouts', () => {
      expect(collection1.findAllById(components.top1.id).map((c) => c.item.id)).toEqual([
        components.top1.id,
        components.top1.id,
      ]);
    });
  });

  describe('transposeDataModel', () => {
    const nodes = nodesInLayout(layout, manyRepeatingGroups);
    const inputNode = nodes.findById(`${components.group2ni.id}-2-2`);
    const topHeaderNode = nodes.findById(components.top1.id);

    expect(inputNode?.transposeDataModel('MyModel.Group2.Nested.Age')).toEqual('MyModel.Group2[2].Nested[2].Age');
    expect(inputNode?.transposeDataModel('MyModel.Group2.Other.Parents')).toEqual('MyModel.Group2[2].Other.Parents');

    const headerNode = nodes.findById(`${components.group2nh.id}-2-2`);

    // Header component does not have any data binding, but its parent does
    expect(headerNode?.transposeDataModel('MyModel.Group2.Nested.Age')).toEqual('MyModel.Group2[2].Nested[2].Age');

    // Existing indexes are not removed:
    expect(headerNode?.transposeDataModel('MyModel.Group2[1].Nested[1].Age')).toEqual(
      'MyModel.Group2[1].Nested[1].Age',
    );
    expect(headerNode?.transposeDataModel('MyModel.Group2.Nested[1].Age')).toEqual('MyModel.Group2[2].Nested[1].Age');

    // This is a broken reference: We cannot know exactly which row in the nested
    // group you want to refer to, as you never specified:
    expect(headerNode?.transposeDataModel('MyModel.Group2[3].Nested.Age')).toEqual('MyModel.Group2[3].Nested.Age');

    // This still doesn't make sense. Even though we're on the same row now, we should behave the same all the time
    // and fail to resolve the nested row.
    expect(headerNode?.transposeDataModel('MyModel.Group2[2].Nested.Age')).toEqual('MyModel.Group2[2].Nested.Age');

    // Tricks to make sure we don't just compare using startsWith()
    expect(inputNode?.transposeDataModel('MyModel.Group22.NestedOtherValue.Key')).toEqual(
      'MyModel.Group22.NestedOtherValue.Key',
    );
    expect(inputNode?.transposeDataModel('MyModel.Gro.Nes[1].Key')).toEqual('MyModel.Gro.Nes[1].Key');
    expect(inputNode?.transposeDataModel('MyModel.Gro[0].Nes.Key')).toEqual('MyModel.Gro[0].Nes.Key');

    // There are no data model bindings in group3, so this should not do anything
    expect(nodes?.findById(`${components.group3ni.id}-1-1`)?.transposeDataModel('Main.Parent[0].Child[1]')).toEqual(
      'Main.Parent[0].Child[1]',
    );

    // This component doesn't have any repeating group reference point, so it cannot
    // provide any insights (but it should not fail)
    expect(topHeaderNode?.transposeDataModel('MyModel.Group2.Nested.Age')).toEqual('MyModel.Group2.Nested.Age');
  });

  describe('find functions', () => {
    const state = getInitialStateMock();
    (state.formLayout.layouts as any)['page2'] = layout;
    state.formLayout.uiConfig.repeatingGroups = manyRepeatingGroups;
    const resolved = resolvedLayoutsFromState(state);

    const field3 = resolved.findById('field3');
    expect(field3?.item.id).toEqual('field3');

    const nested = resolved.findById(components.group2ni.id);
    expect(nested?.item.id).toEqual('group2nested_input-0-0');
    expect(nested?.closest((i) => i.id === components.top1.id)?.item.id).toEqual(components.top1.id);

    // Using 'closest' across pages
    expect(nested?.closest((i) => i.id === 'field3')?.item.id).toEqual('field3');

    // Using 'findById' on the wrong page
    expect(resolved.findLayout('page2')?.findById('field3')?.item.id).toEqual('field3');
    expect(field3?.top.findAllById(components.group2i.id).map((i) => i.item.id)).toEqual([
      'group2_input-0',
      'group2_input-1',
      'group2_input-2',
      'group2_input-3',
    ]);
  });
});
