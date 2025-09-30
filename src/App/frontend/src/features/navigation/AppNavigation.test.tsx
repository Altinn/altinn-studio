import React from 'react';

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getLayoutSetsMock } from 'src/__mocks__/getLayoutSetsMock';
import { AppNavigation } from 'src/features/navigation/AppNavigation';
import { BackendValidationSeverity } from 'src/features/validation';
import * as UseNavigatePage from 'src/hooks/useNavigatePage';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type {
  ILayoutFile,
  ILayoutSets,
  ILayoutSettings,
  NavigationPageGroupMultiple,
  NavigationPageGroupSingle,
  NavigationReceipt,
  NavigationTask,
} from 'src/layout/common.generated';

const user = userEvent.setup({ delay: 100 });

describe('AppNavigation', () => {
  async function render({
    initialPage,
    hiddenPages,
    pagesWithError,
    order,
    groups,
    taskNavigation,
    overrideTaskNavigation,
  }: {
    initialPage?: string;
    hiddenPages?: string[];
    pagesWithError?: string[];
    order?: string[];
    groups?: (Omit<NavigationPageGroupMultiple, 'id'> | Omit<NavigationPageGroupSingle, 'id'>)[];
    taskNavigation?: (Omit<NavigationTask, 'id'> | Omit<NavigationReceipt, 'id'>)[];
    overrideTaskNavigation?: (Omit<NavigationTask, 'id'> | Omit<NavigationReceipt, 'id'>)[];
  }) {
    const rawOrder = order ?? groups?.flatMap((g) => g.order) ?? [];
    return renderWithInstanceAndLayout({
      renderer: () => <AppNavigation />,
      initialPage: initialPage ?? order?.[0] ?? groups?.[0].order[0],
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
        fetchLayouts: async () =>
          Object.fromEntries(
            rawOrder.map((page) => [
              page,
              {
                data: {
                  hidden: !!hiddenPages?.includes(page),
                  layout: [
                    {
                      id: `page-title-${page}`,
                      type: 'Header',
                      textResourceBindings: {
                        title: `Title for ${page}`,
                      },
                      size: 'L',
                    },
                    {
                      id: `input-${page}`,
                      type: 'Input',
                      textResourceBindings: {
                        title: `Input for ${page}`,
                      },
                      dataModelBindings: {
                        simpleBinding: `field-${page}`,
                      },
                      showValidations: ['All'],
                    },
                  ],
                },
              } as ILayoutFile,
            ]),
          ),
        fetchBackendValidations: async () =>
          pagesWithError?.map((page) => ({
            code: 'wrong format',
            severity: BackendValidationSeverity.Error,
            source: 'SomeCustomValidator',
            field: `field-${page}`,
          })) ?? [],
        fetchDataModelSchema: async () => ({
          type: 'object',
          properties: Object.fromEntries(
            rawOrder.map((page) => [
              `field-${page}`,
              {
                type: 'string',
              },
            ]),
          ),
        }),
        fetchFormData: async () => Object.fromEntries(rawOrder.map((page) => [`field-${page}`, 'some value'])),
      },
    });
  }

  it('single groups should not be expandable', async () => {
    await render({
      groups: [
        { order: ['first'], type: 'info' },
        { name: 'form', order: ['second', 'third'], markWhenCompleted: true },
        { order: ['fourth'] },
      ],
    });

    const first = screen.getByRole('button', { name: 'first' });
    expect(first).not.toHaveAttribute('aria-expanded');
    expect(within(first).queryByTestId('chevron')).not.toBeInTheDocument();

    const form = screen.getByRole('button', { name: 'form' });
    expect(form).toHaveAttribute('aria-expanded', 'false');
    expect(within(form).getByTestId('chevron')).toBeInTheDocument();

    const fourth = screen.getByRole('button', { name: 'fourth' });
    expect(fourth).not.toHaveAttribute('aria-expanded');
    expect(within(fourth).queryByTestId('chevron')).not.toBeInTheDocument();
  });

  it('current single group should be active', async () => {
    await render({
      groups: [
        { order: ['first'], type: 'info' },
        { name: 'form', order: ['second', 'third'], markWhenCompleted: true },
        { order: ['fourth'] },
      ],
    });

    expect(screen.getByRole('button', { name: 'first' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'form' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'fourth' })).not.toHaveAttribute('aria-current');
  });

  it('current page should be active and the group should be open by default', async () => {
    await render({
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], type: 'info' },
        { order: ['fourth'] },
      ],
    });

    expect(screen.getByRole('button', { name: 'form' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'first' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'second' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'third' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'fourth' })).not.toHaveAttribute('aria-current');
  });

  it('hidden page should not be shown', async () => {
    await render({
      hiddenPages: ['second'],
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], type: 'info' },
        { order: ['fourth'] },
      ],
    });

    expect(screen.getByRole('button', { name: 'form' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'first' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'second' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'third' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'fourth' })).toBeInTheDocument();
  });

  it('hidden single group should not be shown', async () => {
    await render({
      hiddenPages: ['third'],
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], type: 'info' },
        { order: ['fourth'] },
      ],
    });

    expect(screen.getByRole('button', { name: 'form' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'first' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'second' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'third' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'fourth' })).toBeInTheDocument();
  });

  it('group with only hidden pages should not be shown', async () => {
    await render({
      hiddenPages: ['first', 'second'],
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], type: 'info' },
        { order: ['fourth'] },
      ],
    });

    expect(screen.queryByRole('button', { name: 'form' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'first' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'second' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'third' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'fourth' })).toBeInTheDocument();
  });

  it('clicking page should navigate', async () => {
    await render({
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], type: 'info' },
        { order: ['fourth'] },
      ],
    });

    expect(screen.getByRole('button', { name: 'first' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'second' })).not.toHaveAttribute('aria-current');

    await user.click(screen.getByRole('button', { name: 'second' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'first' })).not.toHaveAttribute('aria-current'));
    expect(screen.getByRole('button', { name: 'second' })).toHaveAttribute('aria-current', 'page');
  });

  it('navigating to page inside different group should close current group', async () => {
    await render({
      groups: [
        { name: 'part1', order: ['first', 'second'], markWhenCompleted: true },
        { name: 'part2', order: ['third', 'fourth'], markWhenCompleted: true },
      ],
    });

    expect(screen.getByRole('button', { name: 'part1' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'first' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'second' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'part2' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('button', { name: 'third' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'fourth' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'part2' }));
    await user.click(screen.getByRole('button', { name: 'third' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'part1' })).not.toHaveAttribute('aria-current'));
    expect(screen.queryByRole('button', { name: 'first' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'second' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'part2' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'third' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'fourth' })).not.toHaveAttribute('aria-current');
  });

  it('navigating to a single page should close current group', async () => {
    await render({
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], type: 'info' },
      ],
    });

    expect(screen.getByRole('button', { name: 'form' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'first' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'second' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'third' })).not.toHaveAttribute('aria-current');

    await user.click(screen.getByRole('button', { name: 'third' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'form' })).not.toHaveAttribute('aria-current'));
    expect(screen.queryByRole('button', { name: 'first' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'second' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'third' })).toHaveAttribute('aria-current', 'page');
  });

  it('when manually opening a group it should not close when navigating', async () => {
    await render({
      initialPage: 'third',
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], type: 'info' },
        { order: ['fourth'] },
      ],
    });

    expect(screen.getByRole('button', { name: 'third' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'form' })).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: 'form' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'form' })).toHaveAttribute('aria-expanded', 'true'));

    await user.click(screen.getByRole('button', { name: 'fourth' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'fourth' })).toHaveAttribute('aria-current', 'page'));
    expect(screen.getByRole('button', { name: 'form' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('should show page as completed (if not active)', async () => {
    jest.spyOn(UseNavigatePage, 'useVisitedPages').mockReturnValue([['first', 'second'], jest.fn()]);

    await render({
      initialPage: 'second',
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], type: 'info' },
      ],
    });

    expect(within(screen.getByRole('button', { name: /first/ })).getByTestId('state-complete')).toBeInTheDocument();
    expect(
      within(screen.getByRole('button', { name: /second/ })).queryByTestId('state-complete'),
    ).not.toBeInTheDocument(); // active
    expect(
      within(screen.getByRole('button', { name: /form/ })).queryByTestId('state-complete'),
    ).not.toBeInTheDocument(); // active
  });

  it('should show page as error (if not active)', async () => {
    jest.spyOn(UseNavigatePage, 'useVisitedPages').mockReturnValue([['first', 'second'], jest.fn()]);

    await render({
      pagesWithError: ['first', 'second'],
      initialPage: 'second',
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], type: 'info' },
      ],
    });

    expect(within(screen.getByRole('button', { name: /first/ })).getByTestId('state-error')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /second/ })).queryByTestId('state-error')).not.toBeInTheDocument(); // active
    expect(within(screen.getByRole('button', { name: /form/ })).queryByTestId('state-error')).not.toBeInTheDocument(); // active
  });

  it('should show group as completed if all pages are completed (if not active)', async () => {
    jest.spyOn(UseNavigatePage, 'useVisitedPages').mockReturnValue([['first', 'second', 'third'], jest.fn()]);

    await render({
      initialPage: 'third',
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], markWhenCompleted: true },
      ],
    });

    expect(within(screen.getByRole('button', { name: /form/ })).getByTestId('state-complete')).toBeInTheDocument();
    expect(
      within(screen.getByRole('button', { name: /third/ })).queryByTestId('state-complete'),
    ).not.toBeInTheDocument(); // active
  });

  it('should not show group as completed if only one page is completed', async () => {
    jest.spyOn(UseNavigatePage, 'useVisitedPages').mockReturnValue([['first'], jest.fn()]);

    await render({
      initialPage: 'third',
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], markWhenCompleted: true },
      ],
    });

    expect(
      within(screen.getByRole('button', { name: 'form' })).queryByTestId('state-complete'),
    ).not.toBeInTheDocument();
  });

  it('should show group as error if one page has error (if not active)', async () => {
    jest.spyOn(UseNavigatePage, 'useVisitedPages').mockReturnValue([['first', 'second'], jest.fn()]);

    await render({
      pagesWithError: ['first', 'third'],
      initialPage: 'third',
      groups: [
        { name: 'form', order: ['first', 'second'], markWhenCompleted: true },
        { order: ['third'], type: 'info' },
      ],
    });

    expect(within(screen.getByRole('button', { name: /form/ })).getByTestId('state-error')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /third/ })).queryByTestId('state-error')).not.toBeInTheDocument(); // active
  });

  it('should show tasknavigation', async () => {
    await render({
      order: ['first', 'second', 'third'],
      taskNavigation: [{ taskId: 'Task_1' }, { type: 'receipt' }],
    });

    expect(screen.getByRole('button', { name: /Utfylling/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Utfylling/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /Kvittering/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kvittering/ })).not.toHaveAttribute('aria-current');
  });

  it('should show navigation groups for current task', async () => {
    await render({
      groups: [
        { name: 'part1', order: ['first', 'second'], markWhenCompleted: true },
        { name: 'part2', order: ['third', 'fourth'], markWhenCompleted: true },
      ],
      taskNavigation: [{ taskId: 'Task_1' }, { type: 'receipt' }],
    });

    expect(screen.getByRole('button', { name: /part1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /part1/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /part2/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Utfylling/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kvittering/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kvittering/ })).not.toHaveAttribute('aria-current');
  });

  it('should override task groups', async () => {
    await render({
      groups: [
        { name: 'part1', order: ['first', 'second'], markWhenCompleted: true },
        { name: 'part2', order: ['third', 'fourth'], markWhenCompleted: true },
      ],
      taskNavigation: [{ taskId: 'Task_1' }, { type: 'receipt' }],
      overrideTaskNavigation: [{ taskId: 'Task_1' }, { type: 'receipt', name: 'Betalings-kvittering' }],
    });

    expect(screen.getByRole('button', { name: /part1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /part1/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /part2/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Utfylling/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kvittering/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Betalings-kvittering/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Betalings-kvittering/ })).not.toHaveAttribute('aria-current');
  });
});
