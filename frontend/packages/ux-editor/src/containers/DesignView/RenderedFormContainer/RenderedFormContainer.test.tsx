import React from 'react';
import { renderHookWithMockStore, renderWithMockStore } from '../../../testing/mocks';
import { RenderedFormContainer, RenderedFormContainerProps } from './RenderedFormContainer';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import {
  baseContainerIdMock,
  component1Mock,
  component2Mock,
  externalLayoutsMock,
  layout1NameMock,
  layout2NameMock,
} from '../../../testing/layoutMock';
import { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { useFormLayoutsQuery } from '../../../hooks/queries/useFormLayoutsQuery';
import { ComponentType } from 'app-shared/types/ComponentType';
import { FormContext } from '../../FormContext';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import {
  IFormLayoutOrder,
  IFormDesignerContainers,
  IFormDesignerComponents,
} from '../../../types/global';

const mockOrg = 'org';
const mockApp = 'app';
const mockSelectedLayoutSet = 'test-layout-set';
const mockContainerId = baseContainerIdMock;
const mockFormLayoutOrder: IFormLayoutOrder = {
  mockContainerId: [component1Mock.type, component2Mock.type],
};
const mockFormDesignerContainers: IFormDesignerContainers = {
  mockContainerId: { id: 'id', itemType: 'CONTAINER' },
};
const mockFormDesignerComponents: IFormDesignerComponents = {
  component1Mock,
  component2Mock,
};

const mockHandleEdit = jest.fn();

const defaultProps: RenderedFormContainerProps = {
  containerId: mockContainerId,
  formLayoutOrder: mockFormLayoutOrder,
  formDesignerContainers: mockFormDesignerContainers,
  formDesignerComponents: mockFormDesignerComponents,
};

describe('RenderedFormContainer', () => {
  afterEach(jest.clearAllMocks);

  it('Renders with empty container text when there are no components or containers', async () => {
    const emptyLayoutsResponse: FormLayoutsResponse = {
      [layout1NameMock]: { $schema: '', data: { layout: [] } },
      [layout2NameMock]: { $schema: '', data: { layout: [] } },
    };
    const queries: Partial<ServicesContextProps> = {
      getFormLayouts: () => Promise.resolve(emptyLayoutsResponse),
    };
    await render(queries);
    expect(screen.getByText(textMock('ux_editor.container_empty'))).toBeInTheDocument();
  });

  it('Does not render container if no container id', async () => {
    const formLayoutsResponse: FormLayoutsResponse = {
      ...externalLayoutsMock,
      Side1: {
        ...externalLayoutsMock.Side1,
        data: {
          ...externalLayoutsMock.Side1.data,
          layout: [
            {
              id: undefined,
              type: ComponentType.Group,
              children: [],
            },
          ],
        },
      },
    };
    const queries: Partial<ServicesContextProps> = {
      getFormLayouts: () => Promise.resolve(formLayoutsResponse),
    };
    await render(queries);
    expect(
      screen.queryByText((content) => content.startsWith(`Gruppe - $`)),
    ).not.toBeInTheDocument();
  });
});

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  const { result } = renderHookWithMockStore(
    {},
    queries,
  )(() => useFormLayoutsQuery(mockOrg, mockApp, mockSelectedLayoutSet)).renderHookResult;
  await waitFor(() => result.current.isSuccess);
  return renderWithMockStore(
    {},
    queries,
  )(
    <DragAndDrop.Provider rootId={BASE_CONTAINER_ID} onMove={jest.fn()} onAdd={jest.fn()}>
      <FormContext.Provider
        value={{
          form: null,
          formId: 'test',
          handleSave: jest.fn(),
          debounceSave: jest.fn(),
          handleDiscard: jest.fn(),
          handleUpdate: jest.fn(),
          handleEdit: mockHandleEdit,
        }}
      >
        <RenderedFormContainer {...defaultProps} />
      </FormContext.Provider>
    </DragAndDrop.Provider>,
  );
};
