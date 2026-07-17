import { screen } from '@testing-library/react';
import { AddItem, type AddItemProps, InlineItemAdder, type InlineItemAdderProps } from './AddItem';
import { renderWithProviders } from '../../../testing/mocks';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { IInternalLayout } from '../../../types/global';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, layoutSet as layoutSetId, org } from '@studio/testing/testids';

describe('AddItem', () => {
  it('should render AddItem', () => {
    renderAddItem();
    expect(getAddComponentButton()).toBeInTheDocument();
  });

  it('clicking add component should show default components', async () => {
    const user = userEvent.setup();
    renderAddItem();
    await user.click(getAddComponentButton());
    expect(getSelectComponentHeader()).toBeInTheDocument();
  });

  it('limits the components to the allowed set for the configuration mode and hides the show all button when everything fits', async () => {
    const user = userEvent.setup();
    renderAddItem({}, seedLayoutSet({ taskType: 'payment' }));
    await user.click(getAddComponentButton());

    expect(
      screen.getByRole('button', { name: textMock('ux_editor.component_title.Payment') }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('ux_editor.component_title.Input') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('ux_editor.add_item.show_all') }),
    ).not.toBeInTheDocument();
  });

  it('shows the show all button when more components are available than the quick-add list', async () => {
    const user = userEvent.setup();
    renderAddItem({}, seedLayoutSet({ type: 'subform' }));
    await user.click(getAddComponentButton());
    expect(
      screen.getByRole('button', { name: textMock('ux_editor.add_item.show_all') }),
    ).toBeInTheDocument();
  });
});

const seedLayoutSet = (overrides: { taskType?: string; type?: string }): QueryClient => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.LayoutSetsExtended, org, app],
    [{ id: layoutSetId, dataType: '', type: '', ...overrides }],
  );
  return queryClient;
};

describe('InlineItemAdder', () => {
  it('should render InlineItemAdder', () => {
    renderInlineItemAdder();
    expect(getSelectComponentHeader()).toBeInTheDocument();
  });
});

const createDefaultLayout = (): IInternalLayout => ({
  order: {
    [BASE_CONTAINER_ID]: [],
  },
  containers: {
    [BASE_CONTAINER_ID]: {
      type: null,
      itemType: 'CONTAINER',
      id: BASE_CONTAINER_ID,
    } as const,
  },
  components: {},
  customDataProperties: {},
  customRootProperties: {},
});

const createDefaultAddItemProps = (): AddItemProps => ({
  containerId: BASE_CONTAINER_ID,
  layout: createDefaultLayout(),
});

const createDefaultInlineItemAdderProps = (): InlineItemAdderProps => ({
  containerId: BASE_CONTAINER_ID,
  layout: createDefaultLayout(),
  toggleIsOpen: jest.fn(),
  saveAtIndexPosition: 0,
});

const renderAddItem = (props: Partial<AddItemProps> = {}, queryClient?: QueryClient) => {
  return renderWithProviders(<AddItem {...createDefaultAddItemProps()} {...props} />, {
    queryClient,
  });
};

const renderInlineItemAdder = (props: Partial<InlineItemAdderProps> = {}) => {
  return renderWithProviders(
    <InlineItemAdder {...createDefaultInlineItemAdderProps()} {...props} />,
  );
};

function getAddComponentButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: textMock('ux_editor.add_item.add_component') });
}

function getSelectComponentHeader(): HTMLHeadingElement {
  return screen.getByRole('heading', {
    level: 4,
    name: textMock('ux_editor.add_item.select_component_header'),
  });
}
