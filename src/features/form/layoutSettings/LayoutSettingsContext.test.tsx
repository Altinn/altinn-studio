import React from 'react';

import { screen } from '@testing-library/dom';

import { getLayoutSetsMock } from 'src/__mocks__/getLayoutSetsMock';
import {
  usePageGroups,
  usePageSettings,
  useRawPageOrder,
} from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type {
  ILayoutSets,
  ILayoutSettings,
  NavigationPageGroup,
  NavigationReceipt,
  NavigationTask,
} from 'src/layout/common.generated';

describe('LayoutSettingsContext', () => {
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
  async function render({
    renderer,
    order,
    groups,
    taskNavigation,
    overrideTaskNavigation,
  }: {
    renderer: () => React.ReactElement;
    order?: string[];
    groups?: Omit<NavigationPageGroup, 'id'>[];
    taskNavigation?: (Omit<NavigationTask, 'id'> | Omit<NavigationReceipt, 'id'>)[];
    overrideTaskNavigation?: (Omit<NavigationTask, 'id'> | Omit<NavigationReceipt, 'id'>)[];
  }) {
    return renderWithInstanceAndLayout({
      renderer,
      initialPage: order?.[0] ?? groups?.[0].order[0],
      queries: {
        fetchLayoutSettings: async () =>
          ({
            pages: {
              ...(order && { order }),
              ...(groups && { groups }),
              ...(overrideTaskNavigation && { taskNavigation: overrideTaskNavigation }),
            },
          }) as ILayoutSettings,
        fetchLayoutSets: async () =>
          ({
            ...getLayoutSetsMock(),
            ...(taskNavigation && {
              uiSettings: { taskNavigation },
            }),
          }) as ILayoutSets,
      },
    });
  }

  describe('useRawPageOrder()', () => {
    const UseRawPageOrder = () =>
      useRawPageOrder().map((page) => (
        <p
          key={page}
          data-testid='page'
        >
          {page}
        </p>
      ));

    it('returns regular page order', async () => {
      await render({ renderer: () => <UseRawPageOrder />, order: ['first', 'second', 'third', 'fourth'] });
      expect(screen.getAllByTestId('page')).toHaveLength(4);
      expect(screen.getAllByTestId('page')[0]).toHaveTextContent('first');
      expect(screen.getAllByTestId('page')[1]).toHaveTextContent('second');
      expect(screen.getAllByTestId('page')[2]).toHaveTextContent('third');
      expect(screen.getAllByTestId('page')[3]).toHaveTextContent('fourth');
    });

    it('returns page order inferred from grouped navigation', async () => {
      await render({
        renderer: () => <UseRawPageOrder />,
        groups: [
          { order: ['first'], type: 'info' },
          { order: ['second', 'third'], markWhenCompleted: true },
          { order: ['fourth'] },
        ],
      });
      expect(screen.getAllByTestId('page')).toHaveLength(4);
      expect(screen.getAllByTestId('page')[0]).toHaveTextContent('first');
      expect(screen.getAllByTestId('page')[1]).toHaveTextContent('second');
      expect(screen.getAllByTestId('page')[2]).toHaveTextContent('third');
      expect(screen.getAllByTestId('page')[3]).toHaveTextContent('fourth');
    });
  });

  describe('usePageGroups()', () => {
    const UsePageGroups = () => {
      const groups = usePageGroups();
      return (
        <>
          <p data-testid='hasGroups'>{groups !== undefined ? 'true' : 'false'}</p>
          {groups?.map((group) => (
            <p
              key={group.id}
              data-testid='group-id'
            >
              {group.id}
            </p>
          ))}
          {groups?.map((group) => (
            <p
              key={group.id}
              data-testid='group-order'
            >
              {group.order.join(',')}
            </p>
          ))}
        </>
      );
    };

    it('should return undefined when using regular order', async () => {
      await render({ renderer: () => <UsePageGroups />, order: ['first', 'second', 'third', 'fourth'] });
      expect(screen.getByTestId('hasGroups')).toHaveTextContent('false');
      expect(screen.queryByTestId('group')).not.toBeInTheDocument();
    });

    it('should generate a unique id', async () => {
      await render({
        renderer: () => <UsePageGroups />,
        groups: [
          { order: ['first'], type: 'info' },
          { order: ['second', 'third'], markWhenCompleted: true },
          { order: ['fourth'] },
        ],
      });
      expect(screen.getByTestId('hasGroups')).toHaveTextContent('true');
      expect(screen.getAllByTestId('group-id')).toHaveLength(3);
      expect(screen.getAllByTestId('group-order')).toHaveLength(3);
      expect(screen.getAllByTestId('group-id')[0]).toHaveTextContent(UUID);
      expect(screen.getAllByTestId('group-order')[0]).toHaveTextContent('first');
      expect(screen.getAllByTestId('group-id')[1]).toHaveTextContent(UUID);
      expect(screen.getAllByTestId('group-order')[1]).toHaveTextContent('second,third');
      expect(screen.getAllByTestId('group-id')[2]).toHaveTextContent(UUID);
      expect(screen.getAllByTestId('group-order')[2]).toHaveTextContent('fourth');
    });
  });

  describe('usePageSettings().taskNavigation', () => {
    const UseTaskNavigation = () => {
      const taskNavigation = usePageSettings().taskNavigation;
      return (
        <>
          {taskNavigation.map((taskGroup) => (
            <p
              key={taskGroup.id}
              data-testid='task-group-id'
            >
              {taskGroup.id}
            </p>
          ))}
          {taskNavigation.map((taskGroup) => (
            <p
              key={taskGroup.id}
              data-testid='task-group-name'
            >
              {taskGroup.name}
            </p>
          ))}
        </>
      );
    };

    it('returns empy array when not specified', async () => {
      await render({ renderer: () => <UseTaskNavigation />, order: ['first'] });
      expect(screen.queryByTestId('task-group-id')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-group-name')).not.toBeInTheDocument();
    });

    it('returns value from layout-sets', async () => {
      await render({
        renderer: () => <UseTaskNavigation />,
        order: ['first'],
        taskNavigation: [
          { taskId: 'task1', name: 'utfylling' },
          { type: 'receipt', name: 'kvittering' },
        ],
      });
      expect(screen.getAllByTestId('task-group-id')).toHaveLength(2);
      expect(screen.getAllByTestId('task-group-name')).toHaveLength(2);
      expect(screen.getAllByTestId('task-group-id')[0]).toHaveTextContent(UUID);
      expect(screen.getAllByTestId('task-group-name')[0]).toHaveTextContent('utfylling');
      expect(screen.getAllByTestId('task-group-id')[1]).toHaveTextContent(UUID);
      expect(screen.getAllByTestId('task-group-name')[1]).toHaveTextContent('kvittering');
    });

    it('returns value from settings', async () => {
      await render({
        renderer: () => <UseTaskNavigation />,
        order: ['first'],
        taskNavigation: [
          { taskId: 'task1', name: 'utfylling' },
          { type: 'receipt', name: 'kvittering' },
        ],
        overrideTaskNavigation: [{ taskId: 'task1', name: 'personopplysninger' }],
      });
      expect(screen.getAllByTestId('task-group-id')).toHaveLength(1);
      expect(screen.getAllByTestId('task-group-name')).toHaveLength(1);
      expect(screen.getAllByTestId('task-group-id')[0]).toHaveTextContent(UUID);
      expect(screen.getAllByTestId('task-group-name')[0]).toHaveTextContent('personopplysninger');
    });
  });
});
