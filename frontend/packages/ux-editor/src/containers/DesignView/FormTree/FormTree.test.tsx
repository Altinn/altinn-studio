import React from 'react';
import { act, screen } from '@testing-library/react';
import { FormTree } from './FormTree';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { BASE_CONTAINER_ID, DEFAULT_LANGUAGE } from 'app-shared/constants';
import { renderWithMockStore } from '../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ITextResources } from 'app-shared/types/global';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';
import { FormContext } from '../../FormContext';
import type { IInternalLayout } from '../../../types/global';
import type { FormComponent } from '../../../types/FormComponent';
import type { FormContainer } from '../../../types/FormContainer';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const textResources: ITextResources = {
  [DEFAULT_LANGUAGE]: [],
};
const onAdd = jest.fn();
const onMove = jest.fn();

const rootComponent: FormComponent = {
  id: 'rootComponent',
  itemType: 'COMPONENT',
  type: ComponentType.Paragraph,
};
const rootContainerWithChildren: FormContainer = {
  id: 'rootContainer1',
  itemType: 'CONTAINER',
};
const emptyRootContainer: FormContainer = {
  id: 'rootContainer2',
  itemType: 'CONTAINER',
};
const subComponent: FormComponent = {
  id: 'subComponent',
  itemType: 'COMPONENT',
  type: ComponentType.Input,
};
const subContainer: FormContainer = {
  id: 'subContainer',
  itemType: 'CONTAINER',
};
const subSubComponent: FormComponent = {
  id: 'subSubComponent',
  itemType: 'COMPONENT',
  type: ComponentType.TextArea,
};
const layoutMock: IInternalLayout = {
  components: {
    [rootComponent.id]: rootComponent,
    [subComponent.id]: subComponent,
    [subSubComponent.id]: subSubComponent,
  },
  containers: {
    [rootContainerWithChildren.id]: rootContainerWithChildren,
    [emptyRootContainer.id]: emptyRootContainer,
    [subContainer.id]: subContainer,
  },
  order: {
    [BASE_CONTAINER_ID]: [rootComponent.id, rootContainerWithChildren.id, emptyRootContainer.id],
    [rootContainerWithChildren.id]: [subComponent.id, subContainer.id],
    [subContainer.id]: [subSubComponent.id],
  },
  customDataProperties: {},
  customRootProperties: {},
};

const rootComponentName = textMock(`ux_editor.component_title.${rootComponent.type}`);
const subComponentName = textMock(`ux_editor.component_title.${subComponent.type}`);
const subSubComponentName = textMock(`ux_editor.component_title.${subSubComponent.type}`);
const rootContainerName = textMock('ux_editor.component_group_header', {
  id: rootContainerWithChildren.id,
});
const emptyRootContainerName = textMock('ux_editor.component_group_header', {
  id: emptyRootContainer.id,
});
const subContainerName = textMock('ux_editor.component_group_header', { id: subContainer.id });
const handleEdit = jest.fn();
const formContext: FormContext = {
  debounceSave: jest.fn(),
  form: null,
  formId: '',
  handleDiscard: jest.fn(),
  handleEdit,
  handleSave: jest.fn(),
  handleUpdate: jest.fn(),
};

describe('FormTree', () => {
  afterEach(jest.clearAllMocks);

  it('Renders top level items only by default', () => {
    render();
    expect(screen.getByRole('treeitem', { name: rootComponentName })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: rootContainerName })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: emptyRootContainerName })).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: subComponentName })).not.toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: subContainerName })).not.toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: subSubComponentName })).not.toBeInTheDocument();
  });

  it('Makes the child components appear when the container is expanded', async () => {
    render();
    const containerElement = screen.getByRole('treeitem', { name: rootContainerName });
    await act(() => user.click(containerElement));
    expect(screen.getByRole('treeitem', { name: subComponentName })).toBeInTheDocument();
    const subContainerElement = screen.getByRole('treeitem', { name: subContainerName });
    expect(subContainerElement).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: subSubComponentName })).not.toBeInTheDocument();
    await act(() => user.click(subContainerElement));
    expect(screen.getByRole('treeitem', { name: subSubComponentName })).toBeInTheDocument();
  });

  it('Calls handleEdit with the correct item when an item is clicked', async () => {
    render();
    const component = screen.getByRole('treeitem', { name: rootComponentName });
    await act(() => user.click(component));
    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(rootComponent);
  });

  it('Displays a text telling that the container is empty when an empty container is expanded', async () => {
    render();
    const emptyContainer = screen.getByRole('treeitem', { name: emptyRootContainerName });
    await act(() => user.click(emptyContainer));
    expect(screen.getByText(textMock('ux_editor.container_empty'))).toBeInTheDocument();
  });

  it('Adheres to tree view keyboard navigation rules', async () => {
    render();
    await act(() => user.tab());
    expect(screen.getByRole('treeitem', { name: rootComponentName })).toHaveFocus();
    await act(() => user.keyboard('{arrowdown}'));
    expect(screen.getByRole('treeitem', { name: rootContainerName })).toHaveFocus();
    await act(() => user.keyboard('{arrowright}'));
    await act(() => user.keyboard('{arrowdown}'));
    expect(screen.getByRole('treeitem', { name: subComponentName })).toHaveFocus();
  });

  it('should render unknown component reference item the component reference is unknown', () => {
    const mockedLayout: IInternalLayout = {
      components: {
        componentID: rootComponent,
      },
      containers: {
        containerID: rootContainerWithChildren,
      },
      order: {
        [BASE_CONTAINER_ID]: [rootComponent.id],
      },
      customDataProperties: {},
      customRootProperties: {},
    };
    render(mockedLayout);

    expect(screen.getByText('rootComponent'));
    expect(screen.getByText(textMock('ux_editor.unknown_group_reference_help_text_title')));
  });
});

const render = (layout: IInternalLayout = layoutMock) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResources);
  return renderWithMockStore(
    {},
    {},
    queryClient,
  )(
    <FormContext.Provider value={formContext}>
      <DragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={BASE_CONTAINER_ID}>
        <FormTree layout={layout} />
      </DragAndDropTree.Provider>
    </FormContext.Provider>,
  );
};
