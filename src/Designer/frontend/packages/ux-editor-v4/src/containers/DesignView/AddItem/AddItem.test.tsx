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
import { ComponentType } from 'app-shared/types/ComponentType';
import { app, layoutSet as layoutSetId, org } from '@studio/testing/testids';
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
    expect(getSelectComponentHeader()).toBeInTheDocument();
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
});

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

const seedFormLayouts = (layout: IInternalLayout): QueryClient => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetId], { page: layout });
  return queryClient;
};

const createLayoutWithComponents = (): IInternalLayout => ({
  ...createDefaultLayout(),
  order: { [BASE_CONTAINER_ID]: ['paragraph', 'navigationButtons'] },
  components: {
    paragraph: { id: 'paragraph', type: ComponentType.Paragraph, itemType: 'COMPONENT' },
    navigationButtons: {
      id: 'navigationButtons',
      type: ComponentType.NavigationButtons,
      itemType: 'COMPONENT',
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

function getSelectComponentHeader(): HTMLHeadingElement {
  return screen.getByRole('heading', {
    level: 4,
    name: textMock('ux_editor.add_item.select_component_header'),
  });
}

function getInputComponentButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: textMock('ux_editor.component_title.Input') });
}
