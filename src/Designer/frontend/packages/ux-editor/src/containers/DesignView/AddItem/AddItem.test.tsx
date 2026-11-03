import { describe, expect, it, vi } from 'vitest';
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
import { ComponentType } from '../../../types/ComponentType';
import { useAddComponentHandlerSilent } from './hooks/useAddComponentHandlerSilent';

vi.mock('./hooks/useAddComponentHandlerSilent', () => ({
  useAddComponentHandlerSilent: vi.fn(() => ({ addItem: vi.fn() })),
}));

describe('AddItem', () => {
  it('should render AddItem', () => {
    renderAddItem();
    expect(getAddComponentButton()).toBeInTheDocument();
  });

  it('clicking add component should show default components', async () => {
    const user = userEvent.setup();
    renderAddItem();
    await user.click(getAddComponentButton());
    expect(getComponentsHeader()).toBeInTheDocument();
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

  it('adds the component at the end of the container by default', async () => {
    const user = userEvent.setup();
    const addItem = mockAddItem();
    const layout = createLayoutWithComponents();
    renderAddItem({ layout }, seedFormLayouts(layout));
    await user.click(getAddComponentButton());
    await user.click(getInputComponentButton());
    expect(addItem).toHaveBeenCalledWith(
      ComponentType.Input,
      BASE_CONTAINER_ID,
      2,
      expect.any(String),
    );
  });

  it('adds the component at the given position', async () => {
    const user = userEvent.setup();
    const addItem = mockAddItem();
    const layout = createLayoutWithComponents();
    renderAddItem({ layout, saveAtIndexPosition: 0 }, seedFormLayouts(layout));
    await user.click(getAddComponentButton());
    await user.click(getInputComponentButton());
    expect(addItem).toHaveBeenCalledWith(
      ComponentType.Input,
      BASE_CONTAINER_ID,
      0,
      expect.any(String),
    );
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
    expect(getComponentsHeader()).toBeInTheDocument();
  });
});

const createDefaultLayout = (): IInternalLayout => ({
  order: {
    [BASE_CONTAINER_ID]: [],
  },
  containers: {
    [BASE_CONTAINER_ID]: {
      type: null,
      id: BASE_CONTAINER_ID,
    } as const,
  },
  components: {},
  customDataProperties: {},
  customRootProperties: {},
});

const seedFormLayouts = (layout: IInternalLayout): QueryClient => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetId], { page: layout });
  return queryClient;
};

const createLayoutWithComponents = (): IInternalLayout => ({
  ...createDefaultLayout(),
  order: { [BASE_CONTAINER_ID]: ['paragraph', 'navigationButtons'] },
  components: {
    paragraph: { id: 'paragraph', type: ComponentType.Paragraph },
    navigationButtons: {
      id: 'navigationButtons',
      type: ComponentType.NavigationButtons,
    },
  },
});

const mockAddItem = (): ReturnType<typeof vi.fn> => {
  const addItem = vi.fn();
  vi.mocked(useAddComponentHandlerSilent).mockReturnValue({ addItem });
  return addItem;
};

const createDefaultAddItemProps = (): AddItemProps => ({
  containerId: BASE_CONTAINER_ID,
  layout: createDefaultLayout(),
});

const createDefaultInlineItemAdderProps = (): InlineItemAdderProps => ({
  containerId: BASE_CONTAINER_ID,
  layout: createDefaultLayout(),
  toggleIsOpen: vi.fn(),
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

function getComponentsHeader(): HTMLHeadingElement {
  return screen.getByRole('heading', {
    level: 4,
    name: textMock('ux_editor.add_item.components_header'),
  });
}

function getInputComponentButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: textMock('ux_editor.component_title.Input') });
}
