import type { ReactNode } from 'react';
import React from 'react';
import { screen } from '@testing-library/react';
import type { PageAccordionProps } from './PageAccordion';
import { PageAccordion } from './PageAccordion';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../testing/mocks';
import { groupsPagesModelMock, layout1NameMock, pagesModelMock } from '../../../testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PagesModel, PagesModelWithPageGroups } from 'app-shared/types/api/dto/PagesModel';
import type { useAppContext } from '@altinn/ux-editor/hooks';
import { ItemType } from '@altinn/ux-editor/components/Properties/ItemType';

const mockPageName1: string = layout1NameMock;
const mockSelectedLayoutSet = layoutSet1NameMock;

jest.mock('../../../hooks/mutations/useDeletePageMutation', () => ({
  __esModule: true,
  ...jest.requireActual('../../../hooks/mutations/useDeletePageMutation'),
}));

const mockChildren: ReactNode = (
  <div>
    <button>Test</button>
  </div>
);
const mockOnClick = jest.fn();

const defaultProps: PageAccordionProps = {
  pageId: mockPageName1,
  children: mockChildren,
  isOpen: false,
  onClick: mockOnClick,
};

describe('PageAccordion', () => {
  afterEach(jest.clearAllMocks);

  it('Calls "onClick" when the accordion is clicked', async () => {
    const user = userEvent.setup();
    await render();

    const accordionButton = screen.getByRole('button', { name: mockPageName1 });
    await user.click(accordionButton);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('Calls deleteLayout with pageName when delete button is clicked and deletion is confirmed', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));
    await render();

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: mockPageName1 }),
    });
    await user.click(deleteButton);

    expect(queriesMock.deletePage).toHaveBeenCalledTimes(1);
    expect(queriesMock.deletePage).toHaveBeenCalledWith(
      org,
      app,
      mockSelectedLayoutSet,
      mockPageName1,
    );
  });

  it('calls page group mutation when deleting a page in a group', async () => {
    const user = userEvent.setup();
    await render({ props: { groupIndex: 0 }, pagesModel: groupsPagesModelMock });
    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: mockPageName1 }),
    });
    await user.click(deleteButton);
    const expectedPagesModel: PagesModelWithPageGroups = {
      ...groupsPagesModelMock,
    };
    expectedPagesModel.groups[0].order.splice(0, 1);
    expectedPagesModel.groups[0].name = undefined;
    expect(queriesMock.changePageGroups).toHaveBeenCalledTimes(1);
    expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
      org,
      app,
      mockSelectedLayoutSet,
      expectedPagesModel,
    );
  });

  it('should set selectedItem to undefined when deleting the selected page', async () => {
    const user = userEvent.setup();
    const setSelectedItem = jest.fn();

    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));

    await render({
      appContextProps: {
        selectedItem: { id: mockPageName1, type: ItemType.Page },
        setSelectedItem,
      },
    });

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: mockPageName1 }),
    });
    await user.click(deleteButton);
    expect(setSelectedItem).toHaveBeenCalledWith(null);
  });

  it('Disables delete button when isPending is true', async () => {
    const user = userEvent.setup();
    const useDeletePageMutationSpy = jest.spyOn(
      require('../../../hooks/mutations/useDeletePageMutation'),
      'useDeletePageMutation',
    );
    useDeletePageMutationSpy.mockImplementation(() => ({
      mutate: queriesMock.deleteFormLayout,
      isPending: true,
    }));

    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));

    await render();
    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: mockPageName1 }),
    });

    expect(deleteButton).toBeDisabled();
    await user.click(deleteButton);
    expect(queriesMock.deleteFormLayout).not.toHaveBeenCalled();
  });

  it('Does not call deleteLayout when delete button is clicked, but deletion is not confirmed', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => false));
    await render();

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: mockPageName1 }),
    });
    await user.click(deleteButton);
    expect(queriesMock.deleteFormLayout).not.toHaveBeenCalled();
  });

  it('render warning class to header when isInvalid is true', async () => {
    await render({ props: { isInvalid: true } });
    const headerContainer = screen.getByTestId(`accordion-header-${mockPageName1}`);
    expect(headerContainer).toHaveClass('accordionHeaderWarning');
    expect(headerContainer).not.toHaveClass('accordionHeader');
  });

  it('render warning class to header when hasDuplicatedIds is true', async () => {
    await render({ props: { hasDuplicatedIds: true } });
    const headerContainer = screen.getByTestId(`accordion-header-${mockPageName1}`);
    expect(headerContainer).toHaveClass('accordionHeaderWarning');
    expect(headerContainer).not.toHaveClass('accordionHeader');
  });

  it('Applies normal header class when neither isInvalid nor hasDuplicatedIds is true', async () => {
    await render({ props: { isInvalid: false, hasDuplicatedIds: false } });
    const headerContainer = screen.getByTestId(`accordion-header-${mockPageName1}`);
    expect(headerContainer).toHaveClass('accordionHeader');
    expect(headerContainer).not.toHaveClass('accordionHeaderWarning');
  });
});

type renderParams = {
  props?: Partial<PageAccordionProps>;
  pagesModel?: PagesModel;
  appContextProps?: Partial<ReturnType<typeof useAppContext>>;
};

const render = async (opts: renderParams = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.invalidateQueries = jest.fn();
  queryClient.setQueryData(
    [QueryKey.Pages, org, app, mockSelectedLayoutSet],
    opts.pagesModel ?? pagesModelMock,
  );

  return renderWithProviders(<PageAccordion {...defaultProps} {...opts.props} />, {
    queryClient,
    appContextProps: opts.appContextProps,
  });
};
