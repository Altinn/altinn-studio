import React from 'react';
import { screen, within } from '@testing-library/react';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { renderWithProviders } from '../../testing/mocks';
import { PageGroupAccordion, type PageGroupAccordionProps } from './PageGroupAccordion';
import { layoutSet1NameMock } from '../../testing/layoutSetsMock';
import type { IFormLayouts } from '../../types/global';
import { layout1NameMock, layoutMock } from '../../testing/layoutMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org, pageGroupAccordionHeader } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { AppContextProps } from '../../AppContext';

const pagesMock: PagesModel = {
  pages: null,
  groups: [
    {
      name: 'Group 1',
      order: [{ id: 'Side 1' }],
    },
    {
      name: 'Group 2',
      order: [{ id: 'Side 2' }],
    },
  ],
};

const pagesMockWithUnnamedGroup: PagesModel = {
  pages: null,
  groups: [
    {
      name: '',
      order: [{ id: 'Side 1' }],
    },
    {
      name: 'Group 2',
      order: [{ id: 'Side 2' }],
    },
  ],
};

const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('PageGroupAccordion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should disable move-up for first group, and move-down for last group', async () => {
    await renderPageGroupAccordion({});
    expect(moveGroupUpButton(0)).toBeDisabled();
    expect(moveGroupDownButton(0)).toBeEnabled();
    expect(moveGroupUpButton(1)).toBeEnabled();
    expect(moveGroupDownButton(1)).toBeDisabled();
  });

  it('should correctly call mutation on changePageGroupOrder when moving a group up', async () => {
    const user = userEvent.setup();
    const changePageGroups = jest.fn();
    await renderPageGroupAccordion({ queries: { changePageGroups } });
    await user.click(moveGroupUpButton(1));
    expect(changePageGroups).toHaveBeenCalledTimes(1);
    const expectedPagesMock = { ...pagesMock, groups: pagesMock.groups.toReversed() };
    expect(changePageGroups).toHaveBeenCalledWith(org, app, layoutSetName, expectedPagesMock);
  });

  it('should correctly call mutation on changePageGroupOrder when moving a group up', async () => {
    const user = userEvent.setup();
    const changePageGroups = jest.fn();
    await renderPageGroupAccordion({ queries: { changePageGroups } });
    await user.click(moveGroupDownButton(0));
    expect(changePageGroups).toHaveBeenCalledTimes(1);
    const expectedPagesMock = { ...pagesMock, groups: pagesMock.groups.toReversed() };
    expect(changePageGroups).toHaveBeenCalledWith(org, app, layoutSetName, expectedPagesMock);
  });


  it('should display fallback name if group name is empty', async () => {
    await renderPageGroupAccordion({ props: { pages: pagesMockWithUnnamedGroup } });
    const groupHeader = groupAccordionHeader(0);
    expect(groupHeader).toBeInTheDocument();
    const heading = within(groupHeader).getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent(`${textMock('general.layout_set')} 1`);
  });

  it('should mark group as selected when selectedGroupName matches fallback name', async () => {
    const fallbackName = `${textMock('general.layout_set')} 1`;
    await renderPageGroupAccordion({
      props: { pages: pagesMockWithUnnamedGroup },
      appContextProps: { selectedItem: { type: 'group', id: fallbackName } },
    });
    const groupHeader = groupAccordionHeader(0);
    expect(groupHeader).toHaveClass('selected');
    const heading = within(groupHeader).getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent(fallbackName);

  it('should display group name when group has multiple pages', async () => {
    const multiPageGroupMock: PagesModel = {
      pages: null,
      groups: [
        {
          name: 'Group 1',
          order: [{ id: 'Side 1' }, { id: 'Side 2' }],
        },
      ],
    };
    await renderPageGroupAccordion({ props: { pages: multiPageGroupMock } });
    const groupHeader = groupAccordionHeader(0);
    const heading = within(groupHeader).getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Group 1');
  });

  it('should display page ID as displayName when group has one page', async () => {
    const singlePageGroupWithEmptyNameMock: PagesModel = {
      pages: null,
      groups: [
        {
          name: '',
          order: [{ id: 'Side 1' }],
        },
      ],
    };
    await renderPageGroupAccordion({ props: { pages: singlePageGroupWithEmptyNameMock } });
    const groupHeader = groupAccordionHeader(0);
    const heading = within(groupHeader).getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Side 1');
  });
});

const groupAccordionHeader = (nth: number) => screen.getByTestId(pageGroupAccordionHeader(nth));
const moveGroupUpButton = (nth: number) =>
  within(groupAccordionHeader(nth)).getByRole('button', {
    name: textMock('ux_editor.page_menu_up'),
  });
const moveGroupDownButton = (nth: number) =>
  within(groupAccordionHeader(nth)).getByRole('button', {
    name: textMock('ux_editor.page_menu_down'),
  });

type renderParameters = {
  props?: Partial<PageGroupAccordionProps>;
  queries?: Partial<ServicesContextProps>;
  appContextProps?: Partial<AppContextProps>;
};

const renderPageGroupAccordion = async ({ props, queries, appContextProps }: renderParameters) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.Pages, org, app, layoutSetName], pagesMock);
  renderWithProviders(
    <PageGroupAccordion
      selectedFormLayoutName={layoutSet1NameMock}
      pages={pagesMock}
      layouts={layouts}
      onAccordionClick={jest.fn()}
      onAddPage={jest.fn()}
      isAddPagePending={false}
      {...props}
    ></PageGroupAccordion>,
    { queryClient, queries, appContextProps },
  );
};
