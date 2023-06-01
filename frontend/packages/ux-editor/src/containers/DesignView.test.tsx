import React from 'react';
import { renderHookWithMockStore, renderWithMockStore } from '../testing/mocks';
import { DesignView } from './DesignView';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { layout1NameMock, layout2NameMock } from '../testing/layoutMock';
import { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

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
});

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  const { result } = renderHookWithMockStore({}, queries)(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult;
  await waitFor(() => result.current.isSuccess);
  return renderWithMockStore({}, queries)(
    <DndProvider backend={HTML5Backend}>
      <DesignView/>
    </DndProvider>
  );
};

