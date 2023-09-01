import React from 'react';
import { renderHookWithMockStore, renderWithMockStore } from '../testing/mocks';
import { DesignView } from './DesignView';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { externalLayoutsMock, layout1NameMock, layout2NameMock } from '../testing/layoutMock';
import { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ComponentType } from 'app-shared/types/ComponentType';
import { FormContext } from './FormContext';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

const mockHandleEdit = jest.fn();

describe('DesignView', () => {
  it('Renders with empty container text when there are no components or containers', async () => {
    const emptyLayoutsResponse: FormLayoutsResponse = {
      [layout1NameMock]: { $schema: '', data: { layout: [] } },
      [layout2NameMock]: { $schema: '', data: { layout: [] } },
    };
    const queries: Partial<ServicesContextProps> = {
      getFormLayouts: () => Promise.resolve(emptyLayoutsResponse)
    };
    await render(queries);
    expect(screen.getByText(textMock('ux_editor.container_empty'))).toBeInTheDocument();
  });

  it('Renders component without layout', async () => {
    const queries: Partial<ServicesContextProps> = {
      getFormLayouts: () => Promise.resolve({})
    };
    await render(queries);
    expect(screen.getByText(layout1NameMock)).toBeInTheDocument();
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
          ]
        }
      }
    };
    const queries: Partial<ServicesContextProps> = {
      getFormLayouts: () => Promise.resolve(formLayoutsResponse)
    };
    await render(queries);
    expect(screen.queryByText((content) => content.startsWith(`Gruppe - $`))).not.toBeInTheDocument();
  });
});

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  const { result } = renderHookWithMockStore({}, queries)(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult;
  await waitFor(() => result.current.isSuccess);
  return renderWithMockStore({}, queries)(
    <DndProvider backend={HTML5Backend}>
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
        <DesignView/>
      </FormContext.Provider>
    </DndProvider>
  );
};

