import React from 'react';
import { Provider } from 'react-redux';

import { renderHook } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/mocks';
import { setupStore } from 'src/store';
import { useLayoutsAsNodes } from 'src/utils/layout/useLayoutsAsNodes';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { ILayouts } from 'src/layout/layout';
import type { IRepeatingGroups } from 'src/types';

const mockLayouts: ILayouts = {
  page1: [
    {
      id: 'comp1',
      type: 'Input',
      dataModelBindings: { simpleBinding: 'topLevel' },
    },
    { id: 'duplicateComponent', type: 'Header', size: 'L' },
    {
      id: 'group1',
      type: 'Group',
      maxCount: 3,
      children: ['child1'],
      dataModelBindings: { group: 'group1' },
    },
    {
      id: 'child1',
      type: 'Input',
      dataModelBindings: { simpleBinding: 'group1.child1' },
      hidden: ['equals', ['dataModel', 'group1.isHidden'], 'true'],
    },
  ],
  page2: [
    { id: 'comp2', type: 'Input' },
    { id: 'duplicateComponent', type: 'Header', size: 'M' },
  ],
};

const mockRepGroups: IRepeatingGroups = {
  group1: {
    index: 1,
    editIndex: -1,
  },
};

interface RenderProps {
  currentView?: string;
  repeatingGroups?: IRepeatingGroups;
  layouts?: ILayouts;
  dataSources?: ContextDataSources;
}

function render(options: RenderProps = {}) {
  const { currentView = 'page1', repeatingGroups = mockRepGroups, layouts = mockLayouts, dataSources } = options;

  const state = getInitialStateMock();
  state.formLayout.uiConfig.currentView = currentView;
  state.formLayout.uiConfig.repeatingGroups = repeatingGroups;
  state.formLayout.layouts = layouts;
  const store = setupStore(state);

  const rendered = renderHook(() => useLayoutsAsNodes(dataSources), {
    wrapper: (props) => <Provider store={store}>{props.children}</Provider>,
  });

  return {
    ...rendered,
    store,
  };
}

describe('useLayoutsAsNodes', () => {
  it('should generate recursive layouts', () => {
    const { result } = render();
    const component = result.current.findById('duplicateComponent');
    expect(component?.item.type === 'Header' && component.item.size === 'L').toEqual(true);
  });

  it("should understand which page it's on", () => {
    const { result } = render({ currentView: 'page2' });
    const component = result.current.findById('duplicateComponent');
    expect(component?.item.type === 'Header' && component.item.size === 'M').toEqual(true);
  });

  it('should not try to resolve layout expressions when dataSources is undefined', () => {
    const { result } = render();
    const component = result.current.findById('child1');
    expect(typeof component?.item.hidden).toEqual('object');
  });

  it('should resolve layout expressions when dataSources it set', () => {
    const { result } = render({
      dataSources: {
        formData: {
          'group1[0].isHidden': 'true',
          'group1[1].isHidden': 'false',
        },
      } as unknown as ContextDataSources,
    });
    expect(result.current.findById('child1-0')?.item.hidden).toEqual(true);
    expect(result.current.findById('child1-1')?.item.hidden).toEqual(false);
  });
});
